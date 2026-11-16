/**
 * Forwards `/api/*` to the backend. The address comes from `BACKEND_URL` on every request, so one
 * built image runs against any backend. Bodies are streamed, so uploads are not buffered here.
 */

export const dynamic = "force-dynamic";

const DROPPED_RESPONSE_HEADERS = ["content-encoding", "content-length", "transfer-encoding", "connection"];

type Context = { params: Promise<{ path: string[] }> };

async function forward(request: Request, { params }: Context): Promise<Response> {
  const { path } = await params;
  if (path.some((segment) => segment === "." || segment === "..")) {
    return Response.json({ detail: "Invalid path." }, { status: 400 });
  }

  const backend = process.env.BACKEND_URL ?? "http://localhost:8000";
  const target = `${backend}/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      // Required by Node to send a streamed request body.
      duplex: "half",
      redirect: "manual",
    } as RequestInit);

    const responseHeaders = new Headers(upstream.headers);
    DROPPED_RESPONSE_HEADERS.forEach((name) => responseHeaders.delete(name));
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return Response.json({ detail: "The Thymbre backend is not reachable." }, { status: 502 });
  }
}

export { forward as GET, forward as POST, forward as DELETE };
