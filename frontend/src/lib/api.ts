export type User = {
  id: number;
  email: string;
  plan_type: string;
  created_at: string;
};

export type Credentials = {
  email: string;
  password: string;
};

export type Asset = {
  id: number;
  user_id: number;
  title: string;
  original_url: string;
  thumbnail_url: string;
  watermarked_url: string | null;
  phash_value: string | null;
  status: "active" | "archived";
  created_at: string;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readError(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status}).`;

  try {
    const body: unknown = await response.json();

    if (!isRecord(body)) return fallback;

    if (typeof body.detail === "string") {
      return body.detail;
    }

    if (Array.isArray(body.detail)) {
      const messages = body.detail
        .map((item: unknown) => {
          if (!isRecord(item) || typeof item.msg !== "string") {
            return null;
          }

          const location = Array.isArray(item.loc)
            ? item.loc.map(String).join(".")
            : "";

          return location ? `${location}: ${item.msg}` : item.msg;
        })
        .filter((message): message is string => message !== null);

      return messages.join(" • ") || fallback;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

async function send(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);

  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readError(response));
  }

  return response;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await send(path, init);

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  register: (credentials: Credentials) =>
    request<User>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  login: (credentials: Credentials) =>
    request<User>("/api/v1/auth/session", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  me: (signal?: AbortSignal) =>
    request<User>("/api/v1/auth/me", { signal }),

  logout: () =>
    request<void>("/api/v1/auth/logout", {
      method: "POST",
    }),

  listAssets: (
    skip = 0,
    limit = 100,
    signal?: AbortSignal,
  ) =>
    request<Asset[]>(
      `/api/v1/assets?skip=${skip}&limit=${limit}`,
      { signal },
    ),

  uploadAsset: (
    title: string,
    file: File,
    signal?: AbortSignal,
  ) => {
    const body = new FormData();
    body.append("title", title.trim());
    body.append("file", file);

    return request<Asset>("/api/v1/assets", {
      method: "POST",
      body,
      signal,
    });
  },

  thumbnail: async (
    assetId: number,
    signal?: AbortSignal,
  ): Promise<Blob> => {
    const response = await send(
      `/api/v1/assets/${assetId}/thumbnail`,
      { signal },
    );

    return response.blob();
  },

  downloadOriginal: async (
    assetId: number,
    signal?: AbortSignal,
  ): Promise<Blob> => {
    const response = await send(
      `/api/v1/assets/${assetId}/download`,
      { signal },
    );

    return response.blob();
  },
};