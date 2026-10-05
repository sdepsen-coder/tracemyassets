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

export type AssetStats = {
  total: number;
  active: number;
  archived: number;
  monitored: number;
};

export type WatermarkPayload = {
  asset_id: number;
  user_id: number;
  timestamp: number;
  nonce: string;
};

export type PHashComparison = {
  reference_hash: string;
  candidate_hash: string;
  hamming_distance: number;
  similarity_percent: number;
};

export type OrbComparison = {
  reference_keypoints: number;
  candidate_keypoints: number;
  good_matches: number;
  homography_inliers: number;
  inlier_ratio_percent: number | null;
};

export type CandidateVerification = {
  asset_id: number;
  watermark_verified: boolean;
  watermark_matches_reference: boolean;
  watermark_payload: WatermarkPayload | null;
  phash: PHashComparison;
  orb: OrbComparison;
  overall_signal:
    | "WATERMARK_VERIFIED"
    | "STRONG_VISUAL_MATCH"
    | "POSSIBLE_VISUAL_MATCH"
    | "WEAK_VISUAL_SIGNAL"
    | "NO_STRONG_VISUAL_MATCH";
  review_recommended: boolean;
};

export type MonitoringPreference = {
  id: number;
  asset_id: number;
  enabled: boolean;
  alert_threshold_percent: number;
  scan_frequency: "daily" | "weekly" | "monthly";
  last_scan_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MonitoringPreferenceUpdate = {
  enabled: boolean;
  alert_threshold_percent: number;
  scan_frequency: "daily" | "weekly" | "monthly";
};

export type ScanJob = {
  id: number;
  asset_id: number;
  provider: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  started_at: string | null;
  completed_at: string | null;
  candidate_count: number;
  match_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type MatchRecord = {
  id: number;
  asset_id: number;
  scan_job_id: number | null;
  source_name: string | null;
  source_url: string | null;
  candidate_image_url: string | null;
  candidate_page_url: string | null;
  candidate_image_hash: string | null;
  similarity_percent: number;
  watermark_verified: boolean;
  watermark_matches_reference: boolean;
  overall_signal:
    | "WATERMARK_VERIFIED"
    | "STRONG_VISUAL_MATCH"
    | "POSSIBLE_VISUAL_MATCH"
    | "WEAK_VISUAL_SIGNAL"
    | "NO_STRONG_VISUAL_MATCH";
  review_status: "new" | "reviewing" | "confirmed" | "dismissed" | "archived";
  found_at: string;
  reviewed_at: string | null;
  dismissed_at: string | null;
  notes: string | null;
  source_locked: boolean;
  page_kind: MatchPageKind;
  found_by_deep_scan?: boolean;
  feedback_verdict: MatchVerdict | null;
  created_at: string;
  updated_at: string;
};

// What kind of page a match was found on (see backend page_kind.py).
export type MatchPageKind = "item" | "collection" | "page" | "image_only";

export type MatchVerdict =
  | "useful"
  | "irrelevant"
  | "unrelated"
  | "different";

export type SurveyAnswers = Partial<
  Record<"check_today" | "would_pay" | "if_found", string>
>;

export type FeedbackSubmission = {
  kind: "beta_survey" | "general";
  message?: string;
  answers?: SurveyAnswers;
};

export type MatchRecordUpdate = {
  review_status: "reviewing" | "confirmed" | "dismissed" | "archived";
  notes?: string;
};

export type MatchSummary = {
  new: number;
  reviewing: number;
  confirmed: number;
  dismissed: number;
  archived: number;
};

export type ScanDiagnostics = {
  candidates: number;
  no_image_address: number;
  image_unreachable: number;
  not_comparable: number;
  below_threshold: number;
  page_gone: number;
  page_unrelated: number;
  page_unreadable?: number;
  recorded: number;
  best_similarity_percent: number | null;
  providers_asked?: number;
  provider_failures?: number;
};

export type CreditsInfo = {
  balance: number;
  deep_scan_cost: number;
  recent: Array<{
    id: number;
    delta: number;
    reason: "welcome" | "grant" | "deep_scan" | "refund";
    created_at: string;
  }>;
};

export type AssetScan = {
  asset_id: number;
  provider: string;
  threshold_percent: number;
  scan_job: ScanJob;
  matches: MatchRecord[];
  diagnostics?: ScanDiagnostics | null;
  // Deep scans only.
  credits_remaining?: number | null;
  credit_refunded?: boolean;
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
  assetStats: (signal?: AbortSignal) =>
    request<AssetStats>("/api/v1/assets/stats", { signal }),

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

  authProviders: (signal?: AbortSignal) =>
    request<{ google: boolean }>("/api/v1/auth/providers", { signal }),

  forgotPassword: (email: string) =>
    request<{ message: string }>("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    request<{ message: string }>("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
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
    status: "active" | "archived" | "all" = "active",
    signal?: AbortSignal,
  ) =>
    request<Asset[]>(
      `/api/v1/assets?skip=${skip}&limit=${limit}&status=${status}`,
      { signal },
    ),

  archiveAsset: (
    assetId: number,
    archived: boolean,
    signal?: AbortSignal,
  ) =>
    request<Asset>(`/api/v1/assets/${assetId}/archive`, {
      method: "PATCH",
      body: JSON.stringify({ archived }),
      signal,
    }),

  deleteAsset: (assetId: number, signal?: AbortSignal) =>
    request<void>(`/api/v1/assets/${assetId}`, {
      method: "DELETE",
      signal,
    }),

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

  downloadWatermarked: async (
    assetId: number,
    signal?: AbortSignal,
  ): Promise<Blob> => {
    const response = await send(
      `/api/v1/assets/${assetId}/download-watermarked`,
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

  verifyCandidate: (
    assetId: number,
    candidate: File,
    signal?: AbortSignal,
  ) => {
    const body = new FormData();
    body.append("candidate", candidate);

    return request<CandidateVerification>(
      `/api/v1/assets/${assetId}/verify-candidate`,
      {
        method: "POST",
        body,
        signal,
      },
    );
  },

  getMonitoring: (
    assetId: number,
    signal?: AbortSignal,
  ) =>
    request<MonitoringPreference>(
      `/api/v1/assets/${assetId}/monitoring`,
      { signal },
    ),

  updateMonitoring: (
    assetId: number,
    preference: MonitoringPreferenceUpdate,
    signal?: AbortSignal,
  ) =>
    request<MonitoringPreference>(
      `/api/v1/assets/${assetId}/monitoring`,
      {
        method: "PUT",
        body: JSON.stringify(preference),
        signal,
      },
    ),

  runScan: (
    assetId: number,
    signal?: AbortSignal,
  ) =>
    request<AssetScan>(
      `/api/v1/assets/${assetId}/scan`,
      {
        method: "POST",
        signal,
      },
    ),
  runDeepScan: (
    assetId: number,
    signal?: AbortSignal,
  ) =>
    request<AssetScan>(
      `/api/v1/assets/${assetId}/deep-scan`,
      {
        method: "POST",
        signal,
      },
    ),

  getCredits: (signal?: AbortSignal) =>
    request<CreditsInfo>("/api/v1/credits", { signal }),

  getMatchSummary: (signal?: AbortSignal) =>
    request<MatchSummary>("/api/v1/matches/summary", { signal }),

  listMatches: (
    reviewStatus?: MatchRecord["review_status"],
    skip = 0,
    limit = 100,
    signal?: AbortSignal,
  ) => {
    const params = new URLSearchParams();

    if (reviewStatus) {
      params.set("review_status", reviewStatus);
    }

    params.set("skip", String(skip));
    params.set("limit", String(limit));

    return request<MatchRecord[]>(
      `/api/v1/matches?${params.toString()}`,
      { signal },
    );
  },

  updateMatch: (
    matchId: number,
    update: MatchRecordUpdate,
    signal?: AbortSignal,
  ) =>
    request<MatchRecord>(`/api/v1/matches/${matchId}`, {
      method: "PATCH",
      body: JSON.stringify(update),
      signal,
    }),

  deleteMatches: (ids: number[], signal?: AbortSignal) =>
    request<{ deleted: number }>("/api/v1/matches/delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
      signal,
    }),

  setMatchFeedback: (
    matchId: number,
    verdict: MatchVerdict,
    signal?: AbortSignal,
  ) =>
    request<{ match_id: number; verdict: MatchVerdict }>(
      `/api/v1/matches/${matchId}/feedback`,
      {
        method: "PUT",
        body: JSON.stringify({ verdict }),
        signal,
      },
    ),

  clearMatchFeedback: (matchId: number, signal?: AbortSignal) =>
    request<void>(`/api/v1/matches/${matchId}/feedback`, {
      method: "DELETE",
      signal,
    }),

  sendFeedback: (
    feedback: FeedbackSubmission,
    signal?: AbortSignal,
  ) =>
    request<{ id: number }>("/api/v1/feedback", {
      method: "POST",
      body: JSON.stringify(feedback),
      signal,
    }),
};