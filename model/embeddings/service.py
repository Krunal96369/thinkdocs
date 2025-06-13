"""
Embedding service for document vectorization using sentence-transformers.
"""

import logging
from typing import List, Optional, Union
import asyncio
from concurrent.futures import ThreadPoolExecutor

try:
    from sentence_transformers import SentenceTransformer
    import torch
    import numpy as np
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SentenceTransformer = None
    torch = None
    np = None
    SENTENCE_TRANSFORMERS_AVAILABLE = False

logger = logging.getLogger(__name__)

class EmbeddingService:
    """Service for generating document embeddings using sentence-transformers."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """Initialize the embedding service."""
        self.model_name = model_name
        self.model = None
        self.embedding_dim = 384  # Dimension for all-MiniLM-L6-v2
        self.executor = ThreadPoolExecutor(max_workers=4)

        if SENTENCE_TRANSFORMERS_AVAILABLE:
            logger.info(f"Initializing embedding service with model: {model_name}")
            self._load_model()
        else:
            logger.warning("Sentence transformers not available - using mock embeddings")

    def _load_model(self):
        """Load the sentence transformer model."""
        try:
            if SENTENCE_TRANSFORMERS_AVAILABLE:
                self.model = SentenceTransformer(self.model_name)
                # Move to GPU if available
                if torch and torch.cuda.is_available():
                    self.model = self.model.cuda()
                    logger.info("Model loaded on GPU")
                else:
                    logger.info("Model loaded on CPU")

                # Test embedding to get actual dimension
                test_embedding = self.model.encode(["test"], convert_to_tensor=False)
                self.embedding_dim = len(test_embedding[0])
                logger.info(f"Model loaded successfully. Embedding dimension: {self.embedding_dim}")
            else:
                logger.warning("Cannot load model - sentence transformers not available")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            self.model = None

    def _encode_sync(self, texts: List[str]) -> List[List[float]]:
        """Synchronous encoding function."""
        if not SENTENCE_TRANSFORMERS_AVAILABLE or self.model is None:
            # Return mock embeddings
            return [[0.1] * self.embedding_dim for _ in texts]

        try:
            # Generate embeddings
            embeddings = self.model.encode(
                texts,
                convert_to_tensor=False,
                show_progress_bar=len(texts) > 10,
                batch_size=16
            )

            # Convert to list of lists
            if isinstance(embeddings, np.ndarray):
                return embeddings.tolist()
            else:
                return embeddings

        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            # Return mock embeddings on error
            return [[0.1] * self.embedding_dim for _ in texts]

    async def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        return (await self.embed_texts([text]))[0]

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts."""
        if not texts:
            return []

        # Filter out empty texts
        valid_texts = [text.strip() for text in texts if text.strip()]
        if not valid_texts:
            return [[0.0] * self.embedding_dim for _ in texts]

        # Run encoding in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(
            self.executor,
            self._encode_sync,
            valid_texts
        )

        # Handle cases where original texts had empty strings
        result = []
        valid_idx = 0
        for text in texts:
            if text.strip():
                result.append(embeddings[valid_idx])
                valid_idx += 1
            else:
                result.append([0.0] * self.embedding_dim)

        return result

    async def embed_documents(
        self,
        documents: List[str],
        batch_size: int = 16
    ) -> List[List[float]]:
        """Generate embeddings for documents in batches."""
        if not documents:
            return []

        all_embeddings = []

        # Process in batches
        for i in range(0, len(documents), batch_size):
            batch = documents[i:i + batch_size]
            batch_embeddings = await self.embed_texts(batch)
            all_embeddings.extend(batch_embeddings)

            # Log progress
            if len(documents) > batch_size:
                progress = min(i + batch_size, len(documents))
                logger.info(f"Embedded {progress}/{len(documents)} documents")

        return all_embeddings

    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings."""
        return self.embedding_dim

    def is_available(self) -> bool:
        """Check if the embedding service is available."""
        return SENTENCE_TRANSFORMERS_AVAILABLE and self.model is not None

    async def similarity_search(
        self,
        query_embedding: List[float],
        document_embeddings: List[List[float]],
        top_k: int = 5
    ) -> List[tuple]:
        """Find most similar documents based on cosine similarity."""
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            # Return mock results
            return [(i, 0.5) for i in range(min(top_k, len(document_embeddings)))]

        try:
            import numpy as np
            from sklearn.metrics.pairwise import cosine_similarity

            # Convert to numpy arrays
            query_vec = np.array(query_embedding).reshape(1, -1)
            doc_vecs = np.array(document_embeddings)

            # Compute cosine similarities
            similarities = cosine_similarity(query_vec, doc_vecs)[0]

            # Get top-k most similar documents
            top_indices = np.argsort(similarities)[::-1][:top_k]

            return [(int(idx), float(similarities[idx])) for idx in top_indices]

        except Exception as e:
            logger.error(f"Error in similarity search: {e}")
            return [(i, 0.5) for i in range(min(top_k, len(document_embeddings)))]

    def __del__(self):
        """Cleanup resources."""
        if hasattr(self, 'executor'):
            self.executor.shutdown(wait=False)
