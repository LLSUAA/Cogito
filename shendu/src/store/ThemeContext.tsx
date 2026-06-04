import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  /** 页面背景色 */
  background: string;
  /** 卡片/面板背景色 */
  surface: string;
  /** 主文字色 */
  text: string;
  /** 次要文字色（提示/标签） */
  textSecondary: string;
  /** 弱化文字色 */
  textMuted: string;
  /** 按钮背景色 */
  buttonBg: string;
  /** 按钮边框色 */
  buttonBorder: string;
  /** 按钮文字色 */
  buttonText: string;
  /** 面板标题色 */
  cardTitle: string;
  /** 行分割线色 */
  divider: string;
  /** StatusBar 风格 */
  statusBarStyle: 'light' | 'dark';
}

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
}

// ---------------------------------------------------------------------------
// 色彩规范
// ---------------------------------------------------------------------------

const LightColors: ThemeColors = {
  background: '#F8F9FA',
  surface: '#FFFFFF',
  text: '#1A1D20',
  textSecondary: '#5A6570',
  textMuted: '#8B95A1',
  buttonBg: '#3A5068',
  buttonBorder: '#4A6078',
  buttonText: '#FFFFFF',
  cardTitle: '#5A6570',
  divider: '#E2E6EA',
  statusBarStyle: 'dark',
};

const DarkColors: ThemeColors = {
  background: '#1A1D23',
  surface: '#22272E',
  text: '#E1E4E8',
  textSecondary: '#8A9BAA',
  textMuted: '#5A6A7A',
  buttonBg: '#2A3A4A',
  buttonBorder: '#3D5060',
  buttonText: '#E8E0D4',
  cardTitle: '#8A9BAA',
  divider: '#2D3540',
  statusBarStyle: 'light',
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  const toggleTheme = useCallback(() => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      colors: mode === 'dark' ? DarkColors : LightColors,
      toggleTheme,
    }),
    [mode, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return ctx;
}