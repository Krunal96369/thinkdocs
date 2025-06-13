#!/usr/bin/env python3
"""
Database initialization script for ThinkDocs.

This script creates the database schema and enables proper persistence,
replacing the MOCK_DOCUMENTS storage with real PostgreSQL database.

Run this script to set up your database:
    python initialize_database.py

Based on PostgreSQL best practices from:
https://www.timescale.com/learn/data-modeling-on-postgresql
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from api.database import init_database, create_tables, check_database_connection
from api.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def initialize_thinkdocs_database():
    """
    Initialize ThinkDocs database with production-ready schema.

    This replaces the MOCK_DOCUMENTS = [] with real PostgreSQL persistence.
    """
    logger.info("🚀 ThinkDocs Database Initialization")
    logger.info("=" * 50)

    try:
        # Step 1: Initialize database connection
        logger.info("📡 Step 1: Initializing database connection...")
        await init_database()

        # Step 2: Check connection before proceeding
        logger.info("🔍 Step 2: Checking database connection...")
        connection_ok, message = await check_database_connection()

        if not connection_ok and "Missing database tables" not in message:
            logger.error(f"❌ Database connection failed: {message}")
            logger.error("🔧 Please check your database configuration:")
            logger.error(f"   Database URL: {settings.database.database_url.split('@')[0]}@...")
            return False

        # Step 3: Create database schema
        logger.info("🔧 Step 3: Creating database schema...")
        tables_created = await create_tables()

        if not tables_created:
            logger.error("❌ Failed to create database tables")
            return False

        # Step 4: Verify final setup
        logger.info("✅ Step 4: Verifying database setup...")
        final_check, final_message = await check_database_connection()

        if final_check:
            logger.info("🎉 Database initialization completed successfully!")
            logger.info("=" * 50)
            logger.info("✅ MOCK_DOCUMENTS storage has been replaced with PostgreSQL")
            logger.info("✅ Document uploads will now persist across container restarts")
            logger.info("✅ User data will be stored in the database")
            logger.info("✅ Document processing jobs will be tracked")
            logger.info("✅ Vector embeddings will be stored for search")
            logger.info("=" * 50)
            return True
        else:
            logger.error(f"❌ Final verification failed: {final_message}")
            return False

    except Exception as e:
        logger.error(f"💥 Database initialization failed: {e}")
        return False


async def check_current_status():
    """Check the current database status."""
    logger.info("🔍 Checking current database status...")

    try:
        await init_database()

        connection_ok, message = await check_database_connection()

        if connection_ok:
            logger.info("✅ Database is properly configured and ready")
            logger.info("📊 All required tables exist")
            logger.info("🎯 Mock storage replacement: COMPLETED")
            return True
        else:
            logger.warning(f"⚠️ Database issues detected: {message}")
            logger.info("🔧 Run initialization to fix these issues")
            return False

    except Exception as e:
        logger.error(f"❌ Status check failed: {e}")
        return False


def main():
    """Main script entry point."""
    if len(sys.argv) > 1 and sys.argv[1] == "check":
        # Just check status
        logger.info("ThinkDocs Database Status Check")
        logger.info("=" * 40)

        asyncio.run(check_current_status())

    else:
        # Full initialization
        logger.info("ThinkDocs Database Initialization")
        logger.info("This will create the PostgreSQL schema and replace mock storage")
        logger.info("=" * 60)

        success = asyncio.run(initialize_thinkdocs_database())

        if success:
            logger.info("🚀 Next Steps:")
            logger.info("   1. Restart your containers: docker-compose restart api celery-worker")
            logger.info("   2. Upload a document to test the persistent storage")
            logger.info("   3. Check that documents persist after container restart")
            sys.exit(0)
        else:
            logger.error("💥 Initialization failed. Please check the errors above.")
            sys.exit(1)


if __name__ == "__main__":
    main()
