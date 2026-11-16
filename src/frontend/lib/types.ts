export type IdentifyStatus = "match" | "unknown" | "uncertain";

export interface SpeakerRef {
  id: string;
  name: string;
}

export interface IdentifyResult {
  status: IdentifyStatus;
  speaker: SpeakerRef | null;
  score: number | null;
  clip_id: string | null;
}

export interface Speaker {
  id: string;
  name: string;
  sample_count: number;
  created_at: string;
}

export interface AppConfig {
  identify_threshold: number;
  identify_margin: number;
  min_speech_seconds: number;
  max_audio_seconds: number;
  max_upload_bytes: number;
  max_request_bytes: number;
  max_samples_per_enrollment: number;
  pending_clip_ttl_seconds: number;
}
