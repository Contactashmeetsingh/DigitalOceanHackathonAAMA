# --- Stage 1: build the React (Vite) frontend ---
FROM node:20-slim AS frontend
WORKDIR /frontend
COPY aman_frontend/package.json aman_frontend/package-lock.json* ./
RUN npm install
COPY aman_frontend/ ./
RUN npm run build

# --- Stage 2: Python runtime that serves the built app + API ---
FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY data/reference/ ./data/reference/
COPY studies.json ./
COPY --from=frontend /frontend/dist ./frontend/dist

EXPOSE 8080

# Keep one memory-sharing worker on the 512 MB instance, but allow a health/API
# request to run while a slow Gradient request is in flight.
CMD ["gunicorn", "--worker-class", "gthread", "--threads", "2", "--timeout", "120", "--bind", "0.0.0.0:8080", "backend.app:app"]
