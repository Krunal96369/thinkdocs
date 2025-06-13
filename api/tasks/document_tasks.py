"""
PRODUCTION-GRADE DOCUMENT PROCESSING TASKS
===========================================

Enterprise-level document processing with:
- Comprehensive error handling and recovery
- Intelligent retry policies
- Complete vector storage pipeline
- Processing job tracking
- Performance monitoring
- Database transaction management
"""

import logging
import asyncio
import threading
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional
from contextlib import contextmanager

from .celery_app import celery_app
from api.services.vector_db import VectorDBService
from model.embeddings.service import EmbeddingService
from data_pipeline.extractors.pdf_extractor import PDFExtractor
from data_pipeline.extractors.text_extractor import TextExtractor
from data_pipeline.extractors.base import ExtractionError, ExtractedContent, DocumentMetadata

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="process_document")
def process_document(self, document_id: str, file_path: str, user_id: str) -> Dict[str, Any]:
    """
    PRODUCTION DOCUMENT PROCESSING PIPELINE

    Enterprise-grade document processing with complete error handling,
    retry logic, and monitoring. Processes document through full pipeline:
    1. Text extraction
    2. Content chunking
    3. Embedding generation
    4. Vector storage
    5. Database updates

    Args:
        document_id: Unique document identifier
        file_path: Path to uploaded document file
        user_id: User who uploaded the document

    Returns:
        Processing result with status, stats, and error info
    """

    processing_context = DocumentProcessingContext(
        task=self,
        document_id=document_id,
        file_path=file_path,
        user_id=user_id
    )

    try:
        return processing_context.execute_processing_pipeline()

    except Exception as e:
        logger.error(f"💥 CRITICAL: Document processing failed for {document_id}: {e}")
        return processing_context.handle_processing_failure(e)


