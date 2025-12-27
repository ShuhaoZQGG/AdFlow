import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import { useRequestStore } from '@/contexts/RequestStoreContext';
import type { ChatMessage } from '@/lib/ai';

// Markdown component styles for chat messages
const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-2 mb-1">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-2 mb-1">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1.5 mb-0.5">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-xs text-gray-700 dark:text-gray-300 mb-1.5 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside text-xs text-gray-700 dark:text-gray-300 space-y-0.5 mb-1.5 ml-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside text-xs text-gray-700 dark:text-gray-300 space-y-0.5 mb-1.5 ml-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-xs">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-[10px] font-mono">{children}</code>
  ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="p-2 bg-gray-200 dark:bg-gray-600 rounded text-[10px] font-mono overflow-x-auto mb-1.5">{children}</pre>
  ),
};

interface ChatBoxProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function ChatBox({ collapsed, onToggle }: ChatBoxProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    chatMessages,
    chatStreamingText,
    isChatting,
    chatError,
    sendChatMessage,
    clearChat,
  } = useRequestStore();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatStreamingText]);

  // Focus input when expanded
  useEffect(() => {
    if (!collapsed && inputRef.current) {
      inputRef.current.focus();
    }
  }, [collapsed]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isChatting) return;

    sendChatMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e1e1e] flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-purple-600 dark:text-purple-400 transition-transform ${
              collapsed ? '' : 'rotate-90'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="text-sm font-medium text-purple-800 dark:text-purple-300">
            Ask AI
          </span>
          {chatMessages.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400">
              {chatMessages.length}
            </span>
          )}
        </div>

        {chatMessages.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearChat();
            }}
            className="text-[10px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Clear
          </button>
        )}
      </div>

      {/* Chat content */}
      {!collapsed && (
        <div className="flex flex-col h-64">
          {/* Messages area */}
          <div className="flex-1 overflow-auto p-3 space-y-3">
            {chatMessages.length === 0 && !chatStreamingText && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg className="w-8 h-8 mx-auto mb-2 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <p className="text-xs">Ask me anything about your ad requests</p>
                <p className="text-[10px] mt-1 text-gray-400">
                  e.g., "Why did this bid fail?" or "What is prebid?"
                </p>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}

            {/* Streaming response */}
            {chatStreamingText && (
              <div className="flex gap-2">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-2">
                  <Markdown components={markdownComponents}>{chatStreamingText}</Markdown>
                  <span className="inline-block w-1.5 h-3 bg-purple-500 animate-pulse" />
                </div>
              </div>
            )}

            {/* Loading indicator (before streaming starts) */}
            {isChatting && !chatStreamingText && (
              <div className="flex gap-2">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-2">
                  <span className="text-xs text-gray-500">Thinking...</span>
                </div>
              </div>
            )}

            {/* Error message */}
            {chatError && (
              <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs">
                {chatError}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <form onSubmit={handleSubmit} className="flex-shrink-0 p-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                disabled={isChatting}
                className="flex-1 px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isChatting}
                className="px-3 py-1.5 text-xs rounded bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-blue-100 dark:bg-blue-900'
            : 'bg-purple-100 dark:bg-purple-900'
        }`}
      >
        {isUser ? (
          <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )}
      </div>
      <div
        className={`flex-1 rounded-lg p-2 ${
          isUser
            ? 'bg-blue-100 dark:bg-blue-900/30 text-right'
            : 'bg-gray-100 dark:bg-gray-800'
        }`}
      >
        {isUser ? (
          <p className="text-xs text-gray-800 dark:text-gray-200">{message.content}</p>
        ) : (
          <Markdown components={markdownComponents}>{message.content}</Markdown>
        )}
      </div>
    </div>
  );
}
