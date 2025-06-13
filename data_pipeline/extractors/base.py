"""
Base document extractor interface and common functionality.
Provides a unified interface for extracting text from various document formats.
"""

import hashlib
import mimetypes
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import structlog

logger = structlog.get_logger(__name__)


@dataclass
class DocumentMetadata:
    """Document metadata container."""

    filename: str
    file_size: int
    mime_type: str
    created_at: datetime
    modified_at: Optional[datetime] = None
    author: Optional[str] = None
    title: Optional[str] = None
    subject: Optional[str] = None
    language: Optional[str] = None
    page_count: Optional[int] = None
    word_count: Optional[int] = None
    checksum: Optional[str] = None
    source_path: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None


@dataclass
class ExtractedContent:
    """Container for extracted document content."""

    text: str
    metadata: DocumentMetadata
    chunks: Optional[List[str]] = None
    images: Optional[List[bytes]] = None
    tables: Optional[List[Dict[str, Any]]] = None
    links: Optional[List[str]] = None
    extraction_method: Optional[str] = None
    extraction_timestamp: Optional[datetime] = None
    confidence_score: Optional[float] = None

    def __post_init__(self):
        """Set extraction timestamp if not provided."""
        if self.extraction_timestamp is None:
            self.extraction_timestamp = datetime.utcnow()