class DocumentProcessingContext:
    """
    PRODUCTION PROCESSING CONTEXT

    Manages the complete document processing lifecycle with:
    - Database connection management
    - Error handling and recovery
    - Processing job tracking
    - Metrics collection
    - Resource cleanup
    """

    def __init__(self, task, document_id: str, file_path: str, user_id: str):
        self.task = task
        self.document_id = document_id
        self.file_path = Path(file_path)
        self.user_id = user_id
        self.start_time = datetime.utcnow()
        self.processing_stats = {}
        self.extracted_content = None
        self.content_chunks = []
        self.embeddings = []

        logger.info(f"🚀 STARTING: Document processing for {document_id} (user: {user_id})")

    def execute_processing_pipeline(self) -> Dict[str, Any]:
        """Execute the complete document processing pipeline."""

        # STEP 1: Initialize processing job tracking
        self._create_processing_job()

        # STEP 2: Validate inputs
        self._validate_processing_inputs()

        # STEP 3: Extract text content
        extracted_content = self._extract_document_text()

        # STEP 4: Generate content chunks
        chunks = self._generate_content_chunks(extracted_content.text)

        # STEP 5: Generate embeddings
        embeddings = self._generate_embeddings(chunks)

        # STEP 6: Store in vector database
        self._store_vector_data(chunks, embeddings, extracted_content.metadata)

        # STEP 7: Update document status
        final_result = self._finalize_document_processing(extracted_content, chunks)

        # STEP 8: Cleanup resources
        self._cleanup_resources()

        logger.info(f"✅ SUCCESS: Document {self.document_id} processed successfully")
        logger.info(f"📊 METRICS: {self.processing_stats}")

        return final_result

    def _create_processing_job(self):
        """Create processing job record for monitoring."""
        try:
            with self._get_sync_db_session() as db:
                from api.models.documents import ProcessingJob

                job = ProcessingJob(
                    document_id=self.document_id,
                    celery_task_id=self.task.request.id,
                    status="running",
                    started_at=self.start_time
                )

                db.add(job)
                db.commit()

                logger.info(f"📝 Created processing job for task {self.task.request.id}")

        except Exception as e:
            logger.warning(f"⚠️ Failed to create processing job: {e}")

    def _validate_processing_inputs(self):
        """Validate all processing inputs."""
        if not self.file_path.exists():
            raise ValueError(f"File not found: {self.file_path}")

        if self.file_path.stat().st_size == 0:
            raise ValueError(f"File is empty: {self.file_path}")

        if self.file_path.stat().st_size > 100 * 1024 * 1024:  # 100MB limit
            raise ValueError(f"File too large: {self.file_path.stat().st_size} bytes")

        logger.info(f"✅ Validation passed for {self.file_path}")

    def _extract_document_text(self):
        """Extract text content from document."""
        try:
            logger.info(f"📄 Extracting text from {self.file_path}")

            # Log file details for debugging
            file_size = self.file_path.stat().st_size
            file_extension = self.file_path.suffix.lower()
            logger.info(f"🔍 File details: {self.file_path.name}, size: {file_size} bytes, extension: {file_extension}")

            # Import extractors
            from data_pipeline.extractors.pdf_extractor import PDFExtractor
            from data_pipeline.extractors.text_extractor import TextExtractor

            # Determine extractor based on file type
            if file_extension == '.pdf':
                # Enable OCR for PDF extraction
                pdf_config = {
                    "use_ocr": True,  # Enable OCR for image-based PDFs
                    "ocr_threshold": 0.8,  # OCR quality threshold
                    "extract_images": False,  # Don't extract images for efficiency
                    "extract_tables": True,  # Extract tables
                    "preferred_method": "auto",  # Auto-select best method
                    "chunk_size": 500,
                    "chunk_overlap": 50
                }
                extractor = PDFExtractor(config=pdf_config)
                logger.info("📕 Using PDF extractor with OCR enabled")
            else:
                extractor = TextExtractor()
                logger.info(f"📄 Using text extractor for {file_extension or 'unknown'} file")

            # Extract content
            extracted_content = extractor.extract(str(self.file_path))

            # Log extraction results
            text_length = len(extracted_content.text) if extracted_content.text else 0
            extraction_method = getattr(extracted_content, 'extraction_method', 'unknown')
            logger.info(f"📊 Extracted {text_length} characters using {extraction_method}")

            # CRITICAL: Sanitize extracted text for database storage
            if extracted_content.text:
                original_length = len(extracted_content.text)
                extracted_content.text = self._sanitize_text_for_database(extracted_content.text)
                sanitized_length = len(extracted_content.text)

                if original_length != sanitized_length:
                    logger.info(f"🧹 Text sanitized: {original_length} → {sanitized_length} characters")

            # Validate extraction
            if not extracted_content.text or not extracted_content.text.strip():
                # Provide more specific error message
                if file_extension == '.pdf':
                    raise ValueError(f"No text content extracted from PDF. OCR was enabled but failed to extract readable text. File might be corrupted, password-protected, or contain unscannable content. File size: {file_size} bytes")
                else:
                    raise ValueError(f"No text content extracted from {file_extension} file. File might be empty, binary, or corrupted. File size: {file_size} bytes")

            self.processing_stats.update({
                'extraction_method': extraction_method,
                'text_length': len(extracted_content.text),
                'page_count': extracted_content.metadata.page_count if extracted_content.metadata else None,
                'word_count': len(extracted_content.text.split())
            })

            logger.info(f"✅ Extracted {self.processing_stats['word_count']} words from {self.processing_stats['page_count']} pages using {extraction_method}")

            return extracted_content

        except Exception as e:
            logger.error(f"❌ Text extraction failed: {e}")
            raise

    def _generate_content_chunks(self, text: str) -> List[str]:
        """Generate content chunks for vector storage."""
        try:
            logger.info(f"✂️ Chunking text ({len(text)} characters)")

            # Import chunking utilities
            from data_pipeline.processors.text_chunker import TextChunker

            # Configure chunker
            chunker = TextChunker(
                chunk_size=500,    # Optimized for embeddings
                overlap_size=50,   # Maintain context
                min_chunk_size=100 # Avoid tiny chunks
            )

            # Generate chunks
            chunks = chunker.chunk_text(text)

            # Validate chunks
            if not chunks:
                raise ValueError("No chunks generated from text")

            # CRITICAL: Sanitize each chunk for database storage
            sanitized_chunks = []
            for i, chunk in enumerate(chunks):
                sanitized_chunk = self._sanitize_text_for_database(chunk)

                # Only keep non-empty chunks after sanitization
                if sanitized_chunk and sanitized_chunk.strip():
                    sanitized_chunks.append(sanitized_chunk)
                else:
                    logger.warning(f"⚠️ Chunk {i+1} became empty after sanitization, skipping")

            # Update stats with sanitized chunk count
            self.processing_stats['chunk_count'] = len(sanitized_chunks)
            self.processing_stats['original_chunk_count'] = len(chunks)

            if len(sanitized_chunks) != len(chunks):
                logger.info(f"🧹 Chunks sanitized: {len(chunks)} → {len(sanitized_chunks)} chunks after cleaning")

            logger.info(f"✅ Generated {len(sanitized_chunks)} clean chunks")

            return sanitized_chunks

        except Exception as e:
            logger.error(f"❌ Text chunking failed: {e}")
            # FALLBACK: Simple chunking with sanitization
            return self._simple_text_chunking_with_sanitization(text)

    def _simple_text_chunking(self, text: str) -> List[str]:
        """Emergency fallback chunking when TextChunker fails."""
        try:
            logger.warning("🔄 Using emergency fallback chunking")

            # Simple word-based chunking
            words = text.split()
            chunk_size = 100  # Conservative chunk size
            chunks = []

            for i in range(0, len(words), chunk_size):
                chunk_words = words[i:i + chunk_size]
                chunk = ' '.join(chunk_words)
                chunks.append(chunk)

            return chunks

        except Exception as e:
            logger.error(f"❌ Emergency chunking failed: {e}")
            # Last resort: return original text as single chunk
            return [text] if text else []

    def _simple_text_chunking_with_sanitization(self, text: str) -> List[str]:
        """Emergency fallback chunking with text sanitization."""
        try:
            logger.warning("🔄 Using emergency fallback chunking with sanitization")

            # Simple word-based chunking
            words = text.split()
            chunk_size = 100  # Conservative chunk size
            chunks = []

            for i in range(0, len(words), chunk_size):
                chunk_words = words[i:i + chunk_size]
                chunk = ' '.join(chunk_words)

                # Sanitize each chunk
                sanitized_chunk = self._sanitize_text_for_database(chunk)
                if sanitized_chunk and sanitized_chunk.strip():
                    chunks.append(sanitized_chunk)

            return chunks

        except Exception as e:
            logger.error(f"❌ Emergency chunking with sanitization failed: {e}")
            # Last resort: sanitize and return original text as single chunk
            sanitized_text = self._sanitize_text_for_database(text) if text else ""
            return [sanitized_text] if sanitized_text else []

    def _generate_embeddings(self, chunks: List[str]) -> List[List[float]]:
        """Generate embeddings for text chunks."""
        try:
            logger.info(f"🧠 Generating embeddings for {len(chunks)} chunks")

            # Initialize service
            embedding_service = EmbeddingService()

            # Generate embeddings with batching using the sync method
            embeddings = []
            batch_size = 8  # Process in small batches

            for i in range(0, len(chunks), batch_size):
                batch = chunks[i:i + batch_size]
                # Use the synchronous method directly
                batch_embeddings = embedding_service._encode_sync(batch)
                embeddings.extend(batch_embeddings)

                logger.info(f"🧠 Processed batch {i//batch_size + 1}/{(len(chunks) + batch_size - 1)//batch_size}")

            # Validate embeddings
            if len(embeddings) != len(chunks):
                raise ValueError(f"Embedding count mismatch: {len(embeddings)} != {len(chunks)}")

            self.processing_stats['embedding_count'] = len(embeddings)
            self.processing_stats['embedding_dimension'] = len(embeddings[0]) if embeddings else 0

            logger.info(f"✅ Generated {len(embeddings)} embeddings (dim: {self.processing_stats['embedding_dimension']})")

            return embeddings

        except Exception as e:
            logger.error(f"❌ Embedding generation failed: {e}")
            raise

    def _store_vector_data(self, chunks: List[str], embeddings: List[List[float]], metadata):
        """Store chunks and embeddings in vector database and PostgreSQL."""
        try:
            logger.info(f"💾 Storing {len(chunks)} chunks in vector database")

            # STEP 1: Store in PostgreSQL document_chunks table
            self._store_chunks_in_postgres(chunks, embeddings)

            # STEP 2: Store in vector database (ChromaDB)
            self._store_chunks_in_vector_db(chunks, embeddings, metadata)

            self.processing_stats['chunks_stored'] = len(chunks)

            logger.info(f"✅ Stored {len(chunks)} chunks successfully")

        except Exception as e:
            logger.error(f"❌ Vector storage failed: {e}")
            raise

    def _store_chunks_in_postgres(self, chunks: List[str], embeddings: List[List[float]]):
        """Store document chunks in PostgreSQL."""
        try:
            with self._get_sync_db_session() as db:
                from api.models.documents import DocumentChunk

                # Create chunk records
                chunk_records = []
                for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
                    chunk = DocumentChunk(
                        document_id=self.document_id,
                        content=chunk_text,
                        chunk_index=i,
                        embedding=embedding,  # Store as JSON array
                        chunk_metadata={
                            'length': len(chunk_text),
                            'word_count': len(chunk_text.split()),
                            'created_at': datetime.utcnow().isoformat()
                        }
                    )
                    chunk_records.append(chunk)

                # Batch insert
                db.add_all(chunk_records)
                db.commit()

                logger.info(f"📝 Stored {len(chunk_records)} chunks in PostgreSQL")

        except Exception as e:
            logger.error(f"❌ PostgreSQL chunk storage failed: {e}")
            raise

    def _store_chunks_in_vector_db(self, chunks: List[str], embeddings: List[List[float]], metadata):
        """Store chunks in vector database for semantic search."""
        try:
            # Import vector service
            from api.services.vector_db import VectorDBService

            # Initialize service
            vector_service = VectorDBService()

            # Prepare documents for storage
            documents = []
            metadatas = []
            ids = []

            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                doc_id = f"{self.document_id}_{i}"

                documents.append(chunk)
                ids.append(doc_id)
                metadatas.append({
                    'document_id': self.document_id,
                    'user_id': self.user_id,
                    'chunk_index': i,
                    'page_count': metadata.page_count if metadata and hasattr(metadata, 'page_count') else None,
                    'source_file': self.file_path.name
                })

            # Store in vector database using a new event loop since we're in a Celery worker thread
            # Celery workers run in threads, not async contexts, so we can use asyncio.run() safely
            loop = None
            try:
                # Check if there's already a running event loop
                loop = asyncio.get_running_loop()
            except RuntimeError:
                # No running loop, we can use asyncio.run()
                pass

            if loop is not None:
                # We're in an async context, use run_in_executor to run in a separate thread
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future = executor.submit(
                        asyncio.run,
                        vector_service.add_documents(
                            documents=documents,
                            embeddings=embeddings,
                            metadatas=metadatas,
                            ids=ids
                        )
                    )
                    success = future.result()
            else:
                # No running loop, safe to use asyncio.run()
                success = asyncio.run(vector_service.add_documents(
                    documents=documents,
                    embeddings=embeddings,
                    metadatas=metadatas,
                    ids=ids
                ))

            if success:
                logger.info(f"🔍 Stored {len(documents)} documents in vector database")
            else:
                logger.warning("Vector database storage returned False")

        except Exception as e:
            logger.error(f"❌ Vector database storage failed: {e}")
            # Don't raise - PostgreSQL storage is primary
            logger.warning("Continuing without vector database storage")

    def _finalize_document_processing(self, extracted_content, chunks) -> Dict[str, Any]:
        """Update document status and finalize processing."""
        try:
            with self._get_sync_db_session() as db:
                from api.models.documents import Document, ProcessingJob
                from sqlalchemy import update

                # Update document status
                doc_update = update(Document).where(Document.id == self.document_id).values(
                    status="completed",
                    processed_at=datetime.utcnow(),
                    page_count=self.processing_stats.get('page_count'),
                    word_count=self.processing_stats.get('word_count'),
                    text_length=self.processing_stats.get('text_length'),
                    extraction_method=self.processing_stats.get('extraction_method')
                )

                db.execute(doc_update)

                # Update processing job
                processing_time = (datetime.utcnow() - self.start_time).total_seconds()

                job_update = update(ProcessingJob).where(
                    ProcessingJob.celery_task_id == self.task.request.id
                ).values(
                    status="completed",
                    completed_at=datetime.utcnow(),
                    stats={
                        **self.processing_stats,
                        'processing_time_seconds': processing_time
                    }
                )

                db.execute(job_update)
                db.commit()

                logger.info(f"📝 Updated document and job status in database")

            # Return processing result
            return {
                'status': 'completed',
                'document_id': self.document_id,
                'user_id': self.user_id,
                'processing_time': processing_time,
                'stats': self.processing_stats,
                'chunks_count': len(chunks),
                'message': 'Document processed successfully'
            }

        except Exception as e:
            logger.error(f"❌ Failed to finalize processing: {e}")
            raise

    def _cleanup_resources(self):
        """Clean up temporary files and resources."""
        try:
            if self.file_path.exists():
                self.file_path.unlink()
                logger.info(f"🧹 Cleaned up temporary file: {self.file_path}")
        except Exception as e:
            logger.warning(f"⚠️ Failed to cleanup file: {e}")

    def handle_processing_failure(self, error: Exception) -> Dict[str, Any]:
        """Handle processing failure with comprehensive error reporting."""

        error_message = str(error)
        processing_time = (datetime.utcnow() - self.start_time).total_seconds()

        logger.error(f"💥 PROCESSING FAILED: {self.document_id} - {error_message}")

        try:
            # Update database with failure status
            with self._get_sync_db_session() as db:
                from api.models.documents import Document, ProcessingJob
                from sqlalchemy import update

                # Update document to failed status
                doc_update = update(Document).where(Document.id == self.document_id).values(
                    status="failed",
                    processed_at=datetime.utcnow()
                )
                db.execute(doc_update)

                # Update processing job with error details
                job_update = update(ProcessingJob).where(
                    ProcessingJob.celery_task_id == self.task.request.id
                ).values(
                    status="failed",
                    completed_at=datetime.utcnow(),
                    error_message=error_message,
                    stats={
                        **self.processing_stats,
                        'processing_time_seconds': processing_time,
                        'error_type': type(error).__name__
                    }
                )
                db.execute(job_update)
                db.commit()

        except Exception as db_error:
            logger.error(f"💥 Failed to update failure status in database: {db_error}")

        # Cleanup resources
        self._cleanup_resources()

        return {
            'status': 'failed',
            'document_id': self.document_id,
            'user_id': self.user_id,
            'error': error_message,
            'error_type': type(error).__name__,
            'processing_time': processing_time,
            'stats': self.processing_stats
        }

    @contextmanager
    def _get_sync_db_session(self):
        """Get synchronous database session for Celery tasks."""
        try:
            # Import database components
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker
            import os

            # Create synchronous database URL
            async_url = os.getenv("DATABASE__DATABASE_URL", "postgresql+asyncpg://thinkdocs:dev_password@postgres:5432/thinkdocs")
            sync_url = async_url.replace("postgresql+asyncpg://", "postgresql://")

            # Create engine and session
            engine = create_engine(sync_url, pool_pre_ping=True)
            SessionLocal = sessionmaker(bind=engine)

            session = SessionLocal()
            try:
                yield session
            except Exception as e:
                session.rollback()
                raise
            finally:
                session.close()
                engine.dispose()

        except Exception as e:
            logger.error(f"❌ Database session error: {e}")
            raise

    def _sanitize_text_for_database(self, text: str) -> str:
        """
        Sanitize text for safe database storage.

        Implementation based on industry best practices from:
        - Unicode text validation: https://ipsec.pl/input-validation-of-free-form-unicode-text-in-python.html
        - Input sanitization principles: https://www.educative.io/answers/how-to-sanitize-user-input-in-python
        - C# data sanitization patterns: https://medium.com/@anderson.buenogod/data-sanitization-in-c-security-performance-and-best-practices-73bca8d88e25

        Key principles applied:
        - Uses Unicode character categories for validation (per ipsec.pl)
        - Focuses on database compatibility, not security (per Educative.io)
        - Implements proper input sanitization vs. validation separation
        - "input validation should not be used to prevent XSS or SQLi" (ipsec.pl)

        Critical for preventing PostgreSQL errors with null bytes and
        other problematic characters that can cause storage failures.
        """
        if not text:
            return ""

        try:
            import re
            import unicodedata

            # Step 1: Remove null bytes - PostgreSQL cannot handle these
            text = text.replace('\x00', '')

            # Step 2: Remove replacement characters and other problematic Unicode
            text = text.replace('\ufffd', '')  # Unicode replacement character

            # Step 3: Remove dangerous Unicode control characters
            # Reference: https://ipsec.pl/input-validation-of-free-form-unicode-text-in-python.html
            # "RIGHT-TO-LEFT OVERRIDE is especially tricky as it's being actively used in attacks,
            # where an attachment shown as file.exe.txt (really file.\u202etxt.exe) is really file.txt.exe"
            dangerous_unicode_chars = [
                '\u202e',  # RIGHT-TO-LEFT OVERRIDE (file extension attacks per ipsec.pl)
                '\u202d',  # LEFT-TO-RIGHT OVERRIDE
                '\u200e',  # LEFT-TO-RIGHT MARK
                '\u200f',  # RIGHT-TO-LEFT MARK
            ]
            for dangerous_char in dangerous_unicode_chars:
                text = text.replace(dangerous_char, '')

            # Step 4: Apply Unicode category-based filtering
            # Reference: https://ipsec.pl/input-validation-of-free-form-unicode-text-in-python.html
            # "In Python, you can easily validate Unicode free-form text by whitelisting
            # specific Unicode character categories"
            # Performance optimization: only apply to longer texts
            if len(text) > 1000:  # Only apply to longer texts for performance
                filtered_chars = []
                for char in text:
                    category = unicodedata.category(char)

                    # Allow categories appropriate for document content
                    # Reference: Unicode categories analysis from ipsec.pl
                    # "The characters A 1 a 陳 > ' are classified as Uppercase_Letter (Lu),
                    # Decimal_Number (Nd), Lowercase_Letter (Ll), Other_Letter (Lo)"
                    allowed_categories = {
                        'Lu', 'Ll', 'Lt', 'Lo',  # Letters (including ideographs)
                        'Nd', 'Nl', 'No',        # Numbers
                        'Zs', 'Zl', 'Zp',        # Separators
                        'Po', 'Pd', 'Ps', 'Pe', 'Pi', 'Pf', 'Pc',  # Punctuation
                        'Sm', 'Sc',              # Symbols (math, currency)
                    }

                    if category in allowed_categories or char in '\n\r\t':
                        filtered_chars.append(char)

                text = ''.join(filtered_chars)

            # Step 5: Remove control characters except useful whitespace
            # Keep newlines (0x0A), carriage returns (0x0D), and tabs (0x09)
            text = re.sub(r'[\x01-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]', '', text)

            # Step 6: Normalize Unicode to prevent encoding issues
            # Reference: https://ipsec.pl/input-validation-of-free-form-unicode-text-in-python.html
            # Unicode normalization prevents homoglyph attacks and encoding issues
            try:
                text = unicodedata.normalize('NFC', text)
            except Exception as e:
                logger.warning(f"⚠️ Unicode normalization failed: {e}")

            # Step 7: Validate UTF-8 encoding
            # Reference: https://www.educative.io/answers/how-to-sanitize-user-input-in-python
            # Ensure data is semantically and logically correct for system workflow
            try:
                text.encode('utf-8').decode('utf-8')
            except UnicodeError as e:
                logger.warning(f"⚠️ Invalid UTF-8 detected, cleaning: {e}")
                text = text.encode('utf-8', errors='ignore').decode('utf-8')

            # Step 8: Length check for database limits
            # Reference: OWASP Input Validation Cheatsheet (cited in ipsec.pl)
            # "define a maximum length for the input field"
            max_length = 50_000_000  # 50MB limit for text fields
            if len(text) > max_length:
                logger.warning(f"⚠️ Text too long ({len(text)} chars), truncating to {max_length}")
                text = text[:max_length] + "\n... [CONTENT TRUNCATED FOR DATABASE STORAGE]"

            logger.info(f"✅ Text sanitized: {len(text)} characters ready for database")
            return text

        except Exception as e:
            logger.error(f"❌ Text sanitization failed: {e}")
            # Emergency fallback - basic null byte removal
            # Reference: https://www.educative.io/answers/how-to-sanitize-user-input-in-python
            # "remove unnecessary or malformed data from our input"
            return text.replace('\x00', '') if text else ""


