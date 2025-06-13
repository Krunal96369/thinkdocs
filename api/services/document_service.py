"""
Production-ready document service using database persistence.
Replaces mock MOCK_DOCUMENTS with proper database operations.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload

from api.models.documents import Document, DocumentChunk, ProcessingJob
from api.database import get_db
import logging

logger = logging.getLogger(__name__)


class DocumentService:
    """Production document service with database persistence."""

    def __init__(self, db_session: AsyncSession):
        self.db = db_session

    async def create_document(
        self,
        filename: str,
        title: str,
        content_type: str,
        size: int,
        user_id: str,
        file_path: Optional[str] = None
    ) -> Document:
        """Create a new document record."""
        document = Document(
            filename=filename,
            title=title,
            content_type=content_type,
            size=size,
            user_id=user_id,
            file_path=file_path,
            status="processing"
        )

        self.db.add(document)
        await self.db.commit()
        await self.db.refresh(document)

        logger.info(f"Created document {document.id} for user {user_id}")
        return document

    async def get_document(self, document_id: str, user_id: str) -> Optional[Document]:
        """Get document by ID and user."""
        result = await self.db.execute(
            select(Document)
            .where(Document.id == document_id, Document.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_documents(
        self,
        user_id: str,
        status: Optional[str] = None,
        page: int = 1,
        limit: int = 50
    ) -> tuple[List[Document], int]:
        """Get user's documents with pagination."""
        query = select(Document).where(Document.user_id == user_id)

        if status:
            query = query.where(Document.status == status)

        # Count total
        count_result = await self.db.execute(
            select(Document.id).where(Document.user_id == user_id)
        )
        total = len(count_result.fetchall())

        # Paginate
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit).order_by(Document.upload_date.desc())

        result = await self.db.execute(query)
        documents = result.scalars().all()

        return list(documents), total

    async def update_document_status(
        self,
        document_id: str,
        processing_result: Dict[str, Any]
    ) -> bool:
        """Update document status and statistics after processing."""
        try:
            # Extract data from processing result
            status = processing_result.get("status", "completed")
            stats = processing_result.get("stats", {})
            summary = processing_result.get("summary", "")

            # Prepare update data
            update_data = {
                "status": status,
                "processed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }

            # Add statistics if available
            if stats:
                update_data.update({
                    "page_count": stats.get("page_count"),
                    "word_count": stats.get("word_count"),
                    "text_length": stats.get("text_length"),
                    "extraction_method": stats.get("extraction_method"),
                })

            if summary:
                update_data["summary"] = summary

            # Update document
            result = await self.db.execute(
                update(Document)
                .where(Document.id == document_id)
                .values(**update_data)
            )

            # Add processing tags
            if status == "completed" and stats:
                await self._add_processing_tags(document_id, stats)

            await self.db.commit()

            rows_updated = result.rowcount
            if rows_updated > 0:
                logger.info(f"✅ Updated document {document_id} status to {status}")
                return True
            else:
                logger.warning(f"⚠️ Document {document_id} not found for status update")
                return False

        except Exception as e:
            logger.error(f"❌ Error updating document status: {e}")
            await self.db.rollback()
            return False

    async def _add_processing_tags(self, document_id: str, stats: Dict[str, Any]):
        """Add processing-related tags to document."""
        try:
            # Get current document
            result = await self.db.execute(
                select(Document).where(Document.id == document_id)
            )
            document = result.scalar_one_or_none()

            if not document:
                return

            # Prepare new tags
            new_tags = list(document.tags or [])

            # Add processed tag (skip technical extraction method tags)
            if "processed" not in new_tags:
                new_tags.append("processed")

            # Update tags
            await self.db.execute(
                update(Document)
                .where(Document.id == document_id)
                .values(tags=new_tags)
            )

        except Exception as e:
            logger.error(f"Error adding processing tags: {e}")

    async def delete_document(self, document_id: str, user_id: str) -> bool:
        """Delete document and all related data."""
        try:
            result = await self.db.execute(
                delete(Document)
                .where(Document.id == document_id, Document.user_id == user_id)
            )

            await self.db.commit()

            rows_deleted = result.rowcount
            if rows_deleted > 0:
                logger.info(f"Deleted document {document_id}")
                return True
            else:
                logger.warning(f"Document {document_id} not found for deletion")
                return False

        except Exception as e:
            logger.error(f"Error deleting document: {e}")
            await self.db.rollback()
            return False

    async def search_documents(
        self,
        user_id: str,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 20
    ) -> List[Document]:
        """Search documents by content and metadata."""
        try:
            query_filter = select(Document).where(Document.user_id == user_id)

            # Simple text search in title and filename
            if query:
                search_pattern = f"%{query}%"
                query_filter = query_filter.where(
                    Document.title.ilike(search_pattern) |
                    Document.filename.ilike(search_pattern)
                )

            # Apply status filter if provided
            if filters and "status" in filters:
                query_filter = query_filter.where(Document.status == filters["status"])

            query_filter = query_filter.limit(limit)

            result = await self.db.execute(query_filter)
            documents = result.scalars().all()

            return list(documents)

        except Exception as e:
            logger.error(f"Error searching documents: {e}")
            return []

    async def get_document_content(
        self,
        document_id: str,
        user_id: str,
        page: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """Get document content from chunks."""
        try:
            # Verify document ownership
            document = await self.get_document(document_id, user_id)
            if not document:
                return None

            # Get chunks for the document
            query = select(DocumentChunk).where(DocumentChunk.document_id == document_id)

            # Filter by page if specified
            if page is not None:
                # Handle case where page_number might be NULL and page=1 is requested
                if page == 1:
                    query = query.where(
                        (DocumentChunk.page_number == page) |
                        (DocumentChunk.page_number.is_(None))
                    )
                else:
                    query = query.where(DocumentChunk.page_number == page)

            query = query.order_by(DocumentChunk.chunk_index)

            result = await self.db.execute(query)
            chunks = result.scalars().all()

            # Combine chunk content
            content_parts = []
            chunk_data = []

            for chunk in chunks:
                content_parts.append(chunk.content)
                chunk_data.append({
                    "id": chunk.id,
                    "content": chunk.content,
                    "page_number": chunk.page_number,
                    "chunk_index": chunk.chunk_index
                })

            # Get total pages count
            total_pages_result = await self.db.execute(
                select(DocumentChunk.page_number)
                .where(DocumentChunk.document_id == document_id)
                .distinct()
            )
            total_pages = len(total_pages_result.fetchall())

            return {
                "content": "\n\n".join(content_parts),
                "chunks": chunk_data,
                "total_pages": total_pages or 1
            }

        except Exception as e:
            logger.error(f"Error getting document content: {e}")
            return None

    async def get_document_chunks(
        self,
        document_id: str,
        user_id: str,
        page: Optional[int] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get document chunks with pagination."""
        try:
            # Verify document ownership
            document = await self.get_document(document_id, user_id)
            if not document:
                return []

            # Build query
            query = select(DocumentChunk).where(DocumentChunk.document_id == document_id)

            # Filter by page if specified
            if page is not None:
                # Handle case where page_number might be NULL and page=1 is requested
                if page == 1:
                    query = query.where(
                        (DocumentChunk.page_number == page) |
                        (DocumentChunk.page_number.is_(None))
                    )
                else:
                    query = query.where(DocumentChunk.page_number == page)

            # Pagination
            if limit:
                query = query.limit(limit)

            query = query.order_by(DocumentChunk.chunk_index)

            result = await self.db.execute(query)
            chunks = result.scalars().all()

            # Convert to dict format
            chunk_data = []
            for chunk in chunks:
                chunk_data.append({
                    "id": chunk.id,
                    "content": chunk.content,
                    "page_number": chunk.page_number,
                    "chunk_index": chunk.chunk_index,
                    "embedding": chunk.embedding,
                    "metadata": chunk.chunk_metadata
                })

            return chunk_data

        except Exception as e:
            logger.error(f"Error getting document chunks: {e}")
            return []

    async def create_processing_job(
        self,
        document_id: str,
        celery_task_id: str
    ) -> ProcessingJob:
        """Create a processing job record for tracking."""
        job = ProcessingJob(
            document_id=document_id,
            celery_task_id=celery_task_id,
            status="pending"
        )

        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)

        return job

    async def update_processing_job(
        self,
        celery_task_id: str,
        status: str,
        stats: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None
    ) -> bool:
        """Update processing job status."""
        try:
            update_data = {
                "status": status,
                "updated_at": datetime.utcnow()
            }

            if status == "running" and not error_message:
                update_data["started_at"] = datetime.utcnow()
            elif status in ["completed", "failed"]:
                update_data["completed_at"] = datetime.utcnow()

            if stats:
                update_data["stats"] = stats
            if error_message:
                update_data["error_message"] = error_message

            result = await self.db.execute(
                update(ProcessingJob)
                .where(ProcessingJob.celery_task_id == celery_task_id)
                .values(**update_data)
            )

            await self.db.commit()
            return result.rowcount > 0

        except Exception as e:
            logger.error(f"Error updating processing job: {e}")
            await self.db.rollback()
            return False


# Dependency function for FastAPI
async def get_document_service(db: AsyncSession) -> DocumentService:
    """Get document service with database session."""
    return DocumentService(db)
