"""
PDF EXTRACTOR - Production Grade
==============================
"""

import io
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Union, Tuple

import structlog

# Optional dependencies with graceful fallbacks
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    import PyPDF2
except ImportError:
    PyPDF2 = None

try:
    import pytesseract
    from PIL import Image
    import cv2
    import numpy as np
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

from .base import BaseExtractor, ExtractedContent, DocumentMetadata, ExtractionError

logger = structlog.get_logger(__name__)


class PDFExtractor(BaseExtractor):
    """Production-grade PDF text extractor with multiple extraction methods."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize PDF extractor with production configuration."""
        super().__init__(config or {})

        # Production configuration
        self.use_ocr = self.config.get("use_ocr", False)
        self.ocr_threshold = self.config.get("ocr_threshold", 0.8)
        self.extract_images = self.config.get("extract_images", False)
        self.extract_tables = self.config.get("extract_tables", True)
        self.preferred_method = self.config.get("preferred_method", "auto")
        self.chunk_size = self.config.get("chunk_size", 1000)
        self.chunk_overlap = self.config.get("chunk_overlap", 200)

        # Initialize available methods
        self.available_methods = []
        if fitz:
            self.available_methods.append("pymupdf")
        if pdfplumber:
            self.available_methods.append("pdfplumber")
        if PyPDF2:
            self.available_methods.append("pypdf2")

        if not self.available_methods:
            raise ExtractionError("No PDF extraction libraries available")

        # Validate OCR at runtime (not import time)
        if self.use_ocr:
            ocr_available = self._check_ocr_availability()
            if not ocr_available:
                logger.warning("OCR requested but dependencies not available, disabling OCR")
                self.use_ocr = False
            else:
                logger.info("OCR dependencies verified and enabled")

    @property
    def supported_formats(self) -> List[str]:
        return ["pdf"]

    @property
    def name(self) -> str:
        return "pdf_extractor"

    def _is_supported_mime_type(self, mime_type: str) -> bool:
        return mime_type == "application/pdf"

    def extract(self, file_path: Union[str, Path]) -> ExtractedContent:
        """Extract text from PDF with comprehensive error handling."""
        file_path = Path(file_path)

        # Initialize all variables to prevent scope issues
        text = ""
        tables = []
        images = []
        extraction_method = "unknown"
        page_info = {
            "page_count": 0,
            "title": None,
            "author": None,
            "subject": None
        }

        try:
            logger.info("Starting PDF extraction", file=file_path.name)

            # Create base metadata
            metadata = self._create_metadata(file_path)

            # Choose extraction method
            method = self._choose_extraction_method()

            # Execute extraction
            if method == "pymupdf" and fitz:
                text, tables, images, page_info = self._extract_with_pymupdf(file_path)
                extraction_method = "PyMuPDF"
            elif method == "pdfplumber" and pdfplumber:
                text, tables, page_info = self._extract_with_pdfplumber(file_path)
                extraction_method = "pdfplumber"
            elif method == "pypdf2" and PyPDF2:
                text, page_info = self._extract_with_pypdf2(file_path)
                extraction_method = "PyPDF2"
            else:
                raise ExtractionError(f"Extraction method {method} not available")

            # Safely update metadata
            if page_info:
                metadata.page_count = page_info.get("page_count", 0)
                metadata.title = page_info.get("title")
                metadata.author = page_info.get("author")
                metadata.subject = page_info.get("subject")

            # OCR enhancement if needed
            if self.use_ocr and self._should_use_ocr(text):
                logger.info("Enhancing with OCR")
                ocr_text = self._extract_with_ocr(file_path)
                if len(ocr_text) > len(text):
                    text = ocr_text
                    extraction_method += " + OCR"

            # Clean and process text
            text = self._clean_text(text)
            metadata.word_count = self._count_words(text)

            # Generate chunks
            chunks = self._chunk_text(text, self.chunk_size, self.chunk_overlap)

            logger.info(
                "PDF extraction completed",
                file=file_path.name,
                method=extraction_method,
                pages=metadata.page_count,
                words=metadata.word_count
            )

            return ExtractedContent(
                text=text,
                metadata=metadata,
                chunks=chunks,
                images=images if self.extract_images else None,
                tables=tables if self.extract_tables else None,
                extraction_method=extraction_method
            )

        except Exception as e:
            logger.error("PDF extraction failed", file=file_path.name, error=str(e))
            raise ExtractionError(f"Failed to extract from {file_path.name}: {str(e)}") from e

    def _choose_extraction_method(self) -> str:
        """Choose the optimal extraction method."""
        if self.preferred_method != "auto":
            return self.preferred_method

        if "pymupdf" in self.available_methods:
            return "pymupdf"
        elif "pdfplumber" in self.available_methods:
            return "pdfplumber"
        else:
            return "pypdf2"

    def _extract_with_pymupdf(self, file_path: Path) -> Tuple[str, List[Dict], List[Dict], Dict[str, Any]]:
        """Extract using PyMuPDF with comprehensive error handling."""
        doc = None
        try:
            doc = fitz.open(str(file_path))
            text_parts = []
            tables = []
            images = []

            for page_num in range(doc.page_count):
                try:
                    page = doc[page_num]

                    # Extract text
                    page_text = page.get_text()
                    if page_text and page_text.strip():
                        text_parts.append(page_text)

                    # Extract tables if enabled
                    if self.extract_tables:
                        try:
                            tabs = page.find_tables()
                            for tab in tabs:
                                table_data = tab.extract()
                                if table_data:
                                    tables.append({
                                        "page": page_num + 1,
                                        "data": table_data
                                    })
                        except Exception as e:
                            logger.warning("Table extraction failed", page=page_num + 1, error=str(e))

                    # Extract images if enabled
                    if self.extract_images:
                        try:
                            image_list = page.get_images()
                            for img_index, img in enumerate(image_list):
                                xref = img[0]
                                pix = fitz.Pixmap(doc, xref)
                                if pix.n < 5:  # GRAY or RGB
                                    img_data = pix.tobytes("png")
                                    images.append({
                                        "page": page_num + 1,
                                        "data": img_data
                                    })
                                if pix:
                                    pix = None
                        except Exception as e:
                            logger.warning("Image extraction failed", page=page_num + 1, error=str(e))

                except Exception as e:
                    logger.warning("Page processing failed", page=page_num + 1, error=str(e))
                    continue

            # Get document metadata safely
            page_info = {
                "page_count": doc.page_count,
                "title": None,
                "author": None,
                "subject": None
            }

            try:
                if hasattr(doc, 'metadata') and doc.metadata:
                    metadata = doc.metadata
                    page_info.update({
                        "title": metadata.get("title"),
                        "author": metadata.get("author"),
                        "subject": metadata.get("subject")
                    })
            except Exception as e:
                logger.warning("Metadata extraction failed", error=str(e))

            text = "\n".join(text_parts) if text_parts else ""
            return text, tables, images, page_info

        finally:
            if doc:
                doc.close()

    def _extract_with_pdfplumber(self, file_path: Path) -> Tuple[str, List[Dict], Dict[str, Any]]:
        """Extract using pdfplumber with error handling."""
        try:
            with pdfplumber.open(str(file_path)) as pdf:
                text_parts = []
                tables = []

                for page_num, page in enumerate(pdf.pages):
                    try:
                        # Extract text
                        page_text = page.extract_text()
                        if page_text and page_text.strip():
                            text_parts.append(page_text)

                        # Extract tables if enabled
                        if self.extract_tables:
                            try:
                                page_tables = page.extract_tables()
                                if page_tables:
                                    for table in page_tables:
                                        if table:
                                            tables.append({
                                                "page": page_num + 1,
                                                "data": table
                                            })
                            except Exception as e:
                                logger.warning("Table extraction failed", page=page_num + 1, error=str(e))

                    except Exception as e:
                        logger.warning("Page processing failed", page=page_num + 1, error=str(e))
                        continue

                # Get document info safely
                page_info = {
                    "page_count": len(pdf.pages),
                    "title": None,
                    "author": None,
                    "subject": None
                }

                try:
                    if hasattr(pdf, 'metadata') and pdf.metadata:
                        page_info.update({
                            "title": getattr(pdf.metadata, "title", None),
                            "author": getattr(pdf.metadata, "author", None),
                            "subject": getattr(pdf.metadata, "subject", None)
                        })
                except Exception as e:
                    logger.warning("Metadata extraction failed", error=str(e))

                text = "\n".join(text_parts) if text_parts else ""
                return text, tables, page_info

        except Exception as e:
            raise ExtractionError(f"pdfplumber extraction failed: {str(e)}") from e

    def _extract_with_pypdf2(self, file_path: Path) -> Tuple[str, Dict[str, Any]]:
        """Extract using PyPDF2 with error handling."""
        try:
            with open(file_path, "rb") as file:
                reader = PyPDF2.PdfReader(file)
                text_parts = []

                for page_num, page in enumerate(reader.pages):
                    try:
                        page_text = page.extract_text()
                        if page_text and page_text.strip():
                            text_parts.append(page_text)
                    except Exception as e:
                        logger.warning("Page processing failed", page=page_num + 1, error=str(e))
                        continue

                # Get document info safely
                page_info = {
                    "page_count": len(reader.pages),
                    "title": None,
                    "author": None,
                    "subject": None
                }

                try:
                    if hasattr(reader, 'metadata') and reader.metadata:
                        metadata = reader.metadata
                        page_info.update({
                            "title": metadata.get("/Title"),
                            "author": metadata.get("/Author"),
                            "subject": metadata.get("/Subject")
                        })
                except Exception as e:
                    logger.warning("Metadata extraction failed", error=str(e))

                text = "\n".join(text_parts) if text_parts else ""
                return text, page_info

        except Exception as e:
            raise ExtractionError(f"PyPDF2 extraction failed: {str(e)}") from e

    def _should_use_ocr(self, text: str) -> bool:
        """Determine if OCR enhancement is needed."""
        if not text or len(text.strip()) < 100:
            return True

        # Check text quality
        text_chars = sum(1 for c in text if c.isalnum() or c.isspace())
        total_chars = len(text)

        if total_chars > 0:
            text_ratio = text_chars / total_chars
            return text_ratio < self.ocr_threshold

        return False

    def _extract_with_ocr(self, file_path: Path) -> str:
        """Extract text using OCR."""
        if not OCR_AVAILABLE:
            raise ExtractionError("OCR dependencies not available")

        doc = None
        try:
            doc = fitz.open(str(file_path))
            text_parts = []

            for page_num in range(doc.page_count):
                try:
                    page = doc[page_num]

                    # Convert page to high-resolution image
                    mat = fitz.Matrix(2, 2)
                    pix = page.get_pixmap(matrix=mat)
                    img_data = pix.tobytes("png")

                    # Process with OCR
                    img = Image.open(io.BytesIO(img_data))
                    img_array = np.array(img)

                    if len(img_array.shape) == 3:
                        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)

                    # Enhance image for OCR
                    img_array = cv2.threshold(img_array, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]

                    # Extract text with OCR
                    page_text = pytesseract.image_to_string(
                        img_array,
                        config='--psm 1 --oem 3'
                    )

                    if page_text and page_text.strip():
                        text_parts.append(page_text)

                except Exception as e:
                    logger.warning("OCR page failed", page=page_num + 1, error=str(e))
                    continue

            return "\n".join(text_parts) if text_parts else ""

        finally:
            if doc:
                doc.close()

    def _check_ocr_availability(self) -> bool:
        """Check OCR availability at runtime."""
        try:
            import pytesseract
            from PIL import Image
            import cv2
            import numpy as np

            # Test basic functionality
            pytesseract.get_tesseract_version()
            logger.info("✅ OCR dependencies confirmed available at runtime")
            return True
        except Exception as e:
            logger.warning(f"❌ OCR dependencies not available: {e}")
            return False
