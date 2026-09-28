"""Vercel serverless entrypoint: re-export the FastAPI app.

Vercel's Python runtime auto-detects an ASGI `app` in index.py at the
project root. The Docker image is unaffected (it only copies ./app).
"""
from app.main import app  # noqa: F401
