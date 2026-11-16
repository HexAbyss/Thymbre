import { ApiError } from "./api";
import type { AppConfig } from "./types";

const MEGABYTE = 1024 * 1024;

/** Turns a failure into a sentence that names the problem and what to do next. */
export function friendlyError(error: unknown, config: AppConfig): string {
  if (error instanceof ApiError) {
    const speech = error.message.match(/([\d.]+)s of speech found, ([\d.]+)s needed/);
    if (error.status === 422 && speech) {
      return `Only ${speech[1]} s of speech was heard. Speak for at least ${Number(speech[2])} s and try again.`;
    }
    if (error.status === 422 && /not decodable/.test(error.message)) {
      return "That file is not audio the server can read. Try a wav, mp3, m4a or ogg file.";
    }
    if (error.status === 413 && /in total/.test(error.message)) {
      return `Those samples add up to more than ${Math.round(config.max_request_bytes / MEGABYTE)} MB. Remove one or record shorter clips.`;
    }
    if (error.status === 413) {
      return `That file is larger than ${Math.round(config.max_upload_bytes / MEGABYTE)} MB.`;
    }
    if (error.status === 404 && /clip/.test(error.message)) {
      return "That voice sample expired. Record it again to enroll it.";
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return "Cannot reach the Thymbre server. Check that it is running and try again.";
  }
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}
