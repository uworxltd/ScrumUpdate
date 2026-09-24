FROM python:3.12-slim

# Set working directory
WORKDIR /app


# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*


# Copy requirements and install Python dependencies
COPY requirements.txt . 
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# (Celery worker has no HTTP server).
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD ["python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/api/system/ping', timeout=3).getcode()==200 else 1)"]

# Default command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]