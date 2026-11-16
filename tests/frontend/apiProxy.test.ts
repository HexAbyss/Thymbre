// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET, POST } from "@/app/api/[...path]/route";

const fetchMock = vi.fn();

function context(...path: string[]) {
  return { params: Promise.resolve({ path }) };
}

describe("the /api proxy", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }),
    );
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    delete process.env.BACKEND_URL;
  });

  it("reads the backend address on every request, not once at build time", async () => {
    process.env.BACKEND_URL = "http://one:1";
    await GET(new Request("http://app/api/speakers?x=1"), context("speakers"));
    process.env.BACKEND_URL = "http://two:2";
    await GET(new Request("http://app/api/speakers?x=1"), context("speakers"));

    expect(fetchMock.mock.calls[0][0]).toBe("http://one:1/speakers?x=1");
    expect(fetchMock.mock.calls[1][0]).toBe("http://two:2/speakers?x=1");
  });

  it("falls back to localhost when no address is set", async () => {
    await GET(new Request("http://app/api/health"), context("health"));

    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:8000/health");
  });

  it("joins a path with several parts", async () => {
    process.env.BACKEND_URL = "http://backend:8000";
    await POST(new Request("http://app/api/speakers/from-clip", { method: "POST", body: "{}" }), context("speakers", "from-clip"));

    expect(fetchMock.mock.calls[0][0]).toBe("http://backend:8000/speakers/from-clip");
  });

  it("streams the body and keeps the method and the content type", async () => {
    const request = new Request("http://app/api/identify", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=abc", host: "app" },
      body: "payload",
    });

    await POST(request, context("identify"));

    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe("POST");
    expect(init.duplex).toBe("half");
    expect(init.body).toBeInstanceOf(ReadableStream);
    expect(new Headers(init.headers).get("content-type")).toBe("multipart/form-data; boundary=abc");
    expect(new Headers(init.headers).has("host")).toBe(false);
  });

  it("sends no body for a GET", async () => {
    await GET(new Request("http://app/api/config"), context("config"));

    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });

  it("returns the status and body of the backend", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ detail: "nope" }), { status: 422 }));

    const response = await POST(new Request("http://app/api/identify", { method: "POST", body: "x" }), context("identify"));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ detail: "nope" });
  });

  it("passes a 204 through without a body", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const response = await DELETE(new Request("http://app/api/speakers/1", { method: "DELETE" }), context("speakers", "1"));

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  it("drops headers that no longer match the body it sends", async () => {
    fetchMock.mockResolvedValue(
      new Response("{}", { status: 200, headers: { "content-encoding": "gzip", "content-length": "99", "x-keep": "1" } }),
    );

    const response = await GET(new Request("http://app/api/config"), context("config"));

    expect(response.headers.has("content-encoding")).toBe(false);
    expect(response.headers.has("content-length")).toBe(false);
    expect(response.headers.get("x-keep")).toBe("1");
  });

  it("answers 502 with a readable message when the backend cannot be reached", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const response = await GET(new Request("http://app/api/health"), context("health"));

    expect(response.status).toBe(502);
    expect((await response.json()).detail).toMatch(/not reachable/);
  });

  it("refuses paths that try to climb out of the backend", async () => {
    const response = await GET(new Request("http://app/api/x"), context("speakers", "..", "admin"));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
