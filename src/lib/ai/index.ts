// AI Service Layer for Claude API integration
// Supports both direct API calls (user's own key) and backend proxy (server-side key)

import Anthropic from '@anthropic-ai/sdk';
import type { EnrichedRequest, AdFlow, AIExplanation } from '../types';
import {
  buildRequestContext,
  buildSessionContext,
  buildOrderingContext,
  buildChatContext,
  REQUEST_EXPLAINER_SYSTEM,
  SESSION_SUMMARY_SYSTEM,
  ORDERING_ANALYZER_SYSTEM,
  DISCREPANCY_PREDICTOR_SYSTEM,
  CHAT_ASSISTANT_SYSTEM,
} from './prompts';

// Chat message type
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Storage keys
const API_KEY_STORAGE_KEY = 'adflow_claude_api_key';
const BACKEND_URL_STORAGE_KEY = 'adflow_backend_url';
const AI_MODE_STORAGE_KEY = 'adflow_ai_mode';

// Default backend URL (can be overridden in settings)
const DEFAULT_BACKEND_URL = 'https://adflow-api.adflow.workers.dev';

// Default model for direct API calls
const MODEL = 'claude-haiku-4-5-20251001';

// AI Mode: 'direct' uses user's API key, 'backend' uses server proxy
export type AIMode = 'direct' | 'backend';

let anthropicClient: Anthropic | null = null;

// ============================================
// Configuration Management
// ============================================

/**
 * Get current AI mode (defaults to 'backend' if backend URL is configured)
 */
export async function getAIMode(): Promise<AIMode> {
  const result = await chrome.storage.local.get(AI_MODE_STORAGE_KEY);
  return result[AI_MODE_STORAGE_KEY] || 'backend';
}

/**
 * Set AI mode
 */
export async function setAIMode(mode: AIMode): Promise<void> {
  await chrome.storage.local.set({ [AI_MODE_STORAGE_KEY]: mode });
}

/**
 * Store API key in chrome.storage.local (for direct mode)
 */
export async function setApiKey(key: string): Promise<void> {
  await chrome.storage.local.set({ [API_KEY_STORAGE_KEY]: key });
  anthropicClient = null;
}

/**
 * Retrieve stored API key
 */
export async function getApiKey(): Promise<string | null> {
  const result = await chrome.storage.local.get(API_KEY_STORAGE_KEY);
  return result[API_KEY_STORAGE_KEY] || null;
}

/**
 * Clear stored API key
 */
export async function clearApiKey(): Promise<void> {
  await chrome.storage.local.remove(API_KEY_STORAGE_KEY);
  anthropicClient = null;
}

/**
 * Check if API key is configured
 */
export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey();
  return !!key;
}

/**
 * Set backend URL (for backend mode)
 */
export async function setBackendUrl(url: string): Promise<void> {
  await chrome.storage.local.set({ [BACKEND_URL_STORAGE_KEY]: url });
}

/**
 * Get backend URL (uses default if not set)
 */
export async function getBackendUrl(): Promise<string | null> {
  const result = await chrome.storage.local.get(BACKEND_URL_STORAGE_KEY);
  return result[BACKEND_URL_STORAGE_KEY] || DEFAULT_BACKEND_URL;
}

/**
 * Clear backend URL
 */
export async function clearBackendUrl(): Promise<void> {
  await chrome.storage.local.remove(BACKEND_URL_STORAGE_KEY);
}

// ============================================
// Direct API Client
// ============================================

/**
 * Get or create Anthropic client (for direct mode)
 */
async function getClient(): Promise<Anthropic> {
  if (anthropicClient) return anthropicClient;

  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('API key not configured. Please set your Claude API key in settings.');
  }

  anthropicClient = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  return anthropicClient;
}

/**
 * Test API key validity (for direct mode)
 */
