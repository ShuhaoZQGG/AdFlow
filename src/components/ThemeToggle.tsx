import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
  const { themeMode, setThemeMode, isDark, darkThemeVariant } = useTheme();
  const [showTooltip, setShowTooltip] = useState(false);

  const toggleTheme = () => {
    // Cycle through: system -> light -> dark -> system
    if (themeMode === 'system') {
      setThemeMode('light');
    } else if (themeMode === 'light') {
      setThemeMode('dark');
    } else {
      setThemeMode('system');
    }
  };

  const getIcon = () => {
    if (themeMode === 'system') {
      // System icon (monitor)
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    } else if (themeMode === 'light') {
      // Sun icon
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    } else {
      // Moon icon
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      );
    }
  };

  const getTooltipText = () => {
    if (themeMode === 'system') {
      return 'Theme: System\nFollows OS preference\nClick to switch to Light';
    } else if (themeMode === 'light') {
      return 'Theme: Light\nAlways light mode\nClick to switch to Dark';
    } else {
      const variantText = darkThemeVariant !== 'default' ? ` (${darkThemeVariant})` : '';
      return `Theme: Dark${variantText}\nAlways dark mode\nClick to switch to System`;
    }
  };

  const getTooltipTitle = () => {
    if (themeMode === 'system') {
      return 'Theme: System';
    } else if (themeMode === 'light') {
      return 'Theme: Light';
    } else {
      return `Theme: Dark${darkThemeVariant !== 'default' ? ` (${darkThemeVariant})` : ''}`;
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={toggleTheme}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label={getTooltipTitle()}
        title={getTooltipTitle()} // Fallback for native tooltip
      >
        {getIcon()}
      </button>
      
      {/* Custom tooltip - appears below button */}
      {showTooltip && (
        <div className="absolute top-full right-0 mt-2 px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 dark:bg-gray-800 rounded shadow-xl whitespace-pre-line z-50 pointer-events-none min-w-[180px] border border-gray-700 dark:border-gray-600 animate-fade-in">
          {/* Tooltip arrow pointing up */}
          <div className="absolute bottom-full right-4 mb-0.5 w-2 h-2 bg-gray-900 dark:bg-gray-800 border-l border-t border-gray-700 dark:border-gray-600 transform rotate-45"></div>
          <div className="font-semibold mb-1 text-white">{getTooltipTitle()}</div>
          <div className="text-gray-300 dark:text-gray-400 text-[10px] leading-relaxed">
            {getTooltipText().split('\n').slice(1).join('\n')}
          </div>
        </div>
      )}
    </div>
  );
}

