import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, ApiError } from "@/lib/api";

function reply(status: number, body?: unknown) {
  return Promise.resolve(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("api client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => vi.stubGlobal("fetch", fetchMock));
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("reads the speaker list through the /api proxy", async () => {
    fetchMock.mockReturnValue(reply(200, [{ id: "1", name: "Ana", sample_count: 2 }]));

    const speakers = await api.listSpeakers();

    expect(fetchMock.mock.calls[0][0]).toBe("/api/speakers");
    expect(speakers[0].name).toBe("Ana");
  });

  it("sends the name and every sample as multipart form data when enrolling", async () => {
    fetchMock.mockReturnValue(reply(201, { id: "1", name: "Ana", sample_count: 2 }));
    const a = new File(["a"], "a.wav", { type: "audio/wav" });
    const b = new File(["b"], "b.wav", { type: "audio/wav" });

    await api.enroll("Ana", [a, b]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/speakers");
    expect(init.method).toBe("POST");
    const form = init.body as FormData;
    expect(form.get("name")).toBe("Ana");
    expect(form.getAll("files")).toHaveLength(2);
  });

  it("posts a single file to identify", async () => {
    fetchMock.mockReturnValue(
      reply(200, { status: "unknown", speaker: null, score: 0.1, clip_id: "c" }),
    );

    const result = await api.identify(new File(["x"], "clip.webm", { type: "audio/webm" }));

    expect(fetchMock.mock.calls[0][0]).toBe("/api/identify");
    expect((fetchMock.mock.calls[0][1].body as FormData).get("file")).toBeInstanceOf(File);
    expect(result.clip_id).toBe("c");
  });

  it("enrolls an unknown clip with JSON", async () => {
    fetchMock.mockReturnValue(reply(201, { id: "1", name: "Daniel", sample_count: 1 }));

    await api.enrollFromClip("clip-1", "Daniel");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/speakers/from-clip");
    expect(JSON.parse(init.body)).toEqual({ clip_id: "clip-1", name: "Daniel" });
  });

  it("treats a 204 delete as success without parsing a body", async () => {
    fetchMock.mockReturnValue(Promise.resolve(new Response(null, { status: 204 })));

    await expect(api.deleteSpeaker("abc")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/speakers/abc");
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE");
  });

  it("throws an ApiError carrying the status and the server detail", async () => {
    fetchMock.mockReturnValue(reply(422, { detail: "0.0s of speech found, 3.0s needed" }));

    const failure = api.identify(new File(["x"], "c.wav")).catch((e) => e);

    const error = await failure;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.message).toBe("0.0s of speech found, 3.0s needed");
  });

  it("joins validation errors that arrive as a list", async () => {
    fetchMock.mockReturnValue(
      reply(422, { detail: [{ msg: "Field required" }, { msg: "Invalid uuid" }] }),
    );

    const error = await api.deleteSpeaker("x").catch((e) => e);

    expect(error.message).toBe("Field required; Invalid uuid");
  });
});
