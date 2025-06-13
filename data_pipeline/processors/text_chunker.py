"""
TEXT CHUNKING SERVICE
===============================

Enterprise-grade text chunking with:
- Intelligent boundary detection
- Overlap management
- Context preservation
- Multiple chunking strategies
"""

import re
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ChunkingConfig:
    """Configuration for text chunking behavior."""
    chunk_size: int = 500
    overlap_size: int = 50
    min_chunk_size: int = 100
    preserve_sentences: bool = True
    preserve_paragraphs: bool = True
    language: str = "en"


class TextChunker:
    """
    TEXT CHUNKER

    Intelligent text chunking optimized for vector embeddings and semantic search.
    Uses multiple strategies to create meaningful, searchable text chunks while
    preserving context and semantic boundaries.
    """

    def __init__(self, chunk_size: int = 500, overlap_size: int = 50, min_chunk_size: int = 100):
        """
        Initialize the text chunker.

        Args:
            chunk_size: Target size for each chunk (characters)
            overlap_size: Overlap between consecutive chunks
            min_chunk_size: Minimum size for a valid chunk
        """
        self.config = ChunkingConfig(
            chunk_size=chunk_size,
            overlap_size=overlap_size,
            min_chunk_size=min_chunk_size
        )

        # Compile regex patterns for efficient processing
        self._compile_patterns()

        logger.info(f"TextChunker initialized: {chunk_size}ch chunks, {overlap_size}ch overlap")

    def _compile_patterns(self):
        """Compile regex patterns for text processing."""
        # Sentence boundaries (improved for academic/technical text)
        self.sentence_pattern = re.compile(
            r'(?<=[.!?])\s+(?=[A-Z])|'  # Standard sentence endings
            r'(?<=\.)\s+(?=\d)|'         # After periods before numbers
            r'(?<=\d\.)\s+(?=[A-Z])|'    # After numbered lists
            r'(?<=etc\.)\s+(?=[A-Z])|'   # After etc.
            r'(?<=vs\.)\s+(?=[A-Z])|'    # After vs.
            r'(?<=e\.g\.)\s+(?=[A-Z])|'  # After e.g.
            r'(?<=i\.e\.)\s+(?=[A-Z])'   # After i.e.
        )

        # Paragraph boundaries
        self.paragraph_pattern = re.compile(r'\n\s*\n')

        # Section boundaries (headers, titles)
        self.section_pattern = re.compile(
            r'\n\s*(?:[A-Z][A-Z\s]{2,}|'  # ALL CAPS headers
            r'\d+\.\s*[A-Z][a-z]+|'        # Numbered sections
            r'#{1,6}\s+.+|'                # Markdown headers
            r'[A-Z][a-z]+:(?:\s|$))'       # Title: format
        )

        # Remove excessive whitespace
        self.whitespace_pattern = re.compile(r'\s+')

    def chunk_text(self, text: str) -> List[str]:
        """
        Create intelligent text chunks from input text.

        Args:
            text: Input text to be chunked

        Returns:
            List of text chunks optimized for semantic search
        """
        try:
            # Preprocessing
            text = self._preprocess_text(text)

            if len(text) <= self.config.chunk_size:
                return [text] if len(text) >= self.config.min_chunk_size else []

            # Try hierarchical chunking strategies
            chunks = self._hierarchical_chunk(text)

            # Validate and filter chunks
            chunks = self._validate_chunks(chunks)

            logger.info(f"Generated {len(chunks)} chunks from {len(text)} characters")

            return chunks

        except Exception as e:
            logger.error(f"Text chunking failed: {e}")
            # Fallback to simple chunking
            return self._simple_chunk(text)

    def _preprocess_text(self, text: str) -> str:
        """Clean and normalize text for chunking."""
        # Remove excessive whitespace while preserving structure
        text = self.whitespace_pattern.sub(' ', text)

        # Remove leading/trailing whitespace
        text = text.strip()

        # Preserve paragraph breaks
        text = re.sub(r'\n\s*\n', '\n\n', text)

        return text

    def _hierarchical_chunk(self, text: str) -> List[str]:
        """
        Hierarchical chunking strategy.

        1. Try to chunk by sections
        2. Fall back to paragraphs
        3. Fall back to sentences
        4. Fall back to character-based
        """

        # Strategy 1: Section-based chunking
        if self.config.preserve_paragraphs:
            section_chunks = self._chunk_by_sections(text)
            if section_chunks and self._are_chunks_reasonable(section_chunks):
                return section_chunks

        # Strategy 2: Paragraph-based chunking
        if self.config.preserve_paragraphs:
            paragraph_chunks = self._chunk_by_paragraphs(text)
            if paragraph_chunks and self._are_chunks_reasonable(paragraph_chunks):
                return paragraph_chunks

        # Strategy 3: Sentence-based chunking
        if self.config.preserve_sentences:
            sentence_chunks = self._chunk_by_sentences(text)
            if sentence_chunks and self._are_chunks_reasonable(sentence_chunks):
                return sentence_chunks

        # Strategy 4: Character-based chunking (fallback)
        return self._chunk_by_characters(text)

    def _chunk_by_sections(self, text: str) -> List[str]:
        """Chunk text by detected sections."""
        sections = self.section_pattern.split(text)
        return self._create_overlapping_chunks(sections)

    def _chunk_by_paragraphs(self, text: str) -> List[str]:
        """Chunk text by paragraphs."""
        paragraphs = self.paragraph_pattern.split(text)
        paragraphs = [p.strip() for p in paragraphs if p.strip()]
        return self._create_overlapping_chunks(paragraphs)

    def _chunk_by_sentences(self, text: str) -> List[str]:
        """Chunk text by sentences."""
        sentences = self.sentence_pattern.split(text)
        sentences = [s.strip() for s in sentences if s.strip()]
        return self._create_overlapping_chunks(sentences)

    def _chunk_by_characters(self, text: str) -> List[str]:
        """Character-based chunking with word boundary preservation."""
        chunks = []
        start = 0

        while start < len(text):
            end = start + self.config.chunk_size

            if end >= len(text):
                # Last chunk
                chunk = text[start:].strip()
                if len(chunk) >= self.config.min_chunk_size:
                    chunks.append(chunk)
                break

            # Find word boundary
            while end > start and text[end] not in ' \n\t':
                end -= 1

            if end == start:  # No word boundary found
                end = start + self.config.chunk_size

            chunk = text[start:end].strip()
            if len(chunk) >= self.config.min_chunk_size:
                chunks.append(chunk)

            # Move start with overlap
            start = max(start + 1, end - self.config.overlap_size)

        return chunks

    def _create_overlapping_chunks(self, units: List[str]) -> List[str]:
        """Create chunks from text units with overlap."""
        chunks = []
        current_chunk = ""
        current_size = 0

        i = 0
        while i < len(units):
            unit = units[i]
            unit_size = len(unit)

            # Check if adding this unit exceeds chunk size
            if current_size + unit_size > self.config.chunk_size and current_chunk:
                # Save current chunk
                if current_size >= self.config.min_chunk_size:
                    chunks.append(current_chunk.strip())

                # Start new chunk with overlap
                overlap_text = self._get_overlap_text(current_chunk)
                current_chunk = overlap_text + " " + unit if overlap_text else unit
                current_size = len(current_chunk)
            else:
                # Add unit to current chunk
                if current_chunk:
                    current_chunk += " " + unit
                else:
                    current_chunk = unit
                current_size = len(current_chunk)

            i += 1

        # Add final chunk
        if current_chunk.strip() and len(current_chunk) >= self.config.min_chunk_size:
            chunks.append(current_chunk.strip())

        return chunks

    def _get_overlap_text(self, text: str) -> str:
        """Extract overlap text from the end of a chunk."""
        if len(text) <= self.config.overlap_size:
            return text

        # Try to find sentence boundary within overlap region
        overlap_start = len(text) - self.config.overlap_size
        overlap_text = text[overlap_start:]

        # Look for sentence boundary
        sentences = self.sentence_pattern.split(overlap_text)
        if len(sentences) > 1:
            # Use complete sentences for overlap
            return sentences[-1].strip()

        # Fall back to character-based overlap
        return overlap_text.strip()

    def _are_chunks_reasonable(self, chunks: List[str]) -> bool:
        """Check if chunks are reasonable size and distribution."""
        if not chunks:
            return False

        # Check if chunks are too small or too large
        sizes = [len(chunk) for chunk in chunks]
        avg_size = sum(sizes) / len(sizes)

        # Reasonable if average size is within range
        return (self.config.min_chunk_size <= avg_size <= self.config.chunk_size * 2)

    def _simple_chunk(self, text: str) -> List[str]:
        """Simple fallback chunking for error cases."""
        chunks = []
        chunk_size = self.config.chunk_size

        for i in range(0, len(text), chunk_size):
            chunk = text[i:i + chunk_size].strip()
            if len(chunk) >= self.config.min_chunk_size:
                chunks.append(chunk)

        return chunks

    def _validate_chunks(self, chunks: List[str]) -> List[str]:
        """Validate and filter chunks."""
        valid_chunks = []

        for chunk in chunks:
            chunk = chunk.strip()

            # Size validation
            if len(chunk) < self.config.min_chunk_size:
                continue

            # Content validation (not just whitespace or special chars)
            if not re.search(r'[a-zA-Z0-9]', chunk):
                continue

            # Remove excessive repetition
            if self._is_repetitive(chunk):
                continue

            valid_chunks.append(chunk)

        return valid_chunks

    def _is_repetitive(self, text: str, threshold: float = 0.8) -> bool:
        """Check if text is overly repetitive."""
        words = text.split()
        if len(words) < 10:  # Skip check for short texts
            return False

        unique_words = set(words)
        repetition_ratio = len(unique_words) / len(words)

        return repetition_ratio < threshold

    def get_chunk_stats(self, chunks: List[str]) -> Dict[str, Any]:
        """Get statistics about the generated chunks."""
        if not chunks:
            return {}

        sizes = [len(chunk) for chunk in chunks]
        word_counts = [len(chunk.split()) for chunk in chunks]

        return {
            'total_chunks': len(chunks),
            'total_characters': sum(sizes),
            'total_words': sum(word_counts),
            'avg_chunk_size': sum(sizes) / len(sizes),
            'avg_words_per_chunk': sum(word_counts) / len(word_counts),
            'min_chunk_size': min(sizes),
            'max_chunk_size': max(sizes),
            'size_distribution': {
                'small': len([s for s in sizes if s < self.config.chunk_size * 0.5]),
                'medium': len([s for s in sizes if self.config.chunk_size * 0.5 <= s <= self.config.chunk_size * 1.5]),
                'large': len([s for s in sizes if s > self.config.chunk_size * 1.5])
            }
        }
