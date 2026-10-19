FROM python:3.12-slim

# Install system dependencies: PostgreSQL client libs and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Set environment defaults
ENV PYTHONUNBUFFERED=1 \
    PORT=8000

# Collect static files during build
RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

# Run migrations and start Gunicorn WSGI server
CMD ["sh", "-c", "python manage.py migrate && gunicorn backend.wsgi:application --bind 0.0.0.0:${PORT:-8000} --worker-class gthread --workers 2 --threads 4 --timeout 60"]
