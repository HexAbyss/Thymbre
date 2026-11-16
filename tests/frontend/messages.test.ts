import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api";
import { DEFAULT_CONFIG } from "@/lib/config";
import { friendlyError } from "@/lib/messages";

describe("friendlyError", () => {
  it("explains a clip with too little speech and says what to do", () => {
    const error = new ApiError(422, "1.2s of speech found, 3.0s needed");

    expect(friendlyError(error, DEFAULT_CONFIG)).toBe(
      "Only 1.2 s of speech was heard. Speak for at least 3 s and try again.",
    );
  });

  it("explains a file that is not audio", () => {
    const error = new ApiError(422, "input is not decodable audio");

    expect(friendlyError(error, DEFAULT_CONFIG)).toMatch(/not audio the server can read/);
  });

  it("states the size limit in megabytes on a 413", () => {
    const error = new ApiError(413, "file exceeds 20971520 bytes");

    expect(friendlyError(error, DEFAULT_CONFIG)).toBe("That file is larger than 20 MB.");
  });

  it("explains when the samples of one enrollment add up to too much", () => {
    const error = new ApiError(413, "request exceeds 52428800 bytes in total");

    expect(friendlyError(error, DEFAULT_CONFIG)).toBe(
      "Those samples add up to more than 50 MB. Remove one or record shorter clips.",
    );
  });

  it("says a clip expired on a 404 from enrolling a clip", () => {
    const error = new ApiError(404, "clip not found or expired");

    expect(friendlyError(error, DEFAULT_CONFIG)).toMatch(/expired/);
  });

  it("explains an unreachable server instead of showing a raw network error", () => {
    expect(friendlyError(new TypeError("Failed to fetch"), DEFAULT_CONFIG)).toMatch(
      /Cannot reach the Thymbre server/,
    );
  });

  it("falls back to the server message for anything else", () => {
    expect(friendlyError(new ApiError(422, "name must not be blank"), DEFAULT_CONFIG)).toBe(
      "name must not be blank",
    );
  });
});
