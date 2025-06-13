# ThinkDocs - Development Commands

.PHONY: help setup dev-up dev-down test lint format clean install-deps

# Default target
help:
	@echo "ThinkDocs Development Commands:"
	@echo ""
	@echo "🚀 Quick Start:"
	@echo "  dev-up       - Start development environment (ChromaDB, free services)"
	@echo "  dev-down     - Stop development environment"
	@echo ""
	@echo "🔧 Development:"
	@echo "  setup        - Initial project setup"
	@echo "  install-deps - Install all dependencies"
	@echo ""
	@echo "🧪 Testing & Quality:"
	@echo "  test         - Run all tests"
	@echo "  lint         - Run linting checks"
	@echo "  format       - Format code"
	@echo ""
	@echo "🧹 Maintenance:"
	@echo "  clean        - Clean temporary files"
	@echo "  reset        - Reset entire environment"
	@echo ""
	@echo "📚 Documentation:"
	@echo "  docs         - Generate documentation"

# Initial setup
setup: install-deps
	@echo "🔧 Setting up ThinkDocs development environment..."
	@if [ ! -f .env ]; then \
		echo "📋 Creating environment file..."; \
		cp .env.example .env; \
		echo "✏️  Please edit .env file with your API keys"; \
	fi
	@echo "🐳 Pulling Docker images..."
	docker-compose pull
	@echo "📁 Creating storage directories..."
	mkdir -p storage/documents storage/models storage/chromadb
	@echo ""
	@echo "✅ Setup complete! Next steps:"
	@echo "  1. Edit .env file (add your OpenAI API key)"
	@echo "  2. Run 'make dev-up' to start the environment"
	@echo "  3. Visit http://localhost:3000 to use ThinkDocs"

# Install dependencies
install-deps:
	@echo "📦 Installing Python dependencies..."
	@echo "Installing core dependencies first..."
	@if command -v pip3 >/dev/null 2>&1; then \
		pip3 install -e "."; \
	else \
		pip install -e "."; \
	fi
	@echo "Installing development dependencies..."
	@if command -v pip3 >/dev/null 2>&1; then \
		pip3 install -e ".[dev]" || echo "⚠️  Some dev dependencies failed, continuing..."; \
	else \
		pip install -e ".[dev]" || echo "⚠️  Some dev dependencies failed, continuing..."; \
	fi
	@echo "📦 Installing Node.js dependencies..."
	@if [ -d "ui" ]; then \
		cd ui && npm install; \
	else \
		echo "⚠️  UI directory not found, skipping frontend dependencies"; \
	fi
	@echo "✅ Dependencies installed!"

install-student:
	@echo "📦 Installing student dependencies..."
	@if command -v pip3 >/dev/null 2>&1; then \
		pip3 install -e ".[student]" || echo "⚠️  Some student dependencies failed, continuing..."; \
	else \
		pip install -e ".[student]" || echo "⚠️  Some student dependencies failed, continuing..."; \
	fi
	@echo "✅ Student dependencies installed!"

# Development environment
dev-up:
	@echo "🚀 Starting ThinkDocs development environment..."
	@echo "Using ChromaDB (free) by default"
	docker-compose up -d
	@echo ""
	@echo "✅ Development environment started successfully!"
	@echo ""
	@echo "🌐 Access your services:"
	@echo "  Frontend:    http://localhost:3000"
	@echo "  API:         http://localhost:8000"
	@echo "  API Docs:    http://localhost:8000/docs"
	@echo "  ChromaDB:    http://localhost:8001"
	@echo "  Monitoring:  http://localhost:3001 (admin/thinkdocs)"
	@echo "  Task Queue:  http://localhost:5555"
	@echo ""
	@echo "💡 First time? Run: make demo-data"

dev-down:
	@echo "🛑 Stopping ThinkDocs development environment..."
	docker-compose down
	@echo "✅ Development environment stopped"

# Testing
test:
	@echo "🧪 Running tests..."
	@echo "Unit tests..."
	pytest tests/ -v --cov=api --cov=model --cov=data_pipeline -m "not slow"
	@if [ -d "ui" ]; then \
		echo "Frontend tests..."; \
		cd ui && npm test -- --coverage --watchAll=false; \
	fi
	@echo "✅ All tests completed!"

test-full:
	@echo "🧪 Running all tests (including slow tests)..."
	pytest tests/ -v --cov=api --cov=model --cov=data_pipeline
	@if [ -d "ui" ]; then \
		cd ui && npm test -- --coverage --watchAll=false; \
	fi

# Code quality
lint:
	@echo "🔍 Running linting..."
	@echo "Python linting..."
	flake8 api/ model/ data_pipeline/ --max-line-length=88 --extend-ignore=E203,W503
	black --check api/ model/ data_pipeline/
	mypy api/ model/ data_pipeline/ --ignore-missing-imports
	@if [ -d "ui" ]; then \
		echo "Frontend linting..."; \
		cd ui && npm run lint; \
	fi
	@echo "✅ Linting completed!"

format:
	@echo "🎨 Formatting code..."
	black api/ model/ data_pipeline/
	isort api/ model/ data_pipeline/
	@if [ -d "ui" ]; then \
		echo "Formatting frontend..."; \
		cd ui && npm run format; \
	fi
	@echo "✅ Code formatted!"

# Documentation
docs:
	@echo "📚 Generating documentation..."
	@echo "API documentation available at http://localhost:8000/docs when running"
	@if command -v mkdocs >/dev/null 2>&1; then \
		mkdocs serve; \
	else \
		echo "📖 Install mkdocs for documentation: pip install mkdocs mkdocs-material"; \
	fi

