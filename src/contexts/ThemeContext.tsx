import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type DarkThemeVariant = 'default' | 'blue' | 'green' | 'purple' | 'amber';

interface ThemeContextType {
  themeMode: ThemeMode;
  darkThemeVariant: DarkThemeVariant;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setDarkThemeVariant: (variant: DarkThemeVariant) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY_THEME_MODE = 'adflow_theme_mode';
const STORAGE_KEY_DARK_VARIANT = 'adflow_dark_variant';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [darkThemeVariant, setDarkThemeVariantState] = useState<DarkThemeVariant>('default');
  const [isDark, setIsDark] = useState(false);

  // Load theme from storage on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedMode = await chrome.storage.local.get(STORAGE_KEY_THEME_MODE);
        const storedVariant = await chrome.storage.local.get(STORAGE_KEY_DARK_VARIANT);
        
        if (storedMode[STORAGE_KEY_THEME_MODE]) {
          setThemeModeState(storedMode[STORAGE_KEY_THEME_MODE] as ThemeMode);
        }
        if (storedVariant[STORAGE_KEY_DARK_VARIANT]) {
          setDarkThemeVariantState(storedVariant[STORAGE_KEY_DARK_VARIANT] as DarkThemeVariant);
        }
      } catch (error) {
        // Fallback to localStorage if chrome.storage is not available (e.g., in dev)
        const storedMode = localStorage.getItem(STORAGE_KEY_THEME_MODE);
        const storedVariant = localStorage.getItem(STORAGE_KEY_DARK_VARIANT);
        if (storedMode) {
          setThemeModeState(storedMode as ThemeMode);
        }
        if (storedVariant) {
          setDarkThemeVariantState(storedVariant as DarkThemeVariant);
        }
      }
    };
    loadTheme();
  }, []);

  // Update dark mode based on theme mode and system preference
  useEffect(() => {
    const updateDarkMode = () => {
      let shouldBeDark = false;
      
      if (themeMode === 'dark') {
        shouldBeDark = true;
      } else if (themeMode === 'light') {
        shouldBeDark = false;
      } else {
        // system mode - check prefers-color-scheme
        shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      setIsDark(shouldBeDark);
      
      // Apply dark class to document root
      const root = document.documentElement;
      if (shouldBeDark) {
        root.classList.add('dark');
        root.setAttribute('data-theme-variant', darkThemeVariant);
      } else {
        root.classList.remove('dark');
        root.removeAttribute('data-theme-variant');
      }
    };

    updateDarkMode();

    // Listen for system preference changes when in system mode
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => updateDarkMode();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [themeMode, darkThemeVariant]);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await chrome.storage.local.set({ [STORAGE_KEY_THEME_MODE]: mode });
    } catch (error) {
      localStorage.setItem(STORAGE_KEY_THEME_MODE, mode);
    }
  };

  const setDarkThemeVariant = async (variant: DarkThemeVariant) => {
    setDarkThemeVariantState(variant);
    try {
      await chrome.storage.local.set({ [STORAGE_KEY_DARK_VARIANT]: variant });
    } catch (error) {
      localStorage.setItem(STORAGE_KEY_DARK_VARIANT, variant);
    }
    // Update the attribute immediately
    if (isDark) {
      document.documentElement.setAttribute('data-theme-variant', variant);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        darkThemeVariant,
        isDark,
        setThemeMode,
        setDarkThemeVariant,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

