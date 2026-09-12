from fastapi import APIRouter

from app.api.v1.endpoints.assets import router as assets_router

api_router = APIRouter()
api_router.include_router(assets_router)