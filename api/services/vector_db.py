"""
Vector database service for ThinkDocs using ChromaDB.
Handles document embeddings, similarity search, and vector operations.
"""

import logging
from typing import List, Dict, Any, Optional

try:
    import chromadb
    CHROMADB_AVAILABLE = True
except ImportError:
    chromadb = None
    CHROMADB_AVAILABLE = False

from api.config import settings

logger = logging.getLogger(__name__)

# Global ChromaDB client
_chroma_client = None
_collection = None


async def setup_chromadb():
    """Initialize ChromaDB client and collection."""
    global _chroma_client, _collection

    if not CHROMADB_AVAILABLE:
        logger.warning("ChromaDB not available - using mock implementation")
        return None

    if _chroma_client is None:
        try:
            # Create ChromaDB client
            _chroma_client = chromadb.HttpClient(
                host=settings.vector_db.chromadb_host,
                port=settings.vector_db.chromadb_port
            )

            # Get or create collection
            collection_name = "thinkdocs_documents"
            try:
                _collection = _chroma_client.get_collection(
                    name=collection_name
                )
                logger.info(f"Using existing ChromaDB collection: {collection_name}")
            except Exception:
                _collection = _chroma_client.create_collection(
                    name=collection_name,
                    metadata={"description": "ThinkDocs document embeddings"}
                )
                logger.info(f"Created new ChromaDB collection: {collection_name}")

            logger.info("ChromaDB connection established successfully")

        except Exception as e:
            logger.error(f"Failed to connect to ChromaDB: {e}")
            # Don't raise, just log and continue with None
            _chroma_client = None
            _collection = None

    return _chroma_client


async def get_vector_db():
    """Get ChromaDB client."""
    if _chroma_client is None:
        await setup_chromadb()
    return _chroma_client


async def get_collection():
    """Get ChromaDB collection."""
    if _collection is None:
        await setup_chromadb()
    return _collection


class VectorDBService:
    """ChromaDB vector database service with fallback."""

    def __init__(self):
        self.client = None
        self.collection = None

    async def _get_client(self):
        """Get ChromaDB client."""
        if self.client is None:
            self.client = await get_vector_db()
        return self.client

    async def _get_collection(self):
        """Get ChromaDB collection."""
        if self.collection is None:
            self.collection = await get_collection()
        return self.collection

    async def add_documents(
        self,
        documents: List[str],
        metadatas: List[Dict[str, Any]],
        embeddings: Optional[List[List[float]]] = None,
        ids: Optional[List[str]] = None
    ) -> bool:
        """Add documents to the vector database."""
        if not CHROMADB_AVAILABLE:
            logger.info("ChromaDB not available - skipping document addition")
            return True

        try:
            collection = await self._get_collection()
            if collection is None:
                logger.warning("ChromaDB collection not available")
                return False

            # Generate IDs if not provided
            if ids is None:
                ids = [f"doc_{i}" for i in range(len(documents))]

            # Add documents to collection
            if embeddings:
                collection.add(
                    documents=documents,
                    metadatas=metadatas,
                    embeddings=embeddings,
                    ids=ids
                )
            else:
                # ChromaDB will generate embeddings automatically
                collection.add(
                    documents=documents,
                    metadatas=metadatas,
                    ids=ids
                )

            logger.info(f"Added {len(documents)} documents to ChromaDB")
            return True

        except Exception as e:
            logger.error(f"Error adding documents to ChromaDB: {e}")
            return False

    async def search_similar(
        self,
        query: str,
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Search for similar documents."""
        if not CHROMADB_AVAILABLE:
            logger.info("ChromaDB not available - returning empty results")
            return []

        try:
            collection = await self._get_collection()
            if collection is None:
                logger.warning("ChromaDB collection not available")
                return []

            results = collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where
            )

            # Format results
            formatted_results = []
            if results.get('documents') and results['documents'][0]:
                for i, doc in enumerate(results['documents'][0]):
                    result = {
                        'document': doc,
                        'metadata': results['metadatas'][0][i] if results.get('metadatas') else {},
                        'distance': results['distances'][0][i] if results.get('distances') else 0.0,
                        'id': results['ids'][0][i] if results.get('ids') else None
                    }
                    formatted_results.append(result)

            return formatted_results

        except Exception as e:
            logger.error(f"Error searching ChromaDB: {e}")
            return []

    async def delete_documents(self, ids: List[str]) -> bool:
        """Delete documents by IDs."""
        if not CHROMADB_AVAILABLE:
            logger.info("ChromaDB not available - skipping document deletion")
            return True

        try:
            collection = await self._get_collection()
            if collection is None:
                logger.warning("ChromaDB collection not available")
                return False

            collection.delete(ids=ids)
            logger.info(f"Deleted {len(ids)} documents from ChromaDB")
            return True

        except Exception as e:
            logger.error(f"Error deleting documents from ChromaDB: {e}")
            return False

    async def get_collection_stats(self) -> Dict[str, Any]:
        """Get collection statistics."""
        if not CHROMADB_AVAILABLE:
            return {"count": 0, "available": False}

        try:
            collection = await self._get_collection()
            if collection is None:
                return {"count": 0, "available": False}

            count = collection.count()
            return {
                "count": count,
                "available": True,
                "name": settings.chromadb.collection_name
            }

        except Exception as e:
            logger.error(f"Error getting collection stats: {e}")
            return {"count": 0, "available": False, "error": str(e)}


# Helper functions for backward compatibility
async def add_documents(
    documents: List[str],
    metadatas: List[Dict[str, Any]],
    embeddings: Optional[List[List[float]]] = None,
    ids: Optional[List[str]] = None
) -> bool:
    """Add documents to ChromaDB."""
    service = VectorDBService()
    return await service.add_documents(documents, metadatas, embeddings, ids)


async def search_similar_documents(
    query: str,
    n_results: int = 5,
    where: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """Search for similar documents."""
    service = VectorDBService()
    return await service.search_similar(query, n_results, where)
