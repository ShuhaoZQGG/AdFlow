/**
 * AdFlow Backend API - Cloudflare Worker
 * Proxies requests to Claude API with server-side API key
 */

interface Env {
  CLAUDE_API_KEY: string;
  ALLOWED_ORIGINS: string;
}

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeRequest {
  model: string;
  max_tokens: number;
  system?: string;
  messages: ClaudeMessage[];
}

interface AIRequest {
  type: 'explain_request' | 'analyze_session' | 'analyze_ordering' | 'predict_discrepancies';
  context: string;
  system: string;
  stream?: boolean;
}

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(request, env);
    }

    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

    try {
      // Health check - allow without origin validation
      if (url.pathname === '/api/health') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // All other endpoints require valid origin
      if (!isAllowedOrigin(origin, env.ALLOWED_ORIGINS)) {
        return new Response('Forbidden', { status: 403 });
      }

      switch (url.pathname) {
        case '/api/analyze':
          return await handleAnalyze(request, env, origin);
        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('Error:', error);
      return jsonResponse(
        { error: error instanceof Error ? error.message : 'Internal server error' },
        origin,
        500
      );
    }
  },
};

async function handleAnalyze(request: Request, env: Env, origin: string): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (!env.CLAUDE_API_KEY) {
    return jsonResponse({ error: 'API key not configured on server' }, origin, 500);
  }

  const body = await request.json() as AIRequest;

  if (!body.type || !body.context || !body.system) {
    return jsonResponse({ error: 'Missing required fields: type, context, system' }, origin, 400);
  }

  // Check if client wants streaming
  const wantsStream = body.stream === true;

  // Rate limiting could be added here with Cloudflare KV or Durable Objects

  const claudeRequest = {
    model: MODEL,
    max_tokens: getMaxTokens(body.type),
    system: body.system,
    stream: wantsStream,
    messages: [
      {
        role: 'user',
        content: body.context,
      },
    ],
  };

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(claudeRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Claude API error:', response.status, errorText);

    if (response.status === 401) {
      return jsonResponse({ error: 'Invalid API key configured on server' }, origin, 500);
    }
    if (response.status === 429) {
      return jsonResponse({ error: 'Rate limit exceeded. Please try again later.' }, origin, 429);
    }
    return jsonResponse({ error: 'AI service unavailable' }, origin, 502);
  }

  // Handle streaming response
  if (wantsStream) {
    return handleStreamingResponse(response, origin, body.type);
  }

  // Non-streaming response (legacy)
  const claudeResponse = await response.json() as {
    content: Array<{ type: string; text?: string }>;
  };

  const text = claudeResponse.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text || '')
    .join('\n');

  return jsonResponse({
    type: body.type,
    result: text,
    timestamp: Date.now(),
  }, origin);
}

function handleStreamingResponse(response: Response, origin: string, requestType: string): Response {
  const reader = response.body?.getReader();
  if (!reader) {
    return jsonResponse({ error: 'Failed to read stream' }, origin, 500);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // Send final event
            controller.enqueue(encoder.encode(`data: {"type":"done","requestType":"${requestType}"}\n\n`));
            controller.close();
            break;
          }

          // Append new data to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events (split by double newline)
          const events = buffer.split('\n\n');
          // Keep the last potentially incomplete event in the buffer
          buffer = events.pop() || '';

          for (const eventBlock of events) {
            const lines = eventBlock.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const event = JSON.parse(data);

                  // Handle content_block_delta events (text streaming)
                  if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                    const text = event.delta.text || '';
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text })}\n\n`));
                  }
                } catch {
                  // Skip unparseable lines
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Stream error:', error);
        controller.enqueue(encoder.encode(`data: {"type":"error","message":"Stream interrupted"}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': origin,
    },
  });
}

function getMaxTokens(type: string): number {
  switch (type) {
    case 'explain_request':
      return 1024;
    case 'analyze_session':
    case 'predict_discrepancies':
      return 2048;
    case 'analyze_ordering':
      return 1536;
    default:
      return 1024;
  }
}

function isAllowedOrigin(origin: string, allowedPattern: string): boolean {
  // Allow chrome extensions
  if (origin.startsWith('chrome-extension://')) {
    return true;
  }
  // Allow localhost for development
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return true;
  }
  // Check against configured pattern
  if (allowedPattern === '*') {
    return true;
  }
  return false;
}

function handleCORS(request: Request, env: Env): Response {
  const origin = request.headers.get('Origin') || '';

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

function jsonResponse(data: unknown, origin: string, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
    },
  });
}
