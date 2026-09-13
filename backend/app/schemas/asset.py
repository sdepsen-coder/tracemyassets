from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class AssetRead(BaseModel):
    id: int
    user_id: int
    title: str
    original_url: str
    thumbnail_url: str
    watermarked_url: str | None = None
    phash_value: str | None
    status: Literal["active", "archived"]
    created_at: datetime