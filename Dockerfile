# --- Stage 1: build the React (Vite) frontend ---
FROM node:20-slim AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Python runtime that serves the built app + API ---
FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY studies.json ./
COPY --from=frontend /frontend/dist ./frontend/dist

EXPOSE 8080

# --timeout 120: Gradient agent/inference calls exceed gunicorn's 30s default.
CMD ["gunicorn", "--timeout", "120", "--bind", "0.0.0.0:8080", "backend.app:app"]
