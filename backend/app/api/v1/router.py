from fastapi import APIRouter

from app.api.v1.endpoints.assets import router as assets_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.matches import router as matches_router


api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(matches_router)
api_router.include_router(assets_router)


@api_router.get("/status")
def api_status():
    return {"status": "ok"}