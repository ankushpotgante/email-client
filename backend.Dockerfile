FROM python:3.11-slim

WORKDIR /app

# Install basic system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend app folder
COPY api/ ./api/

EXPOSE 8000

# Set environment path to resolve api module imports
ENV PYTHONPATH=/app
ENV PORT=8000

CMD ["uvicorn", "api.index:app", "--host", "0.0.0.0", "--port", "8000"]
