from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.db.base import initialize_database
from app.services.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="TraceMyAssets API",
    version="0.1.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def prevent_api_caching(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    response = await call_next(request)

    if request.url.path.startswith("/api/v1/"):
        response.headers["Cache-Control"] = "private, no-store"

    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"service": "TraceMyAssets API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(api_router, prefix="/api/v1")