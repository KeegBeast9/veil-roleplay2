
const ALLOWED_ORIGIN =
  "https://veil-roleplay-keegan.gkyw2p9nsp.chatgpt.site";

function json(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin || ALLOWED_ORIGIN,
      "Vary": "Origin"
    }
  });
}

export default {
  async fetch(request: Request, env: { GROQ_API_KEY: string }) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      if (origin !== ALLOWED_ORIGIN) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    if (url.pathname === "/") {
      return json({
        status: "online",
        service: "Veil Roleplay AI Backend"
      });
    }

    if (url.pathname !== "/api/chat") {
      return json({ error: "Not found" }, 404);
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    if (origin !== ALLOWED_ORIGIN) {
      return json({ error: "Origin not allowed" }, 403);
    }

    if (!env.GROQ_API_KEY) {
      return json({ error: "Groq API key not configured" }, 500);
    }

    try {
      const body = await request.json();
      const messages = body.messages;

      if (
        !Array.isArray(messages) ||
        messages.length === 0 ||
        messages.length > 30 ||
        !messages.every(
          (m) =>
            m &&
            ["system", "user", "assistant"].includes(m.role) &&
            typeof m.content === "string" &&
            m.content.length <= 8000
        )
      ) {
        return json({ error: "Invalid messages" }, 400);
      }

      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages,
            temperature: 0.8,
            max_tokens: 600
          })
        }
      );

      if (!response.ok) {
        return json(
          { error: "AI provider request failed", status: response.status },
          502
        );
      }

      const data = await response.json();

      return json({
        reply: data.choices?.[0]?.message?.content || ""
      });
    } catch {
      return json({ error: "Unable to process chat request" }, 500);
    }
  }
};
