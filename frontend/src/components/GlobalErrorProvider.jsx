import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { onApiError } from '../utils/api.js';
import useNotify from '../hooks/useNotify.jsx';

const buildDialogState = (payload) => ({
  open: true,
  title: payload?.title || 'Error',
  message: payload?.message || 'Ocurrio un error inesperado.'
});

export default function GlobalErrorProvider({ children }) {
  const [dialog, setDialog] = useState({ open: false });
  const { notify } = useNotify();

  useEffect(() => {
    const unsubscribe = onApiError((payload) => {
      if (!payload) {
        return;
      }

      if (payload.mode === 'dialog') {
        setDialog(buildDialogState(payload));
        return;
      }

      notify(payload.message || 'Ocurrio un error.', {
        severity: payload.severity,
        title: payload.title,
        source: 'api-global'
      });
    });

    return unsubscribe;
  }, [notify]);

  const handleDialogClose = () => {
    setDialog((prev) => ({ ...prev, open: false }));
  };

  return (
    <>
      {children}
      <Dialog open={dialog.open} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>{dialog.title}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {dialog.message}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} variant="contained">
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
