import React, { createContext, useContext, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getStorageData, setStorageData } from '../utils/storage';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  effectiveTheme: 'dark' | 'light';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return getStorageData<ThemeMode>(STORAGE_KEYS.THEME, 'dark');
  });

  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const root = document.documentElement;
    let computedTheme: 'dark' | 'light' = 'dark';

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      computedTheme = prefersDark ? 'dark' : 'light';
    } else {
      computedTheme = theme;
    }

    setEffectiveTheme(computedTheme);

    if (computedTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    setStorageData(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
