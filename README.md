# 🧠 ThinkDocs - AI-Powered Intelligent Document Assistant

## 🎯 Overview

ThinkDocs is a full-stack AI system that transforms unstructured documents (PDFs, emails, reports) into intelligent, queryable knowledge bases. Using advanced RAG (Retrieval-Augmented Generation) architecture, it provides natural language querying capabilities with **free deployment options** and **production-grade architecture**.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │────│   FastAPI       │────│   ChromaDB      │
│   (React +      │    │   Backend       │    │   Vector DB     │
│   Tailwind)     │    │                 │    │   (Default)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                         │
                              │                         │
                       ┌─────────────────┐    ┌─────────────────┐
                       │   LLM Service   │    │   Document      │
                       │   (OpenAI/Local)│    │   Processing    │
                       │                 │    │   Pipeline      │
                       └─────────────────┘    └─────────────────┘
```

## 🚀 Key Features

- **Multi-format Document Processing**: PDF, DOCX, TXT, HTML, emails
- **Intelligent Summarization**: Key insights extraction and executive summaries
- **Natural Language Querying**: Conversational interface with context awareness
- **Semantic Search**: Vector-based similarity search with ChromaDB
- **Real-time Chat Interface**: WebSocket-powered responsive UI
- **MLOps Pipeline**: Automated training, evaluation, and deployment
- **Monitoring & Analytics**: Performance tracking and usage insights
- **🆓 Free Deployment Options**: No-cost deployment with free tier services

## 🛠️ Tech Stack

### Backend & AI

- **LLM**: OpenAI API (free tier) or Local Mistral 7B
- **Embeddings**: Sentence-Transformers (all-MiniLM-L6-v2)
- **Vector DB**: ChromaDB (default, free) or Weaviate (production)
- **API Framework**: FastAPI (async, auto-docs, type hints)
- **Task Queue**: Celery + Redis (async document processing)

### Frontend

- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui components
- **State Management**: Zustand (lightweight, modern)
- **Real-time**: Socket.io client

### Infrastructure & MLOps

- **Containerization**: Docker + Docker Compose
- **Cloud**: AWS, DigitalOcean, or Railway (free tiers available)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana (self-hosted)
- **Database**: PostgreSQL
- **Cache**: Redis

## 📁 Project Structure

```
thinkdocs/
├── data_pipeline/           # ETL and preprocessing
│   ├── extractors/         # Document parsers (PDF, DOCX, etc.)
│   ├── processors/         # Text cleaning, chunking
│   └── airflow_dags/       # Orchestration workflows
├── model/                  # AI/ML components
│   ├── embeddings/         # Sentence transformer models
│   ├── llm/               # Language model integration
│   └── rag/               # Retrieval-augmented generation
├── api/                    # FastAPI backend
│   ├── routers/           # API endpoints
│   ├── services/          # Business logic
│   └── models/            # Pydantic schemas
├── ui/                     # React frontend
│   ├── src/components/    # Reusable UI components
│   ├── src/pages/         # Route components
│   └── src/hooks/         # Custom React hooks
├── mlops/                  # DevOps and deployment
│   ├── docker/            # Container definitions
│   ├── aws/               # Cloud infrastructure
│   └── monitoring/        # Observability configs
├── notebooks/              # Research and experimentation
├── tests/                  # Automated testing
└── docs/                   # Documentation
```

## 🔧 Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- Git

### Quick Start

```bash
# Clone and setup
git clone <repo-url>
cd thinkdocs
make setup

# Start development environment
make dev-up

# Access services
# Frontend: http://localhost:3000
# API: http://localhost:8000/docs
# ChromaDB: http://localhost:8001
# Monitoring: http://localhost:3001
```

## 📊 Performance Targets

| Metric                  | Target                         | Monitoring             |
| ----------------------- | ------------------------------ | ---------------------- |
| **API Response Time**   | < 200ms (95th percentile)      | Prometheus + Grafana   |
| **Document Processing** | < 30s for 100-page PDF         | Custom metrics         |
| **Query Accuracy**      | > 85% on domain Q&A            | ML validation pipeline |
| **System Uptime**       | 99.9% availability (free tier) | Uptime monitoring      |
| **Concurrent Users**    | 100+ simultaneous (free tier)  | Load testing           |

## 🧪 Testing Strategy

- **Unit Tests**: 90%+ coverage (pytest)
- **Integration Tests**: API contract testing
- **E2E Tests**: Playwright for UI workflows
- **Load Tests**: k6 for performance validation
- **Model Tests**: Accuracy benchmarks

## 📈 Roadmap

### Phase 1: Core MVP ✅

- [x] Document processing pipeline
- [x] Simple React UI
- [x] API endpoints
- [x] ChromaDB integration
- [ ] Basic RAG implementation

### Phase 2: Production Ready 🔄

- [ ] Advanced UI with real-time chat
- [ ] Self-hosted monitoring and observability
- [ ] Cloud deployment (AWS/Railway)
- [ ] Performance optimization
- [ ] Security implementation

### Phase 3: Advanced Features 📋

- [x] OCR for scanned documents
- [ ] Voice input (Whisper integration)
- [ ] Active learning loop
- [ ] Enterprise integrations

## 🚀 Alternative Configurations

### Use Weaviate (Production)

```bash
make weaviate  # Start with Weaviate instead of ChromaDB
```

### Add Jupyter Notebooks

```bash
make jupyter  # Include Jupyter for experimentation
```

### Free Resources Guide

```bash
make free-resources  # Show all available free services
```

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and coding standards.


## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

## ⭐ **Get Started Now**

1. **Clone the repository**: `git clone <repo-url>`
2. **Run setup**: `make setup`
3. **Start development**: `make dev-up`
4. **Open your browser**: http://localhost:3000