export async function testApiKey(key: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const testClient = new Anthropic({
      apiKey: key,
      dangerouslyAllowBrowser: true,
    });

    await testClient.messages.create({
      model: MODEL,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say "ok"' }],
    });

    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('401') || message.includes('invalid_api_key')) {
      return { valid: false, error: 'Invalid API key' };
    }
    if (message.includes('rate_limit')) {
      return { valid: false, error: 'Rate limit exceeded. Please try again later.' };
    }
    return { valid: false, error: message };
  }
}

/**
 * Test backend connection
 */
export async function testBackendUrl(url: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return { valid: false, error: `Server returned ${response.status}` };
    }

    const data = await response.json();
    if (data.status === 'ok') {
      return { valid: true };
    }
    return { valid: false, error: 'Invalid response from server' };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Connection failed' };
  }
}

// ============================================
// Backend Proxy API
// ============================================

interface BackendRequest {
  type: 'explain_request' | 'analyze_session' | 'analyze_ordering' | 'predict_discrepancies';
  context: string;
  system: string;
}

/**
 * Call backend proxy API with streaming
 */
async function callBackendStreaming(
  request: BackendRequest,
  onChunk: (text: string) => void
): Promise<string> {
  const backendUrl = await getBackendUrl();
  if (!backendUrl) {
    throw new Error('Backend URL not configured. Please set the backend URL in settings.');
  }

  const response = await fetch(`${backendUrl}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, stream: true }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Backend error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Failed to read stream');
  }

  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        try {
          const event = JSON.parse(data);
          if (event.type === 'text' && event.text) {
            fullText += event.text;
            onChunk(event.text);
          } else if (event.type === 'error') {
            throw new Error(event.message || 'Stream error');
          }
        } catch (e) {
          // Skip unparseable lines (but rethrow actual errors)
          if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
            throw e;
          }
        }
      }
    }
  }

  return fullText;
}

/**
 * Stream using direct Anthropic SDK
 */
async function streamDirect(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  onChunk: (text: string) => void
): Promise<string> {
  const client = await getClient();

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  let fullText = '';

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      const text = event.delta.text;
      fullText += text;
      onChunk(text);
    }
  }

  return fullText;
}

// ============================================
// AI Analysis Functions (support both modes)
// ============================================

/**
 * Explain a single request using AI (streaming by default)
 */
export async function explainRequest(
  request: EnrichedRequest,
  onChunk?: (text: string) => void
): Promise<AIExplanation> {
  const mode = await getAIMode();
  const context = buildRequestContext(request);
  const userMessage = `Please explain this adtech network request:\n\n${context}`;

  let explanation: string;
  const handleChunk = onChunk || (() => {});

  if (mode === 'backend') {
    explanation = await callBackendStreaming(
      {
        type: 'explain_request',
        context: userMessage,
        system: REQUEST_EXPLAINER_SYSTEM,
      },
      handleChunk
    );
  } else {
    explanation = await streamDirect(
      REQUEST_EXPLAINER_SYSTEM,
      userMessage,
      1024,
      handleChunk
    );
  }

  return {
    requestId: request.id,
    explanation,
    timestamp: Date.now(),
  };
}

/**
 * Generate session summary using AI (streaming by default)
 */
export async function analyzeSession(
  requests: EnrichedRequest[],
  flows: AdFlow[],
  onChunk?: (text: string) => void
): Promise<string> {
  const mode = await getAIMode();
  const context = buildSessionContext(requests, flows);
  const userMessage = `Please analyze this ad request session and provide a summary:\n\n${context}`;

  const handleChunk = onChunk || (() => {});

  if (mode === 'backend') {
    return await callBackendStreaming(
      {
        type: 'analyze_session',
        context: userMessage,
        system: SESSION_SUMMARY_SYSTEM,
      },
      handleChunk
    );
  } else {
    return await streamDirect(
      SESSION_SUMMARY_SYSTEM,
      userMessage,
      2048,
      handleChunk
    );
  }
}

/**
 * Analyze ordering issues in depth (streaming by default)
 */
export async function analyzeOrderingIssues(
  requests: EnrichedRequest[],
  onChunk?: (text: string) => void
): Promise<string> {
  const mode = await getAIMode();
  const context = buildOrderingContext(requests);
  const userMessage = `Please analyze the beacon firing sequence for potential timing issues:\n\n${context}`;

  const handleChunk = onChunk || (() => {});

  if (mode === 'backend') {
    return await callBackendStreaming(
      {
        type: 'analyze_ordering',
        context: userMessage,
        system: ORDERING_ANALYZER_SYSTEM,
      },
      handleChunk
    );
  } else {
    return await streamDirect(
      ORDERING_ANALYZER_SYSTEM,
      userMessage,
      1536,
      handleChunk
    );
  }
}

/**
 * Predict potential discrepancies (streaming by default)
 */
export async function predictDiscrepancies(
  requests: EnrichedRequest[],
  flows: AdFlow[],
  onChunk?: (text: string) => void
): Promise<string> {
  const mode = await getAIMode();
  const context = buildSessionContext(requests, flows);
  const userMessage = `Based on these ad request patterns, predict potential measurement discrepancies:\n\n${context}\n\nProvide your predictions in a structured format with risk level (low/medium/high), type, description, and affected vendors/requests.`;

  const handleChunk = onChunk || (() => {});

  if (mode === 'backend') {
    return await callBackendStreaming(
      {
        type: 'predict_discrepancies',
        context: userMessage,
        system: DISCREPANCY_PREDICTOR_SYSTEM,
      },
      handleChunk
    );
  } else {
    return await streamDirect(
      DISCREPANCY_PREDICTOR_SYSTEM,
      userMessage,
      2048,
      handleChunk
    );
  }
}

/**
 * Chat with AI about the current session (streaming)
 */
export async function chat(
  userMessage: string,
  conversationHistory: ChatMessage[],
  requests: EnrichedRequest[],
  selectedRequest: EnrichedRequest | null,
  onChunk?: (text: string) => void
): Promise<string> {
  const mode = await getAIMode();
  const context = buildChatContext(requests, selectedRequest);

  // Build the full message with context
  const contextualMessage = `Here is the current session context:\n\n${context}\n\n---\n\nUser question: ${userMessage}`;

  const handleChunk = onChunk || (() => {});

  if (mode === 'backend') {
    return await callBackendStreamingWithHistory(
      {
        type: 'chat',
        context: contextualMessage,
        system: CHAT_ASSISTANT_SYSTEM,
        history: conversationHistory,
      },
      handleChunk
    );
  } else {
    return await streamDirectWithHistory(
      CHAT_ASSISTANT_SYSTEM,
      contextualMessage,
      conversationHistory,
      2048,
      handleChunk
    );
  }
}

/**
 * Call backend proxy API with streaming and conversation history
 */
async function callBackendStreamingWithHistory(
  request: BackendRequest & { history?: ChatMessage[] },
  onChunk: (text: string) => void
): Promise<string> {
  const backendUrl = await getBackendUrl();
  if (!backendUrl) {
    throw new Error('Backend URL not configured. Please set the backend URL in settings.');
  }

  const response = await fetch(`${backendUrl}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, stream: true }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Backend error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Failed to read stream');
  }

  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        try {
          const event = JSON.parse(data);
          if (event.type === 'text' && event.text) {
            fullText += event.text;
            onChunk(event.text);
          } else if (event.type === 'error') {
            throw new Error(event.message || 'Stream error');
          }
        } catch (e) {
          if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
            throw e;
          }
        }
      }
    }
  }

  return fullText;
}

/**
 * Stream using direct Anthropic SDK with conversation history
 */
async function streamDirectWithHistory(
  systemPrompt: string,
  userMessage: string,
  history: ChatMessage[],
  maxTokens: number,
  onChunk: (text: string) => void
): Promise<string> {
  const client = await getClient();

  // Build messages array with history
  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage },
  ];

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });

  let fullText = '';

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      const text = event.delta.text;
      fullText += text;
      onChunk(text);
    }
  }

  return fullText;
}
