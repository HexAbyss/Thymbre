import type { AppConfig, IdentifyResult, Speaker } from "./types";

/** Requests go to `/api/*`, which Next.js proxies to the backend, so the browser never needs CORS. */
const BASE = "/api";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function readDetail(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const detail = body?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((item) => item?.msg ?? String(item)).join("; ");
    }
  } catch {
    // The body was not JSON; fall through to the status text.
  }
  return response.statusText || `Request failed with status ${response.status}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, init);
  if (!response.ok) throw new ApiError(response.status, await readDetail(response));
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  config: () => request<AppConfig>("/config"),

  health: () => request<{ status: string }>("/health"),

  listSpeakers: () => request<Speaker[]>("/speakers"),

  enroll(name: string, samples: Blob[]) {
    const form = new FormData();
    form.append("name", name);
    samples.forEach((sample, index) => {
      form.append("files", sample, sample instanceof File ? sample.name : `sample-${index}`);
    });
    return request<Speaker>("/speakers", { method: "POST", body: form });
  },

  enrollFromClip: (clipId: string, name: string) =>
    request<Speaker>("/speakers/from-clip", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clip_id: clipId, name }),
    }),

  deleteSpeaker: (id: string) => request<void>(`/speakers/${id}`, { method: "DELETE" }),

  identify(clip: Blob) {
    const form = new FormData();
    form.append("file", clip, clip instanceof File ? clip.name : "clip");
    return request<IdentifyResult>("/identify", { method: "POST", body: form });
  },
};
