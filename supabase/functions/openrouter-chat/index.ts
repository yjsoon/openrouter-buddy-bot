import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY is not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin = req.headers.get("origin") || req.headers.get("referer") || "https://lovable.dev";

    const body = await req.json();
    const {
      messages,
      model,
      temperature = 0.7,
      max_tokens = 1000,
      top_p,
      presence_penalty,
      frequency_penalty,
    } = body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "'messages' array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const selectedModel = model || "openai/gpt-4o-mini"; // Default; you can override from client

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        // Recommended by OpenRouter for attribution & routing
        "HTTP-Referer": origin,
        "X-Title": "openrouter-buddy-bot",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature,
        max_tokens,
        ...(top_p !== undefined ? { top_p } : {}),
        ...(presence_penalty !== undefined ? { presence_penalty } : {}),
        ...(frequency_penalty !== undefined ? { frequency_penalty } : {}),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const status = data?.error?.code || response.status;
      const message = data?.error?.message || data?.message || "OpenRouter request failed";
      return new Response(JSON.stringify({ error: message, details: data }), {
        status: typeof status === "number" ? status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = data?.choices?.[0]?.message?.content;
    const text = Array.isArray(content)
      ? content.map((c: any) => (typeof c === "string" ? c : c?.text)).filter(Boolean).join("\n")
      : content ?? "";

    return new Response(
      JSON.stringify({ content: text, raw: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("openrouter-chat error:", err);
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
