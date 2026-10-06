from fastapi import APIRouter

from app.api.v1.endpoints.admin import router as admin_router
from app.api.v1.endpoints.assets import router as assets_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.auth_google import router as auth_google_router
from app.api.v1.endpoints.credits import router as credits_router
from app.api.v1.endpoints.feedback import router as feedback_router
from app.api.v1.endpoints.matches import router as matches_router
from app.api.v1.endpoints.public_images import router as public_images_router
from app.api.v1.endpoints.usage import router as usage_router


api_router = APIRouter()

api_router.include_router(admin_router)
api_router.include_router(auth_router)
api_router.include_router(auth_google_router)
api_router.include_router(matches_router)
api_router.include_router(assets_router)
api_router.include_router(credits_router)
api_router.include_router(feedback_router)
api_router.include_router(public_images_router)
api_router.include_router(usage_router)


@api_router.get("/status")
def api_status():
    return {"status": "ok"}