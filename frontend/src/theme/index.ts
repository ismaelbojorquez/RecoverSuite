import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import {
  getPaletteTokens,
  layoutTokens,
  normalizeThemeMode,
  THEME_MODES,
  THEME_MODE_STORAGE_KEY
} from './palette';
import { getTypographyTokens } from './typography';
import { getShadows } from './shadows';
import { getGradients } from './gradients';
import { getComponents } from './components';
import { motionTokens, shapeTokens, themeBehaviorTokens } from './tokens';

const resolveInitialThemeMode = () => {
  if (typeof window === 'undefined') {
    return themeBehaviorTokens.defaultMode;
  }

  const stored = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
  if (stored === THEME_MODES.light || stored === THEME_MODES.dark) {
    return stored;
  }

  return themeBehaviorTokens.defaultMode;
};

const persistThemeMode = (mode) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
};

const syncThemeModeAttribute = (mode) => {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.setAttribute('data-theme-mode', mode);
};

export const createAppTheme = (mode = THEME_MODES.light) => {
  const normalizedMode = normalizeThemeMode(mode);
  const gradients = getGradients(normalizedMode);

  return createTheme({
    palette: getPaletteTokens(normalizedMode),
    typography: getTypographyTokens(),
    shape: {
      borderRadius: shapeTokens.baseRadius
    },
    transitions: {
      easing: {
        easeInOut: motionTokens.standardEasing,
        easeOut: motionTokens.standardEasing,
        easeIn: motionTokens.standardEasing,
        sharp: motionTokens.standardEasing
      },
      duration: {
        shortest: motionTokens.microDurationMs,
        shorter: motionTokens.microDurationMs,
        short: motionTokens.standardDurationMs,
        standard: motionTokens.standardDurationMs,
        complex: motionTokens.entranceDurationMs,
        enteringScreen: motionTokens.entranceDurationMs,
        leavingScreen: motionTokens.standardDurationMs
      }
    },
    shadows: getShadows(normalizedMode),
    gradients,
    layout: layoutTokens,
    components: getComponents(normalizedMode)
  });
};

const ThemeModeContext = createContext(null);

export const AppThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(resolveInitialThemeMode);

  useEffect(() => {
    persistThemeMode(mode);
    syncThemeModeAttribute(mode);
  }, [mode]);

  const setThemeMode = useCallback((nextMode) => {
    setMode(normalizeThemeMode(nextMode));
  }, []);

  const toggleThemeMode = useCallback(() => {
    setMode((prevMode) =>
      prevMode === THEME_MODES.dark ? THEME_MODES.light : THEME_MODES.dark
    );
  }, []);

  const value = useMemo(
    () => ({
      mode,
      isLightMode: mode === THEME_MODES.light,
      isDarkMode: mode === THEME_MODES.dark,
      setThemeMode,
      toggleThemeMode
    }),
    [mode, setThemeMode, toggleThemeMode]
  );

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return React.createElement(
    ThemeModeContext.Provider,
    { value },
    React.createElement(
      ThemeProvider,
      { theme },
      React.createElement(CssBaseline, null),
      children
    )
  );
};

export const useThemeMode = () => {
  const context = useContext(ThemeModeContext);

  if (!context) {
    throw new Error('useThemeMode debe usarse dentro de AppThemeProvider');
  }

  return context;
};

export {
  layoutTokens,
  normalizeThemeMode,
  THEME_MODES,
  THEME_MODE_STORAGE_KEY,
  getPaletteTokens,
  getTypographyTokens,
  getShadows,
  getGradients,
  getComponents
};
