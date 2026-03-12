import { createContext, useContext, useMemo, useState, useCallback, useRef } from 'react';
import { Alert, Snackbar, Stack, Typography } from '@mui/material';
import { getRecentApiError } from '../utils/api.js';

const NotifyContext = createContext({
  notify: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
  config: {}
});

const normalizeSeverity = (severity) => {
  if (['success', 'info', 'warning', 'error'].includes(severity)) {
    return severity;
  }
  return 'info';
};

export function NotifyProvider({ children }) {
  const [snackbar, setSnackbar] = useState({ open: false });
  const lastToastRef = useRef({ key: '', at: 0 });

  const notify = useCallback((message, options = {}) => {
    const severity = normalizeSeverity(options.severity);
    const title = options.title;
    const normalizedMessage = message || 'Accion realizada';
    const isGlobalApiNotification = options.source === 'api-global';
    const dedupeKey = `${severity}|${normalizedMessage}`;
    const now = Date.now();

    if (lastToastRef.current.key === dedupeKey && now - lastToastRef.current.at <= 800) {
      return;
    }

    if (!isGlobalApiNotification && severity === 'error') {
      const recentApiError = getRecentApiError();
      if (recentApiError?.message === normalizedMessage) {
        return;
      }
    }

    setSnackbar({
      open: true,
      key: now,
      message: normalizedMessage,
      severity,
      title
    });
    lastToastRef.current = { key: dedupeKey, at: now };
  }, []);

  const handleClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const success = useCallback(
    (message, options = {}) => notify(message, { ...options, severity: 'success' }),
    [notify]
  );
  const error = useCallback(
    (message, options = {}) => notify(message, { ...options, severity: 'error' }),
    [notify]
  );
  const warning = useCallback(
    (message, options = {}) => notify(message, { ...options, severity: 'warning' }),
    [notify]
  );
  const info = useCallback(
    (message, options = {}) => notify(message, { ...options, severity: 'info' }),
    [notify]
  );

  // Compatibilidad con notify.success(...), etc.
  notify.success = success;
  notify.error = error;
  notify.warning = warning;
  notify.info = info;

  const value = useMemo(
    () => ({
      notify,
      success,
      error,
      warning,
      info
    }),
    [notify, success, error, warning, info]
  );

  return (
    <NotifyContext.Provider value={value}>
      {children}
      <Snackbar
        key={snackbar.key}
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleClose}
          severity={normalizeSeverity(snackbar.severity)}
          variant="filled"
          icon={false}
          className="crm-notify-alert"
        >
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">
              {snackbar.title ||
                {
                  success: 'Exito',
                  error: 'Error',
                  warning: 'Aviso',
                  info: 'Informacion'
                }[normalizeSeverity(snackbar.severity)]}
            </Typography>
            <Typography variant="body2">{snackbar.message}</Typography>
          </Stack>
        </Alert>
      </Snackbar>
    </NotifyContext.Provider>
  );
}

export default function useNotify() {
  const ctx = useContext(NotifyContext);
  if (!ctx) {
    throw new Error('useNotify debe usarse dentro de NotifyProvider');
  }
  return ctx;
}
