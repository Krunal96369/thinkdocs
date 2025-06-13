# Contributing to ThinkDocs

Thank you for your interest in contributing to ThinkDocs! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/Krunal96369/thinkdocs.git
   cd thinkdocs
   ```
3. **Set up the development environment**:
   ```bash
   make setup
   make dev-up
   ```

## 🔧 Development Workflow

### Making Changes

1. **Create a feature branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Test your changes**:

   ```bash
   make test
   make lint
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

### Commit Message Format

We follow conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (no logic changes)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## 🎯 Areas for Contribution

### 🐛 Bug Reports

- Use the issue template
- Include reproduction steps
- Provide system information

### ✨ Feature Requests

- Describe the problem you're solving
- Propose a solution
- Consider backward compatibility

### 📝 Documentation

- Improve README clarity
- Add code examples
- Update installation guides

### 🧪 Testing

- Write unit tests
- Add integration tests
- Improve test coverage

### 🎨 UI/UX Improvements

- Enhance user interface
- Improve accessibility
- Mobile responsiveness

## 📋 Code Standards

### Python (Backend)

- Follow PEP 8
- Use type hints
- Write docstrings for functions
- Keep functions small and focused

### TypeScript/React (Frontend)

- Use functional components with hooks
- Follow React best practices
- Write self-documenting code
- Use proper TypeScript types

### Documentation

- Update README for new features
- Add inline comments for complex logic
- Update API documentation

## 🧪 Testing Guidelines

### Running Tests

```bash
# Backend tests
cd api && pytest

# Frontend tests
cd ui && npm test

# Integration tests
make test-integration
```

### Writing Tests

- Write tests for new features
- Ensure edge cases are covered
- Mock external dependencies
- Keep tests fast and reliable

## 🚀 Deployment

### Local Development

```bash
make dev-up    # Start development environment
make dev-down  # Stop development environment
```

### Production Testing

```bash
make build     # Build production images
make up        # Start production environment
```

## 📞 Getting Help

- **Discord**: Join our community server
- **Issues**: Create a GitHub issue
- **Email**: team@thinkdocs.ai

## 📜 License

By contributing to ThinkDocs, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to ThinkDocs! 🎉
