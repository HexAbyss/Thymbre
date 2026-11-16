import type { AppConfig } from "./types";

/** Used until the server's `/config` answers, and when it cannot be reached. Mirrors the backend defaults. */
export const DEFAULT_CONFIG: AppConfig = {
  identify_threshold: 0.5,
  identify_margin: 0.05,
  min_speech_seconds: 3,
  max_audio_seconds: 60,
  max_upload_bytes: 20 * 1024 * 1024,
  max_request_bytes: 50 * 1024 * 1024,
  max_samples_per_enrollment: 10,
  pending_clip_ttl_seconds: 600,
};
