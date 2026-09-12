from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AssetBase(BaseModel):
    tag: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=255)
    category: str = Field(default="General", max_length=120)
    status: str = Field(default="available", max_length=50)
    location: str = Field(default="", max_length=255)
    assigned_to: Optional[str] = Field(default=None, max_length=255)
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = Field(default=None, ge=0)
    notes: Optional[str] = None


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    tag: Optional[str] = Field(default=None, min_length=1, max_length=64)
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    category: Optional[str] = Field(default=None, max_length=120)
    status: Optional[str] = Field(default=None, max_length=50)
    location: Optional[str] = Field(default=None, max_length=255)
    assigned_to: Optional[str] = Field(default=None, max_length=255)
    purchase_date: Optional[date] = None
    purchase_price: Optional[float] = Field(default=None, ge=0)
    notes: Optional[str] = None


class AssetRead(AssetBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)