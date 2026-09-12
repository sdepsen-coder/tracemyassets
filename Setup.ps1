$ErrorActionPreference = "Stop"

function Ensure-Dir {
    param([Parameter(Mandatory=$true)][string]$Path)
    if (!(Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Write-File {
    param(
        [Parameter(Mandatory=$true)][string]$Path,
        [Parameter(Mandatory=$true)][string]$Content
    )
    $dir = Split-Path $Path -Parent
    if ($dir -and !(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    Set-Content -Path $Path -Value $Content -Encoding UTF8
}

Write-Host "TraceMyAssets setup basliyor..." -ForegroundColor Cyan

# -----------------------------
# GITIGNORE
# -----------------------------
Write-File ".gitignore" @'
node_modules
.next
out
dist

.env
.env.local
.env.*.local

__pycache__/
*.pyc
.venv
venv

*.db
*.sqlite
*.sqlite3

.DS_Store
Thumbs.db
'@

# -----------------------------
# CLEAN OLD GENERATED FOLDERS
# -----------------------------
if (Test-Path ".\backend") {
    Remove-Item ".\backend" -Recurse -Force
}
if (Test-Path ".\frontend") {
    Remove-Item ".\frontend" -Recurse -Force
}

# -----------------------------
# BACKEND STRUCTURE
# -----------------------------
$backendDirs = @(
    "backend/app/core",
    "backend/app/db",
    "backend/app/models",
    "backend/app/schemas",
    "backend/app/crud",
    "backend/app/api/v1/endpoints"
)

$backendDirs | ForEach-Object { Ensure-Dir $_ }

Write-File "backend/requirements.txt" @'
fastapi>=0.115,<1.0
uvicorn[standard]>=0.30,<1.0
sqlalchemy>=2.0,<3.0
pydantic>=2.8,<3.0
'@

Write-File "backend/app/__init__.py" @'
# empty
'@
Write-File "backend/app/core/__init__.py" @'
# empty
'@
Write-File "backend/app/db/__init__.py" @'
# empty
'@
Write-File "backend/app/models/__init__.py" @'
from app.models.asset import Asset
from app.models.base import Base
'@
Write-File "backend/app/schemas/__init__.py" @'
# empty
'@
Write-File "backend/app/crud/__init__.py" @'
# empty
'@
Write-File "backend/app/api/__init__.py" @'
# empty
'@
Write-File "backend/app/api/v1/__init__.py" @'
# empty
'@
Write-File "backend/app/api/v1/endpoints/__init__.py" @'
# empty
'@

Write-File "backend/app/core/config.py" @'
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{(PROJECT_ROOT / 'tracemyassets.db').as_posix()}",
)

ALLOWED_ORIGINS = [
    os.getenv("FRONTEND_ORIGIN", "http://localhost:3000"),
    "http://127.0.0.1:3000",
]
'@

Write-File "backend/app/db/session.py" @'
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import DATABASE_URL

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    future=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)
'@

Write-File "backend/app/models/base.py" @'
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
'@

Write-File "backend/app/models/asset.py" @'
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tag: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(120), nullable=False, default="General")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="available")
    location: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    assigned_to: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    purchase_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    purchase_price: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
'@

Write-File "backend/app/schemas/asset.py" @'
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
'@

Write-File "backend/app/crud/asset.py" @'
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.schemas.asset import AssetCreate, AssetUpdate


def get_asset(db: Session, asset_id: int) -> Asset | None:
    return db.get(Asset, asset_id)


def get_asset_by_tag(db: Session, tag: str) -> Asset | None:
    stmt = select(Asset).where(Asset.tag == tag)
    return db.scalar(stmt)


def get_assets(db: Session, skip: int = 0, limit: int = 100) -> list[Asset]:
    stmt = select(Asset).order_by(Asset.id.desc()).offset(skip).limit(limit)
    return list(db.scalars(stmt).all())


def create_asset(db: Session, asset_in: AssetCreate) -> Asset:
    asset = Asset(**asset_in.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def update_asset(db: Session, asset: Asset, asset_in: AssetUpdate) -> Asset:
    data = asset_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(asset, field, value)

    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def delete_asset(db: Session, asset: Asset) -> None:
    db.delete(asset)
    db.commit()
'@

Write-File "backend/app/api/deps.py" @'
from collections.abc import Generator

from sqlalchemy.orm import Session

from app.db.session import SessionLocal


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
'@

Write-File "backend/app/api/v1/router.py" @'
from fastapi import APIRouter

from app.api.v1.endpoints.assets import router as assets_router

api_router = APIRouter()
api_router.include_router(assets_router)
'@

Write-File "backend/app/api/v1/endpoints/assets.py" @'
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.crud.asset import (
    create_asset,
    delete_asset,
    get_asset,
    get_asset_by_tag,
    get_assets,
    update_asset,
)
from app.schemas.asset import AssetCreate, AssetRead, AssetUpdate

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("", response_model=list[AssetRead])
def list_assets(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return get_assets(db, skip=skip, limit=limit)


@router.get("/{asset_id}", response_model=AssetRead)
def read_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = get_asset(db, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset bulunamadı.")
    return asset


@router.post("", response_model=AssetRead, status_code=status.HTTP_201_CREATED)
def create_new_asset(payload: AssetCreate, db: Session = Depends(get_db)):
    existing = get_asset_by_tag(db, payload.tag)
    if existing is not None:
        raise HTTPException(status_code=409, detail="Bu tag zaten kullanılıyor.")
    return create_asset(db, payload)


@router.put("/{asset_id}", response_model=AssetRead)
def update_existing_asset(
    asset_id: int,
    payload: AssetUpdate,
    db: Session = Depends(get_db),
):
    asset = get_asset(db, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset bulunamadı.")

    if payload.tag is not None and payload.tag != asset.tag:
        existing = get_asset_by_tag(db, payload.tag)
        if existing is not None and existing.id != asset_id:
            raise HTTPException(status_code=409, detail="Bu tag zaten kullanılıyor.")

    return update_asset(db, asset, payload)


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = get_asset(db, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset bulunamadı.")
    delete_asset(db, asset)
    return None
'@

Write-File "backend/app/db/base.py" @'
from app.db.session import engine
from app.models.base import Base
from app.models import Asset  # noqa: F401


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
'@

Write-File "backend/app/main.py" @'
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import ALLOWED_ORIGINS
from app.db.base import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="TraceMyAssets API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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
'@

# -----------------------------
# FRONTEND STRUCTURE
# -----------------------------
$frontendDirs = @(
    "frontend/src/app",
    "frontend/src/lib"
)
$frontendDirs | ForEach-Object { Ensure-Dir $_ }

Write-File "frontend/package.json" @'
{
  "name": "tracemyassets-frontend",
  "private": true,
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0"
  }
}
'@

Write-File "frontend/next.config.js" @'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
};

module.exports = nextConfig;
'@

Write-File "frontend/tailwind.config.js" @'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 10px 30px -12px rgba(15, 23, 42, 0.45)"
      }
    }
  },
  plugins: []
};
'@