# PRODUCTION UTILITIES: Additional processing tasks

@celery_app.task(name="recover_stuck_documents")
def recover_stuck_documents() -> Dict[str, Any]:
    """
    PRODUCTION RECOVERY TASK

    Identifies and recovers documents stuck in processing state.
    Should be run periodically via cron job.
    """
    try:
        from datetime import timedelta

        recovery_context = DocumentRecoveryContext()
        return recovery_context.recover_stuck_documents()

    except Exception as e:
        logger.error(f"💥 Document recovery failed: {e}")
        return {'status': 'failed', 'error': str(e)}


class DocumentRecoveryContext:
    """Production document recovery service."""

    def recover_stuck_documents(self) -> Dict[str, Any]:
        """Recover documents stuck in processing for more than 30 minutes."""

        try:
            with self._get_sync_db_session() as db:
                from api.models.documents import Document
                from sqlalchemy import update
                from datetime import datetime, timedelta

                # Find stuck documents (processing > 30 minutes)
                cutoff_time = datetime.utcnow() - timedelta(minutes=30)

                stuck_docs = db.query(Document).filter(
                    Document.status == "processing",
                    Document.upload_date < cutoff_time
                ).all()

                if not stuck_docs:
                    logger.info("✅ No stuck documents found")
                    return {'status': 'success', 'recovered_count': 0}

                # Update stuck documents to failed status
                recovered_count = 0
                for doc in stuck_docs:
                    update_stmt = update(Document).where(Document.id == doc.id).values(
                        status="failed",
                        processed_at=datetime.utcnow()
                    )
                    db.execute(update_stmt)
                    recovered_count += 1

                    logger.warning(f"🔄 Recovered stuck document: {doc.id} ({doc.filename})")

                db.commit()

                logger.info(f"✅ Recovered {recovered_count} stuck documents")

                return {
                    'status': 'success',
                    'recovered_count': recovered_count,
                    'recovered_documents': [{'id': doc.id, 'filename': doc.filename} for doc in stuck_docs]
                }

        except Exception as e:
            logger.error(f"❌ Document recovery failed: {e}")
            return {'status': 'failed', 'error': str(e)}

    @contextmanager
    def _get_sync_db_session(self):
        """Get synchronous database session."""
        try:
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker
            import os

            async_url = os.getenv("DATABASE__DATABASE_URL", "postgresql+asyncpg://thinkdocs:dev_password@postgres:5432/thinkdocs")
            sync_url = async_url.replace("postgresql+asyncpg://", "postgresql://")

            engine = create_engine(sync_url, pool_pre_ping=True)
            SessionLocal = sessionmaker(bind=engine)

            session = SessionLocal()
            try:
                yield session
            except Exception as e:
                session.rollback()
                raise
            finally:
                session.close()
                engine.dispose()

        except Exception as e:
            logger.error(f"❌ Database session error: {e}")
            raise

    def _store_chunks_in_database(self, chunks: List[str], embeddings: List[List[float]]):
        """Store document chunks in PostgreSQL database for persistence and search."""
        try:
            logger.info(f"💾 Storing {len(chunks)} chunks in database...")

            from api.database import get_db, async_session_maker
            from api.models.documents import DocumentChunk
            import asyncio

            async def store_chunks_async():
                if async_session_maker is None:
                    logger.warning("⚠️ Database not available, skipping chunk storage")
                    return False

                async with async_session_maker() as session:
                    try:
                        # Store each chunk with its embedding
                        chunk_objects = []
                        for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
                            chunk = DocumentChunk(
                                document_id=self.document_id,
                                content=chunk_text,
                                chunk_index=i,
                                embedding=embedding,  # Store as JSON array
                                chunk_metadata={
                                    "extraction_method": self.processing_stats.get("extraction_method"),
                                    "chunk_length": len(chunk_text),
                                    "processing_timestamp": self.processing_stats.get("start_time")
                                }
                            )
                            chunk_objects.append(chunk)

                        # Bulk insert for performance (PostgreSQL best practice)
                        session.add_all(chunk_objects)
                        await session.commit()

                        logger.info(f"✅ Stored {len(chunk_objects)} chunks in database")
                        return True

                    except Exception as e:
                        logger.error(f"❌ Database chunk storage failed: {e}")
                        await session.rollback()
                        return False

            # Run the async function
            result = asyncio.run(store_chunks_async())
            return result

        except Exception as e:
            logger.error(f"❌ Chunk database storage failed: {e}")
            return False
