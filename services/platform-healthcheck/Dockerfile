FROM python:3.11-slim

WORKDIR /app
COPY main.py .

# Cloud Run injects $PORT; the app reads it directly (see main.py).
CMD ["python", "main.py"]
