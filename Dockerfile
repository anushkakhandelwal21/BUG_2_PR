FROM python:3.11-slim

# Install pytest and common test dependencies
RUN pip install --no-cache-dir pytest pytest-cov

WORKDIR /repo

# Default command: run pytest
CMD ["python", "-m", "pytest", "-v"]
