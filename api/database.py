"""
Database configuration and connection management.
"""

import logging
import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

from api.config import settings

logger = logging.getLogger(__name__)

# Database engine and session
engine = None
async_session_maker = None
Base = declarative_base()


# Import models to register them with Base.metadata
try:
    from api.models.documents import Document, DocumentChunk, ProcessingJob
    from api.models.users import User
    logger.info("Database models imported successfully")
except ImportError as e:
    logger.warning(f"Could not import models: {e}")


async def init_database():
    """Initialize database engine and session maker."""
    global engine, async_session_maker

    if engine is None:
        try:
            # Use the properly configured database URL from settings
            database_url = settings.database.database_url

            logger.info(f"Connecting to database: {database_url.split('@')[0]}@...")

            # Create async engine
            # Only enable SQL logging if explicitly requested via environment variable
            sql_debug = os.getenv("SQL_DEBUG", "false").lower() == "true"
            engine = create_async_engine(
                database_url,
                echo=sql_debug,  # Controlled SQL logging (set SQL_DEBUG=true to enable)
                pool_pre_ping=True,
                pool_recycle=300,
            )

            # Create session maker
            async_session_maker = async_sessionmaker(
                engine,
                class_=AsyncSession,
                expire_on_commit=False
            )

            logger.info("Database initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            # For development, continue without database
            engine = None
            async_session_maker = None


async def create_tables():
    """
    Create database tables based on SQLAlchemy models.

    Following PostgreSQL best practices from:
    https://www.timescale.com/learn/data-modeling-on-postgresql

    - Uses normalized data structure
    - Implements proper indexing
    - Follows relational design principles
    """
    global engine

    if engine is None:
        logger.error("Database engine not initialized. Call init_database() first.")
        return False

    try:
        logger.info("🔧 Creating database tables...")

        # Create all tables defined in our models
        # This will:
        # 1. Create users table with proper indexes
        # 2. Create documents table with foreign key to users
        # 3. Create document_chunks table for vector storage
        # 4. Create processing_jobs table for monitoring
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        logger.info("✅ Database tables created successfully")

        # Log the tables that were created
        async with async_session_maker() as session:
            # Check if tables exist by trying to query them
            try:
                from sqlalchemy import text

                # Check PostgreSQL version and schema
                result = await session.execute(text("SELECT version()"))
                version = result.scalar()
                logger.info(f"📊 PostgreSQL Version: {version}")

                # List created tables
                result = await session.execute(text("""
                    SELECT tablename
                    FROM pg_tables
                    WHERE schemaname = 'public'
                    ORDER BY tablename
                """))
                tables = result.fetchall()

                table_names = [table[0] for table in tables]
                logger.info(f"📋 Created tables: {', '.join(table_names)}")

                # Verify our key tables exist
                expected_tables = ['users', 'documents', 'document_chunks', 'processing_jobs']
                missing_tables = [t for t in expected_tables if t not in table_names]

                if missing_tables:
                    logger.warning(f"⚠️ Missing expected tables: {', '.join(missing_tables)}")
                else:
                    logger.info("✅ All expected tables created successfully")

            except Exception as e:
                logger.warning(f"Could not verify table creation: {e}")

        return True

    except Exception as e:
        logger.error(f"❌ Failed to create database tables: {e}")
        return False


async def check_database_connection():
    """Check if database connection is working and tables exist."""
    if engine is None:
        return False, "Database engine not initialized"

    try:
        async with async_session_maker() as session:
            from sqlalchemy import text

            # Test basic connection
            result = await session.execute(text("SELECT 1"))
            if not result.scalar():
                return False, "Database connection test failed"

            # Check if our tables exist
            result = await session.execute(text("""
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name IN ('users', 'documents', 'document_chunks', 'processing_jobs')
            """))
            table_count = result.scalar()

            if table_count < 4:
                return False, f"Missing database tables (found {table_count}/4)"

            logger.info("✅ Database connection and schema verified")
            return True, "Database ready"

    except Exception as e:
        logger.error(f"Database check failed: {e}")
        return False, f"Database error: {str(e)}"


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session."""
    if async_session_maker is None:
        # If database is not available, return None to trigger fallback
        yield None
        return

    async with async_session_maker() as session:
        try:
            yield session
        except Exception as e:
            logger.error(f"Database session error: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()


async def close_db_connections():
    """Close database connections."""
    global engine

    if engine:
        await engine.dispose()
        logger.info("Database connections closed")
    else:
        logger.info("No database connections to close")
