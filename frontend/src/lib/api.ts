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