"""ASGI entrypoint: uvicorn shadowspeaker.main:app"""

from shadowspeaker.api import app

__all__ = ["app"]