class BaseExtractor(ABC):
    """Base class for document extractors."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize the extractor with optional configuration."""
        self.config = config or {}
        self.logger = structlog.get_logger(self.__class__.__name__)

    @property
    @abstractmethod
    def supported_formats(self) -> List[str]:
        """Return list of supported file formats."""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Return the extractor name."""
        pass

    def can_extract(self, file_path: Union[str, Path]) -> bool:
        """Check if this extractor can handle the given file."""
        file_path = Path(file_path)

        # Check by file extension
        extension = file_path.suffix.lower().lstrip('.')
        if extension in self.supported_formats:
            return True

        # Check by MIME type
        mime_type, _ = mimetypes.guess_type(str(file_path))
        if mime_type and self._is_supported_mime_type(mime_type):
            return True

        return False

    def _is_supported_mime_type(self, mime_type: str) -> bool:
        """Check if MIME type is supported (override in subclasses)."""
        return False

    def _calculate_checksum(self, file_path: Union[str, Path]) -> str:
        """Calculate MD5 checksum of the file."""
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()

    def _create_metadata(self, file_path: Union[str, Path]) -> DocumentMetadata:
        """Create basic metadata for the document."""
        file_path = Path(file_path)
        stat = file_path.stat()

        mime_type, _ = mimetypes.guess_type(str(file_path))
        if not mime_type:
            mime_type = "application/octet-stream"

        return DocumentMetadata(
            filename=file_path.name,
            file_size=stat.st_size,
            mime_type=mime_type,
            created_at=datetime.fromtimestamp(stat.st_ctime),
            modified_at=datetime.fromtimestamp(stat.st_mtime),
            checksum=self._calculate_checksum(file_path),
            source_path=str(file_path.absolute())
        )

    def _count_words(self, text: str) -> int:
        """Count words in the extracted text."""
        return len(text.split())

    def _clean_text(self, text: str) -> str:
        """
        Clean and normalize extracted text with production-grade sanitization.

        Implementation based on industry best practices from:
        - Unicode text validation: https://ipsec.pl/input-validation-of-free-form-unicode-text-in-python.html
        - Input sanitization principles: https://www.educative.io/answers/how-to-sanitize-user-input-in-python
        - C# data sanitization patterns: https://medium.com/@anderson.buenogod/data-sanitization-in-c-security-performance-and-best-practices-73bca8d88e25

        Key principles applied:
        - Uses Unicode character categories for validation (per ipsec.pl guidance)
        - Focuses on database compatibility, not security (per Educative.io)
        - Implements proper Unicode normalization and encoding validation
        - Removes dangerous Unicode control characters (RIGHT-TO-LEFT OVERRIDE attacks)

        Handles null bytes, encoding issues, and malformed characters that can
        cause database storage failures or processing issues.
        """
        if not text:
            return ""

        try:
            import re
            import unicodedata

            # Step 1: Remove null bytes and other problematic control characters
            # PostgreSQL cannot handle NUL (0x00) characters in text fields
            text = text.replace('\x00', '')  # Remove null bytes
            text = text.replace('\ufffd', '')  # Remove replacement characters ()

            # Step 2: Remove malicious Unicode control characters
            # Reference: https://ipsec.pl/input-validation-of-free-form-unicode-text-in-python.html
            # "RIGHT-TO-LEFT OVERRIDE is especially tricky as it's being actively used in attacks"
            dangerous_chars = [
                '\u202e',  # RIGHT-TO-LEFT OVERRIDE (used in file.exe.txt attacks per ipsec.pl)
                '\u202d',  # LEFT-TO-RIGHT OVERRIDE
                '\u200e',  # LEFT-TO-RIGHT MARK
                '\u200f',  # RIGHT-TO-LEFT MARK
            ]
            for dangerous_char in dangerous_chars:
                text = text.replace(dangerous_char, '')

            # Step 3: Advanced Unicode category-based validation
            # Reference: https://ipsec.pl/input-validation-of-free-form-unicode-text-in-python.html
            # "In Python, you can easily validate Unicode free-form text by whitelisting
            # specific Unicode character categories such as lowercase letters, uppercase letters, ideographs"
            cleaned_chars = []
            for char in text:
                category = unicodedata.category(char)

                # Allow character categories that make sense for document text
                # Based on Unicode categories analysis from ipsec.pl documentation
                # Categories correspond to: Lu=Uppercase_Letter, Ll=Lowercase_Letter, etc.
                allowed_categories = {
                    'Lu',  # Uppercase_Letter
                    'Ll',  # Lowercase_Letter
                    'Lt',  # Titlecase_Letter
                    'Lo',  # Other_Letter (includes ideographs like Chinese/Japanese per ipsec.pl)
                    'Nd',  # Decimal_Number
                    'Nl',  # Letter_Number
                    'No',  # Other_Number
                    'Zs',  # Space_Separator (spaces)
                    'Zl',  # Line_Separator
                    'Zp',  # Paragraph_Separator
                    'Po',  # Other_Punctuation (periods, commas, etc.)
                    'Pd',  # Dash_Punctuation (hyphens)
                    'Ps',  # Open_Punctuation (opening brackets)
                    'Pe',  # Close_Punctuation (closing brackets)
                    'Pi',  # Initial_Punctuation (opening quotes)
                    'Pf',  # Final_Punctuation (closing quotes)
                    'Pc',  # Connector_Punctuation (underscores)
                    'Sm',  # Math_Symbol (basic math symbols)
                    'Sc',  # Currency_Symbol
                }

                # Keep allowed characters and common whitespace
                if category in allowed_categories or char in '\n\r\t':
                    cleaned_chars.append(char)
                else:
                    # Log unexpected characters for monitoring (not security per ipsec.pl)
                    # "input validation should not be used to prevent XSS or SQLi"
                    self.logger.debug(f"Filtered Unicode character: {repr(char)} (category: {category})")

            text = ''.join(cleaned_chars)

            # Step 4: Remove other problematic control characters but preserve useful ones
            # Keep newlines (0x0A), carriage returns (0x0D), and tabs (0x09)
            text = re.sub(r'[\x01-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]', '', text)

            # Step 5: Normalize Unicode characters to prevent encoding issues
            # Reference: https://ipsec.pl/input-validation-of-free-form-unicode-text-in-python.html
            # Unicode normalization prevents issues with combining characters and homoglyphs
            try:
                # Normalize to NFC form (canonical decomposition, then canonical composition)
                text = unicodedata.normalize('NFC', text)
            except Exception as e:
                self.logger.warning(f"Unicode normalization failed: {e}")
                # Continue with original text if normalization fails

            # Step 6: Clean whitespace and line breaks
            # Split into lines for processing
            lines = text.split('\n')
            cleaned_lines = []

            for line in lines:
                # Remove leading/trailing whitespace
                line = line.strip()

                # Replace multiple consecutive spaces with single space
                line = re.sub(r' +', ' ', line)

                # Skip empty lines but preserve intentional line breaks
                if line:
                    cleaned_lines.append(line)

            # Step 7: Rejoin lines with consistent line breaks
            cleaned_text = '\n'.join(cleaned_lines)

            # Step 8: Final validation and safety checks
            # Ensure the text is valid UTF-8 and doesn't contain problematic sequences
            try:
                # Test encoding/decoding to catch any remaining issues
                cleaned_text.encode('utf-8').decode('utf-8')
            except UnicodeError as e:
                self.logger.warning(f"Text contains invalid UTF-8 sequences: {e}")
                # Replace invalid sequences with empty string as last resort
                cleaned_text = cleaned_text.encode('utf-8', errors='ignore').decode('utf-8')

            # Step 9: Length validation
            # Reference: OWASP Input Validation Cheatsheet (cited in ipsec.pl)
            # "define a maximum length for the input field"
            max_length = 10_000_000  # 10MB text limit for safety
            if len(cleaned_text) > max_length:
                self.logger.warning(f"Text too large ({len(cleaned_text)} chars), truncating")
                cleaned_text = cleaned_text[:max_length] + "... [TRUNCATED]"

            return cleaned_text

        except Exception as e:
            self.logger.error(f"Text cleaning failed: {e}")
            # Emergency fallback: basic null byte removal only
            # Reference: https://www.educative.io/answers/how-to-sanitize-user-input-in-python
            return re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]', '', text) if text else ""

    def _chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split text into overlapping chunks."""
        if not text or chunk_size <= 0:
            return []

        words = text.split()
        if len(words) <= chunk_size:
            return [text]

        chunks = []
        start = 0

        while start < len(words):
            end = min(start + chunk_size, len(words))
            chunk = ' '.join(words[start:end])
            chunks.append(chunk)

            # Move start position with overlap
            if end == len(words):
                break
            start = end - overlap
            if start <= 0:
                start = end

        return chunks

    @abstractmethod
    async def extract(self, file_path: Union[str, Path]) -> ExtractedContent:
        """
        Extract content from the document.

        Args:
            file_path: Path to the document file

        Returns:
            ExtractedContent object with text and metadata

        Raises:
            ExtractionError: If extraction fails
        """
        pass

    async def extract_with_validation(self, file_path: Union[str, Path]) -> ExtractedContent:
        """
        Extract content with validation and error handling.

        Args:
            file_path: Path to the document file

        Returns:
            ExtractedContent object

        Raises:
            ValueError: If file cannot be processed
            ExtractionError: If extraction fails
        """
        file_path = Path(file_path)

        # Validate file exists
        if not file_path.exists():
            raise ValueError(f"File does not exist: {file_path}")

        # Validate file is readable
        if not file_path.is_file():
            raise ValueError(f"Path is not a file: {file_path}")

        # Check if we can handle this file
        if not self.can_extract(file_path):
            raise ValueError(
                f"Extractor {self.name} cannot handle file: {file_path} "
                f"(supported formats: {self.supported_formats})"
            )

        # Log extraction start
        self.logger.info(
            "Starting extraction",
            extractor=self.name,
            file=file_path.name,
            size=file_path.stat().st_size
        )

        try:
            # Perform extraction
            result = await self.extract(file_path)

            # Validate result
            if not result.text:
                self.logger.warning(
                    "No text extracted",
                    extractor=self.name,
                    file=file_path.name
                )

            # Log success
            self.logger.info(
                "Extraction completed",
                extractor=self.name,
                file=file_path.name,
                text_length=len(result.text),
                chunk_count=len(result.chunks) if result.chunks else 0
            )

            return result

        except Exception as e:
            self.logger.error(
                "Extraction failed",
                extractor=self.name,
                file=file_path.name,
                error=str(e),
                exc_info=True
            )
            raise ExtractionError(f"Failed to extract from {file_path}: {str(e)}") from e


class ExtractionError(Exception):
    """Exception raised when document extraction fails."""
    pass


class UnsupportedFormatError(ExtractionError):
    """Exception raised when document format is not supported."""
    pass
