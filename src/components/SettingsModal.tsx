import React, { useState, useEffect } from 'react';
import {
  getApiKey, setApiKey, clearApiKey, testApiKey,
  getBackendUrl, setBackendUrl, clearBackendUrl, testBackendUrl,
  getAIMode, setAIMode, type AIMode
} from '@/lib/ai';
import { useTheme, type ThemeMode, type DarkThemeVariant } from '@/contexts/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { themeMode, darkThemeVariant, setThemeMode, setDarkThemeVariant } = useTheme();
  const [mode, setMode] = useState<AIMode>('direct');
  const [apiKey, setApiKeyState] = useState('');
  const [backendUrl, setBackendUrlState] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [hasExistingBackend, setHasExistingBackend] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    const currentMode = await getAIMode();
    setMode(currentMode);

    const key = await getApiKey();
    if (key) {
      setHasExistingKey(true);
      setApiKeyState('sk-ant-' + '*'.repeat(40));
    } else {
      setHasExistingKey(false);
      setApiKeyState('');
    }

    const url = await getBackendUrl();
    if (url) {
      setHasExistingBackend(true);
      setBackendUrlState(url);
    } else {
      setHasExistingBackend(false);
      setBackendUrlState('');
    }

    setTestResult(null);
  };

  const handleModeChange = async (newMode: AIMode) => {
    setMode(newMode);
    await setAIMode(newMode);
    setTestResult(null);
  };

  const handleTestApiKey = async () => {
    if (!apiKey || apiKey.startsWith('sk-ant-*')) {
      setTestResult({ success: false, message: 'Please enter a valid API key' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testApiKey(apiKey);
      if (result.valid) {
        setTestResult({ success: true, message: 'API key is valid!' });
      } else {
        setTestResult({ success: false, message: result.error || 'Invalid API key' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to test API key' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestBackend = async () => {
    if (!backendUrl) {
      setTestResult({ success: false, message: 'Please enter a backend URL' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testBackendUrl(backendUrl);
      if (result.valid) {
        setTestResult({ success: true, message: 'Backend connection successful!' });
      } else {
        setTestResult({ success: false, message: result.error || 'Connection failed' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to connect to backend' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey || apiKey.startsWith('sk-ant-*')) {
      return;
    }

    setIsSaving(true);
    try {
      await setApiKey(apiKey);
      setHasExistingKey(true);
      setTestResult({ success: true, message: 'API key saved successfully!' });
      setApiKeyState('sk-ant-' + '*'.repeat(40));
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to save API key' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBackend = async () => {
    if (!backendUrl) {
      return;
    }

    setIsSaving(true);
    try {
      await setBackendUrl(backendUrl);
      setHasExistingBackend(true);
      setTestResult({ success: true, message: 'Backend URL saved successfully!' });
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to save backend URL' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearApiKey = async () => {
    await clearApiKey();
    setApiKeyState('');
    setHasExistingKey(false);
    setTestResult({ success: true, message: 'API key cleared' });
  };

  const handleClearBackend = async () => {
    await clearBackendUrl();
    setBackendUrlState('');
    setHasExistingBackend(false);
    setTestResult({ success: true, message: 'Backend URL cleared' });
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setApiKeyState(value);
    setTestResult(null);
    if (hasExistingKey && !value.startsWith('sk-ant-*')) {
      setHasExistingKey(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-[#252526] rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Theme Settings */}
          <div>
            <h3 className="text-sm font-medium mb-3 text-gray-900 dark:text-gray-100">Appearance</h3>
            
            {/* Theme Mode Selection */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme Mode
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setThemeMode('system')}
                  className={`flex-1 px-3 py-2 text-sm rounded border ${
                    themeMode === 'system'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium">System</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Follow OS
                  </div>
                </button>
                <button
                  onClick={() => setThemeMode('light')}
                  className={`flex-1 px-3 py-2 text-sm rounded border ${
                    themeMode === 'light'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium">Light</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Always light
                  </div>
                </button>
                <button
                  onClick={() => setThemeMode('dark')}
                  className={`flex-1 px-3 py-2 text-sm rounded border ${
                    themeMode === 'dark'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium">Dark</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Always dark
                  </div>
                </button>
              </div>
            </div>

            {/* Dark Theme Variant Selection */}
            {themeMode === 'dark' || themeMode === 'system' ? (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dark Theme Variant
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['default', 'blue', 'green', 'purple', 'amber'] as DarkThemeVariant[]).map((variant) => (
                    <button
                      key={variant}
                      onClick={() => setDarkThemeVariant(variant)}
                      className={`px-3 py-2 text-sm rounded border capitalize ${
                        darkThemeVariant === variant
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {variant}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Choose a color variant for dark mode. This affects accent colors and backgrounds.
                </p>
              </div>
            ) : null}
          </div>

          {/* Mode Selection */}
          <div>
            <h3 className="text-sm font-medium mb-3">AI Mode</h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleModeChange('direct')}
                className={`flex-1 px-3 py-2 text-sm rounded border ${
                  mode === 'direct'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="font-medium">Direct API</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Use your own API key
                </div>
              </button>
              <button
                onClick={() => handleModeChange('backend')}
                className={`flex-1 px-3 py-2 text-sm rounded border ${
                  mode === 'backend'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="font-medium">Backend Proxy</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Server-side API key
                </div>
              </button>
            </div>
          </div>

          {/* Direct API Settings */}
          {mode === 'direct' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Claude API Key
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Get your key from{' '}
                  <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    console.anthropic.com
                  </a>
                </p>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={handleKeyChange}
                    placeholder="sk-ant-..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showKey ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleTestApiKey}
                  disabled={isTesting || !apiKey || apiKey.startsWith('sk-ant-*')}
                  className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTesting ? 'Testing...' : 'Test Key'}
                </button>
                <button
                  onClick={handleSaveApiKey}
                  disabled={isSaving || !apiKey || apiKey.startsWith('sk-ant-*')}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Key'}
                </button>
                {hasExistingKey && (
                  <button
                    onClick={handleClearApiKey}
                    className="px-3 py-1.5 text-xs font-medium rounded border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Backend Proxy Settings */}
          {mode === 'backend' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Backend URL
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Enter the URL of your AdFlow backend server
                </p>
                <input
                  type="url"
                  value={backendUrl}
                  onChange={(e) => {
                    setBackendUrlState(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="https://your-backend.workers.dev"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleTestBackend}
                  disabled={isTesting || !backendUrl}
                  className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  onClick={handleSaveBackend}
                  disabled={isSaving || !backendUrl}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save URL'}
                </button>
                {hasExistingBackend && (
                  <button
                    onClick={handleClearBackend}
                    className="px-3 py-1.5 text-xs font-medium rounded border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div
              className={`text-xs px-3 py-2 rounded ${
                testResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              }`}
            >
              {testResult.message}
            </div>
          )}

          {/* Info */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              {mode === 'direct'
                ? 'Your API key is stored locally and sent directly to Anthropic. Charges apply to your Anthropic account.'
                : 'The backend server handles API calls. Your data is sent to the server for AI processing.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
