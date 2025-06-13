"""
Text document extractor for plain text files.
"""

import asyncio
import mimetypes
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import structlog

from .base import BaseExtractor, ExtractedContent, DocumentMetadata, ExtractionError

logger = structlog.get_logger(__name__)


class TextExtractor(BaseExtractor):
    """Simple text extractor for plain text files."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize text extractor with configuration."""
        super().__init__(config)

        # Configuration options
        self.encoding = config.get("encoding", "utf-8") if config else "utf-8"
        self.fallback_encodings = config.get("fallback_encodings", ["latin-1", "cp1252"]) if config else ["latin-1", "cp1252"]

    @property
    def supported_formats(self) -> List[str]:
        """Return supported file formats."""
        return ["txt", "md", "text", "plain"]

    @property
    def name(self) -> str:
        """Return extractor name."""
        return "text_extractor"

    def _is_supported_mime_type(self, mime_type: str) -> bool:
        """Check if MIME type is supported."""
        return mime_type.startswith("text/")

    def extract(self, file_path: Union[str, Path]) -> ExtractedContent:
        """Extract text from plain text file."""
        file_path = Path(file_path)

        # Create base metadata
        metadata = self._create_metadata(file_path)

        try:
            # Read file content
            text = self._read_file_content(file_path)

            # Clean text
            text = self._clean_text(text)

            # Update metadata
            metadata.word_count = self._count_words(text)
            metadata.page_count = 1  # Text files have 1 "page"

            # Create chunks
            chunk_size = self.config.get("chunk_size", 1000)
            chunk_overlap = self.config.get("chunk_overlap", 200)
            chunks = self._chunk_text(text, chunk_size, chunk_overlap)

            return ExtractedContent(
                text=text,
                metadata=metadata,
                chunks=chunks,
                extraction_method="text_reader"
            )

        except Exception as e:
            raise ExtractionError(f"Failed to extract text from {file_path}: {str(e)}") from e

    def _read_file_content(self, file_path: Path) -> str:
        """Read file content with encoding detection."""

                # Try primary encoding first
        try:
            with open(file_path, 'r', encoding=self.encoding) as f:
                content = f.read()
                return content
        except UnicodeDecodeError:
            logger.warning(f"Failed to decode with {self.encoding}, trying fallbacks")

        # Try fallback encodings
        for encoding in self.fallback_encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    content = f.read()
                    logger.info(f"Successfully decoded with {encoding}")
                    return content
            except UnicodeDecodeError:
                continue

        # Last resort: read as binary and decode with errors='replace'
        logger.warning("All encodings failed, using binary mode with error replacement")
        try:
            with open(file_path, 'rb') as f:
                binary_content = f.read()
                return binary_content.decode(self.encoding, errors='replace')
        except Exception as e:
            raise ExtractionError(f"Cannot read file content: {e}")
