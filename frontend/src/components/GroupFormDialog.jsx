import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  FormControlLabel,
  Stack,
  Switch,
  Typography
} from '@mui/material';
import BaseDialog from './BaseDialog.jsx';
import FormActions from './form/FormActions.jsx';
import FormField from './form/FormField.jsx';
import FormSection from './form/FormSection.jsx';

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
        <FormActions spacing={1}>
          <Button onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={loading}>
            Guardar
          </Button>
        </FormActions>
      }
    >
      <Stack className="crm-form">
        {submitError ? <Alert severity="error">{submitError}</Alert> : null}
        <FormSection
          title="Datos del grupo"
          subtitle="Configura la identidad visible y el contexto del grupo."
        >
          <Stack className="crm-form__stack">
            <FormField
              label="Nombre"
              value={form.name}
              onChange={handleChange('name')}
              error={errors.name}
              disabled={loading}
              required
            />
            <FormField
              label="Descripcion"
              value={form.description}
              onChange={handleChange('description')}
              multiline
              minRows={3}
              disabled={loading}
              placeholder="Describe el alcance operativo o el tipo de equipo."
            />
          </Stack>
        </FormSection>

        <FormSection
          title="Privilegios"
          subtitle="Define si este grupo opera con privilegios administrativos."
        >
          <FormControlLabel
            className="crm-form__toggle-row"
            control={
              <Switch
                checked={form.isAdminGroup}
                onChange={handleChange('isAdminGroup')}
                disabled={loading}
              />
            }
            label={
              <Stack spacing={0.25}>
                <Typography variant="body2" className="crm-text-strong">
                  Grupo administrador
                </Typography>
                <Typography variant="caption" className="crm-form__hint">
                  Si el backend bloquea desactivar el ultimo grupo admin, veras el mensaje aqui.
                </Typography>
              </Stack>
            }
          />
        </FormSection>
      </Stack>
    </BaseDialog>
  );
}
