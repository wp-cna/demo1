import contentIndex from "./content-index.js";
import { createRetriever } from "./retrieval.js";
import { FALLBACK_ANSWER, generateAnswer } from "./openai.js";

const QUESTION_MAX_LENGTH = 500;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 12;
const ABUSIVE_PATTERN = /\b(?:kill yourself|kys|nigger|faggot|rape|rapist)\b/i;
const rateLimitStore = new Map();
const retrieveSources = createRetriever(contentIndex.items || []);

function normalizeQuestion(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function jsonResponse(body, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders
    }
  });
}

function errorResponse(message, status, corsHeaders = {}) {
  return jsonResponse({ error: message }, status, corsHeaders);
}

function parseAllowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function buildCorsHeaders(origin, env) {
  const allowedOrigins = parseAllowedOrigins(env);

  if (!origin) {
    return {};
  }

  if (allowedOrigins.includes("*")) {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    };
  }

  if (allowedOrigins.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    };
  }

  return null;
}

function isRateLimited(ipAddress) {
  const now = Date.now();

  for (const [ip, state] of rateLimitStore.entries()) {
    if (now - state.startedAt > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(ip);
    }
  }

  const current = rateLimitStore.get(ipAddress);

  if (!current) {
    rateLimitStore.set(ipAddress, { startedAt: now, count: 1 });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
}

function isRejectedQuestion(question) {
  return ABUSIVE_PATTERN.test(question);
}

function cleanAnswer(answer) {
  return String(answer || "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function dedupeSources(sources) {
  const seen = new Set();

  return sources.filter((source) => {
    const key = source.url || source.sourceId || source.title;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = buildCorsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders || {}
      });
    }

    if (origin && !corsHeaders) {
      return errorResponse("Origin not allowed.", 403);
    }

    if (request.method === "GET") {
      return jsonResponse(
        {
          ok: true,
          name: "Ask White Plains API",
          itemCount: contentIndex.itemCount || 0
        },
        200,
        corsHeaders || {}
      );
    }

    if (request.method !== "POST") {
      return errorResponse("Method not allowed.", 405, corsHeaders || {});
    }

    const ipAddress = request.headers.get("CF-Connecting-IP") || "unknown";

    if (isRateLimited(ipAddress)) {
      return errorResponse("Too many requests. Please try again in a few minutes.", 429, corsHeaders || {});
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid request body.", 400, corsHeaders || {});
    }

    const question = normalizeQuestion(body?.question);

    if (!question) {
      return errorResponse("Enter a question before submitting.", 422, corsHeaders || {});
    }

    if (question.length > QUESTION_MAX_LENGTH) {
      return errorResponse(`Questions must be ${QUESTION_MAX_LENGTH} characters or fewer.`, 422, corsHeaders || {});
    }

    if (isRejectedQuestion(question)) {
      return errorResponse("That question cannot be processed by this civic assistant.", 422, corsHeaders || {});
    }

    const retrievedSources = retrieveSources(question, {
      limit: Number(env.MAX_SOURCES || 6),
      minScore: 8
    });

    if (!retrievedSources.length) {
      return jsonResponse(
        {
          answer: FALLBACK_ANSWER,
          sources: []
        },
        200,
        corsHeaders || {}
      );
    }

    let answer;

    try {
      answer = await generateAnswer({
        env,
        question,
        sources: retrievedSources
      });
    } catch (error) {
      console.error("Ask White Plains backend error:", error);
      return errorResponse("The assistant is not available right now.", 502, corsHeaders || {});
    }

    const visibleSources = dedupeSources(retrievedSources).slice(0, 4).map((source) => ({
      title: source.title,
      url: source.url,
      type: source.type,
      excerpt: source.excerpt
    }));

    return jsonResponse(
      {
        answer: cleanAnswer(answer) || FALLBACK_ANSWER,
        sources: visibleSources
      },
      200,
      corsHeaders || {}
    );
  }
};