# Sample data for testing
demo-data:
	@echo "📄 Loading demo documents..."
	@echo "This will upload sample PDFs to test the system"
	python -m scripts.load_demo_data
	@echo "✅ Demo data loaded! Try asking questions about the documents."

# Cleanup
clean:
	@echo "🧹 Cleaning temporary files..."
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name ".coverage" -delete
	@if [ -d "ui" ]; then \
		cd ui && npm run clean 2>/dev/null || true; \
	fi
	docker system prune -f --volumes 2>/dev/null || true
	@echo "✅ Cleanup completed!"

# Reset everything (for troubleshooting)
reset: clean
	@echo "🔄 Resetting ThinkDocs environment..."
	docker-compose down -v --remove-orphans 2>/dev/null || true
	rm -rf storage/chromadb/* storage/documents/* 2>/dev/null || true
	@echo "✅ Environment reset! Run 'make setup' to start fresh."

# Database operations
db-reset:
	@echo "🗄️ Resetting database..."
	docker-compose exec postgres psql -U thinkdocs -d thinkdocs -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	python -m alembic upgrade head
	@echo "✅ Database reset completed!"

db-migrate:
	@echo "🗄️ Running database migrations..."
	python -m alembic upgrade head
	@echo "✅ Migrations completed!"

# Monitoring and logs
logs:
	@echo "📋 Showing application logs..."
	docker-compose logs -f --tail=50

logs-api:
	@echo "📋 Showing API logs..."
	docker-compose logs -f api

logs-db:
	@echo "📋 Showing database logs..."
	docker-compose logs -f postgres

# Health check
health:
	@echo "🏥 Checking service health..."
	@echo "API Health:"
	@curl -s http://localhost:8000/health || echo "❌ API not responding"
	@echo ""
	@echo "ChromaDB Health:"
	@curl -s http://localhost:8001/api/v1/heartbeat || echo "❌ ChromaDB not responding"
	@echo ""
	@echo "Frontend Health:"
	@curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend responding" || echo "❌ Frontend not responding"

# Alternative configurations
weaviate:
	@echo "🚀 Starting with Weaviate instead of ChromaDB..."
	docker-compose --profile weaviate up -d
	@echo "✅ Weaviate mode started! Access at http://localhost:8080"

jupyter:
	@echo "📓 Starting with Jupyter notebook..."
	docker-compose --profile jupyter up -d
	@echo "✅ Jupyter started! Access at http://localhost:8888 (token: thinkdocs)"

# Free deployment resources
free-resources:
	@echo "💰 Free Resources for ThinkDocs:"
	@echo ""
	@echo "🎓 Education Benefits:"
	@echo "  • GitHub Education Pack: https://education.github.com/pack"
	@echo "  • AWS Free Tier: https://aws.amazon.com/free"
	@echo "  • Google Cloud Education: https://cloud.google.com/edu"
	@echo ""
	@echo "🔧 Free Services:"
	@echo "  • OpenAI Free Credits: $5 for new accounts"
	@echo "  • ChromaDB: Free vector database"
	@echo "  • Railway: Free hosting (500 hours/month)"
	@echo "  • Vercel: Free frontend hosting"
	@echo ""
	@echo "📚 Documentation:"
	@echo "  • Student Deployment: docs/STUDENT_DEPLOYMENT.md"
	@echo "  • Production Guide: docs/PRODUCTION_READINESS.md"

# Phase 2 Development Commands
phase2-setup:
	@echo "🎯 Setting up Phase 2 development environment..."
	$(MAKE) setup
	$(MAKE) install-deps
	@echo "✅ Phase 2 setup complete!"

phase2-setup-minimal:
	@echo "🎯 Setting up minimal Phase 2 environment..."
	@echo "📋 Creating environment file..."
	@if [ ! -f .env ]; then \
		cp .env.example .env 2>/dev/null || echo "# ThinkDocs Environment" > .env; \
	fi
	@echo "📁 Creating storage directories..."
	mkdir -p storage/documents storage/models storage/chromadb
	@echo "📦 Installing minimal Python dependencies..."
	pip install fastapi uvicorn python-dotenv pydantic python-jose[cryptography] passlib[bcrypt] python-multipart websockets python-socketio
	@echo "📦 Installing Node.js dependencies..."
	cd ui && npm install
	@echo "✅ Minimal Phase 2 setup complete!"

phase2-dev:
	@echo "🚀 Starting Phase 2 development servers..."
	@echo "Starting backend on http://localhost:8000"
	@echo "Starting frontend on http://localhost:3000"
	@echo "WebSocket available at ws://localhost:8000/ws"
	$(MAKE) dev-up

phase2-test:
	@echo "🧪 Running Phase 2 tests..."
	$(MAKE) test

phase2-status:
	@echo "📊 Phase 2 Development Status:"
	@echo "✅ Week 5: Advanced Frontend & Real-time Features - COMPLETED"
	@echo "🔄 Week 6: Self-hosted Monitoring & Observability - NEXT"
	@echo "⏳ Week 7: AWS Free Tier Deployment - PENDING"
	@echo "⏳ Week 8: Performance Optimization & Security - PENDING"

# Frontend-specific commands
ui-install:
	@echo "📦 Installing frontend dependencies..."
	cd ui && npm install

ui-dev:
	@echo "🚀 Starting frontend development server..."
	cd ui && npm run dev

ui-build:
	@echo "🏗️  Building frontend for production..."
	cd ui && npm run build

ui-test:
	@echo "🧪 Running frontend tests..."
	cd ui && npm test

ui-lint:
	@echo "🔍 Linting frontend code..."
	cd ui && npm run lint

ui-lint-fix:
	@echo "🔧 Fixing frontend linting issues..."
	cd ui && npm run lint:fix
