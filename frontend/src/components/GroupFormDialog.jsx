import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import BaseDialog from './BaseDialog.jsx';

/**
 * Modal para crear/editar grupos.
 *
 * Props:
 * - open: boolean
 * - mode: 'create' | 'edit'
 * - group: datos iniciales (opcional en edición)
 * - loading: boolean para estado de guardado
 * - onClose: function
 * - onSave: async function(formData) => void
 */
export default function GroupFormDialog({
  open,
  mode = 'create',
  group,
  loading = false,
  onClose,
  onSave
}) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    isAdminGroup: false
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (mode === 'edit' && group) {
      setForm({
        name: group.name || '',
        description: group.description || '',
        isAdminGroup: Boolean(group.is_admin_group)
      });
    } else {
      setForm({
        name: '',
        description: '',
        isAdminGroup: false
      });
    }
    setErrors({});
    setSubmitError('');
  }, [mode, group, open]);

  const validate = () => {
    const next = {};
    if (!form.name.trim()) {
      next.name = 'El nombre es requerido';
    }
    return next;
  };

  const handleChange = (field) => (e) => {
    const value = field === 'isAdminGroup' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitError('');

    try {
      await onSave?.({
        name: form.name.trim(),
        description: form.description,
        isAdminGroup: form.isAdminGroup
      });
      onClose?.();
    } catch (err) {
      // Mensajes claros para bloqueos de admin/duplicados
      if (err?.message) {
        setSubmitError(err.message);
      } else {
        setSubmitError('No fue posible guardar el grupo.');
      }
    }
  };

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Nuevo grupo' : 'Editar grupo'}
      subtitle="Define nombre, descripción y privilegios"
      actions={
        <Stack direction="row" spacing={1} justifyContent="flex-end" width="100%">
          <Button onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={loading}>
            Guardar
          </Button>
        </Stack>
      }
    >
      <Stack spacing={2}>
        {submitError ? <Alert severity="error">{submitError}</Alert> : null}
        <TextField
          label="Nombre"
          value={form.name}
          onChange={handleChange('name')}
          fullWidth
          error={Boolean(errors.name)}
          helperText={errors.name}
          disabled={loading}
        />
        <TextField
          label="Descripción"
          value={form.description}
          onChange={handleChange('description')}
          fullWidth
          multiline
          minRows={2}
          disabled={loading}
        />
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2" className="crm-switch-label">
            Grupo administrador
          </Typography>
          <Switch
            checked={form.isAdminGroup}
            onChange={handleChange('isAdminGroup')}
            disabled={loading}
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          Si el backend bloquea desactivar el último grupo admin, verás el mensaje de error aquí.
        </Typography>
      </Stack>
    </BaseDialog>
  );
}
