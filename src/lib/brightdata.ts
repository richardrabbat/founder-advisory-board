// Bright Data hosted MCP endpoint (mcp.brightdata.com) over streamable HTTP.
// The account token is MCP-scoped (cannot manage zones), so all scraping goes
// through this endpoint, which auto-provisions its own unlocker zone.

const MCP_URL = "https://mcp.brightdata.com/mcp";

interface JsonRpcMessage {
  result?: {
    content?: Array<{ type: string; text?: string }>;
    isError?: boolean;
  };
  error?: { code?: number; message?: string };
}

let sessionId: string | null = null;
let rpcId = 1;

function token(): string {
  const t = process.env.BRIGHTDATA_API_TOKEN;
  if (!t) throw new Error("BRIGHTDATA_API_TOKEN is not set");
  return t;
}

async function mcpPost(body: object, sid?: string): Promise<Response> {
  return fetch(`${MCP_URL}?token=${token()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(sid ? { "mcp-session-id": sid } : {}),
    },
    body: JSON.stringify(body),
  });
}

// Responses arrive as SSE ("data: {...}" lines) or plain JSON.
function parseResponse(text: string): JsonRpcMessage {
  const dataLines = text
    .split("\n")
    .filter((l) => l.startsWith("data: "))
    .map((l) => l.slice(6));
  const raw = dataLines.length > 0 ? dataLines[dataLines.length - 1] : text;
  return JSON.parse(raw) as JsonRpcMessage;
}

async function ensureSession(): Promise<string> {
  if (sessionId) return sessionId;
  const res = await mcpPost({
    jsonrpc: "2.0",
    id: rpcId++,
    method: "initialize",
    params: {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "founder-advisory-board", version: "0.1.0" },
    },
  });
  const sid = res.headers.get("mcp-session-id");
  await res.text();
  if (!sid) throw new Error("Bright Data MCP did not return a session id");
  await mcpPost({ jsonrpc: "2.0", method: "notifications/initialized" }, sid);
  sessionId = sid;
  return sid;
}

// The MCP server wraps scraped pages in prompt-injection guard markers.
// Strip the wrapper; the content itself is still treated strictly as data.
function stripUntrustedWrapper(raw: string): string {
  const m = raw.match(
    /=====UNTRUSTED_[a-f0-9]+_BEGIN=====\n?([\s\S]*?)\n?=====UNTRUSTED_[a-f0-9]+_END=====/,
  );
  return (m ? m[1] : raw).trim();
}

async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const attempt = async (): Promise<string> => {
    const sid = await ensureSession();
    const res = await mcpPost(
      {
        jsonrpc: "2.0",
        id: rpcId++,
        method: "tools/call",
        params: { name, arguments: args },
      },
      sid,
    );
    if (res.status === 404) {
      // Session expired server-side; reset and let the caller retry.
      sessionId = null;
      await res.text();
      throw new Error("MCP session expired");
    }
    const parsed = parseResponse(await res.text());
    if (parsed.error) {
      throw new Error(`Bright Data MCP: ${parsed.error.message ?? "unknown error"}`);
    }
    const text = parsed.result?.content?.[0]?.text ?? "";
    if (parsed.result?.isError) {
      throw new Error(`Bright Data tool error: ${text.slice(0, 300)}`);
    }
    return stripUntrustedWrapper(text);
  };

  try {
    return await attempt();
  } catch {
    sessionId = null;
    return attempt();
  }
}

export async function scrapeAsMarkdown(url: string): Promise<string> {
  return callTool("scrape_as_markdown", { url });
}

export async function searchEngine(query: string): Promise<string> {
  return callTool("search_engine", { query, engine: "google" });
}
