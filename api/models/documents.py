"""
Document database models for production-ready persistence.
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import Column, String, Integer, DateTime, Text, JSON, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from api.database import Base


class Document(Base):
    """Document model for storing uploaded documents and their metadata."""

    __tablename__ = "documents"

    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Basic document info
    filename = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False)
    size = Column(Integer, nullable=False)  # File size in bytes

    # Processing status
    status = Column(String(50), nullable=False, default="processing")  # processing, completed, failed
    upload_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    # User relationship
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Content and statistics
    page_count = Column(Integer, nullable=True)
    word_count = Column(Integer, nullable=True)
    text_length = Column(Integer, nullable=True)
    extraction_method = Column(String(100), nullable=True)

    # Metadata and tags
    tags = Column(JSON, nullable=False, default=list)  # List of strings
    summary = Column(Text, nullable=True)

    # File storage
    file_path = Column(String(500), nullable=True)  # Path to stored file

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    processing_jobs = relationship("ProcessingJob", back_populates="document", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        """Convert document to dictionary for API responses."""
        return {
            "id": self.id,
            "filename": self.filename,
            "title": self.title,
            "size": self.size,
            "content_type": self.content_type,
            "status": self.status,
            "tags": self.tags or [],
            "upload_date": self.upload_date.isoformat() + "Z" if self.upload_date else None,
            "processed_at": self.processed_at.isoformat() + "Z" if self.processed_at else None,
            "user_id": self.user_id,
            "page_count": self.page_count,
            "word_count": self.word_count,
        }


class DocumentChunk(Base):
    """Document chunks for vector storage and retrieval."""

    __tablename__ = "document_chunks"

    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Document relationship
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)

    # Chunk content
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)  # Order within document
    page_number = Column(Integer, nullable=True)

    # Vector embedding (stored as JSON array)
    embedding = Column(JSON, nullable=True)  # List of floats

    # Metadata
    chunk_metadata = Column(JSON, nullable=True)  # Additional chunk metadata

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    document = relationship("Document", back_populates="chunks")


class ProcessingJob(Base):
    """Track document processing jobs for monitoring and debugging."""

    __tablename__ = "processing_jobs"

    # Primary key
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Document relationship
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)

    # Job info
    celery_task_id = Column(String(255), nullable=False, unique=True)
    status = Column(String(50), nullable=False, default="pending")  # pending, running, completed, failed

    # Processing details
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

    # Processing results
    stats = Column(JSON, nullable=True)  # Processing statistics

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    document = relationship("Document", back_populates="processing_jobs")