Write-File "frontend/postcss.config.js" @'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
'@

Write-File "frontend/tsconfig.json" @'
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "plugins": [
      {
        "name": "next"
      }
    ],
    "types": ["node"]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
'@

Write-File "frontend/next-env.d.ts" @'
/// <reference types="next" />
/// <reference types="next/image-types/global" />
/// <reference types="next/navigation-types/compat/navigation" />

// This file is automatically generated by Next.js.
'@

Write-File "frontend/.env.local" @'
NEXT_PUBLIC_API_URL=http://localhost:8000
'@

Write-File "frontend/src/app/globals.css" @'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
}

html,
body {
  height: 100%;
}

body {
  @apply bg-slate-950 text-slate-100 antialiased;
}

* {
  box-sizing: border-box;
}
'@

Write-File "frontend/src/app/layout.tsx" @'
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "TraceMyAssets",
  description: "Asset tracking dashboard"
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
'@

Write-File "frontend/src/lib/api.ts" @'
export type Asset = {
  id: number;
  tag: string;
  name: string;
  category: string;
  status: string;
  location: string;
  assigned_to: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AssetInput = {
  tag: string;
  name: string;
  category?: string;
  status?: string;
  location?: string;
  assigned_to?: string | null;
  purchase_date?: string | null;
  purchase_price?: number | null;
  notes?: string | null;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  listAssets: () => request<Asset[]>("/api/v1/assets"),
  createAsset: (payload: AssetInput) =>
    request<Asset>("/api/v1/assets", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateAsset: (id: number, payload: AssetInput) =>
    request<Asset>(`/api/v1/assets/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  deleteAsset: (id: number) =>
    request<void>(`/api/v1/assets/${id}`, {
      method: "DELETE"
    })
};
'@

Write-File "frontend/src/app/page.tsx" @'
"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { api, Asset } from "@/lib/api";

type FormState = {
  tag: string;
  name: string;
  category: string;
  status: string;
  location: string;
  assigned_to: string;
  purchase_date: string;
  purchase_price: string;
  notes: string;
};

const emptyForm: FormState = {
  tag: "",
  name: "",
  category: "General",
  status: "available",
  location: "",
  assigned_to: "",
  purchase_date: "",
  purchase_price: "",
  notes: ""
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("tr-TR");
}

function toPayload(form: FormState) {
  return {
    tag: form.tag.trim(),
    name: form.name.trim(),
    category: form.category.trim() || "General",
    status: form.status.trim() || "available",
    location: form.location.trim(),
    assigned_to: form.assigned_to.trim() || null,
    purchase_date: form.purchase_date || null,
    purchase_price: form.purchase_price === "" ? null : Number(form.purchase_price),
    notes: form.notes.trim() || null
  };
}

export default function Home() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAssets() {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.listAssets();
      setAssets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAssets();
  }, []);

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const payload = toPayload(form);

      if (editingId === null) {
        await api.createAsset(payload);
      } else {
        await api.updateAsset(editingId, payload);
      }

      setForm(emptyForm);
      setEditingId(null);
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydetme sırasında hata oluştu.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(asset: Asset) {
    setEditingId(asset.id);
    setForm({
      tag: asset.tag,
      name: asset.name,
      category: asset.category,
      status: asset.status,
      location: asset.location,
      assigned_to: asset.assigned_to ?? "",
      purchase_date: asset.purchase_date ?? "",
      purchase_price: asset.purchase_price?.toString() ?? "",
      notes: asset.notes ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(assetId: number) {
    const confirmed = window.confirm("Bu asset silinsin mi?");
    if (!confirmed) return;

    setIsSaving(true);
    setError(null);

    try {
      await api.deleteAsset(assetId);
      await loadAssets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Silme sırasında hata oluştu.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 md:px-8">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-soft">
        <div className="mb-6 flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            TraceMyAssets
          </p>
          <h1 className="text-3xl font-bold">Asset Yönetim Paneli</h1>
          <p className="text-slate-400">Envanter kaydı oluştur, düzenle ve takip et.</p>
        </div>

        {error ? (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <InputField label="Tag" name="tag" value={form.tag} onChange={handleChange} required />
          <InputField label="Ad" name="name" value={form.name} onChange={handleChange} required />
          <InputField label="Kategori" name="category" value={form.category} onChange={handleChange} />
          <SelectField
            label="Durum"
            name="status"
            value={form.status}
            onChange={handleChange}
            options={["available", "in_use", "maintenance", "retired"]}
          />
          <InputField label="Konum" name="location" value={form.location} onChange={handleChange} />
          <InputField
            label="Atanan Kişi"
            name="assigned_to"
            value={form.assigned_to}
            onChange={handleChange}
          />
          <InputField
            label="Satın Alma Tarihi"
            name="purchase_date"
            type="date"
            value={form.purchase_date}
            onChange={handleChange}
          />
          <InputField
            label="Satın Alma Fiyatı"
            name="purchase_price"
            type="number"
            step="0.01"
            value={form.purchase_price}
            onChange={handleChange}
          />
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-300">Notlar</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
              placeholder="Opsiyonel notlar..."
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-cyan-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Kaydediliyor..." : editingId === null ? "Asset Ekle" : "Güncelle"}
            </button>

            {editingId !== null ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
                className="rounded-xl border border-slate-700 px-5 py-3 font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                İptal
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-soft">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Asset Listesi</h2>
            <p className="text-sm text-slate-400">Toplam {assets.length} kayıt</p>
          </div>

          <button
            type="button"
            onClick={() => void loadAssets()}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Yenile
          </button>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-slate-400">Yükleniyor...</div>
        ) : assets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
            Henüz kayıt yok.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="px-4 py-3 font-medium">Tag</th>
                  <th className="px-4 py-3 font-medium">Ad</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium">Konum</th>
                  <th className="px-4 py-3 font-medium">Atanan</th>
                  <th className="px-4 py-3 font-medium">Satın Alma</th>
                  <th className="px-4 py-3 font-medium">Oluşturma</th>
                  <th className="px-4 py-3 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id} className="border-b border-slate-800/80 align-top">
                    <td className="px-4 py-4 font-medium text-cyan-300">{asset.tag}</td>
                    <td className="px-4 py-4">{asset.name}</td>
                    <td className="px-4 py-4">{asset.status}</td>
                    <td className="px-4 py-4">{asset.location || "-"}</td>
                    <td className="px-4 py-4">{asset.assigned_to || "-"}</td>
                    <td className="px-4 py-4">
                      <div>
                        {asset.purchase_price !== null
                          ? `${asset.purchase_price.toFixed(2)} ₺`
                          : "-"}
                      </div>
                      <div className="text-xs text-slate-500">{formatDate(asset.purchase_date)}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-400">{formatDateTime(asset.created_at)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(asset)}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium transition hover:border-slate-500 hover:bg-slate-800"
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(asset.id)}
                          disabled={isSaving}
                          className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function InputField({
  label,
  name,
  value,
  onChange,
  type = "text",
  step,
  required
}: {
  label: string;
  name: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
  type?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">{label}</label>
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options
}: {
  label: string;
  name: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
'@

Write-Host ""
Write-Host "Setup tamamlandi." -ForegroundColor Green
Write-Host "Sonraki adimlar:"
Write-Host "  backend:  cd backend ; python -m venv .venv ; .\.venv\Scripts\activate ; pip install -r requirements.txt"
Write-Host "  frontend: cd frontend ; npm install"
Write-Host "  run backend:  uvicorn app.main:app --reload"
Write-Host "  run frontend: npm run dev"