import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Box,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import BaseDialog from './BaseDialog.jsx';
import FormActions from './form/FormActions.jsx';
import FormField from './form/FormField.jsx';
import FormSection from './form/FormSection.jsx';

const emailRegex =
  /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
};

export default function UserFormDialog({
  open,
  mode = 'create', // create | edit
  user,
  groups = [],
  existingUsernames = [],
  loading = false,
  onClose,
  onSave
}) {
  const [form, setForm] = useState({
    email: '',
    name: '',
    groupIds: [],
    isActive: true
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (mode === 'edit' && user) {
      setForm({
        email: user.email || '',
        name: user.name || user.nombre || '',
        groupIds: ensureArray(user.groupIds || user.groupsIds || user.groups || user.group_id),
        isActive: user.is_active !== undefined ? Boolean(user.is_active) : true
      });
    } else {
      setForm({
        email: '',
        name: '',
        groupIds: [],
        isActive: true
      });
    }
    setErrors({});
    setSubmitError('');
  }, [mode, user]);

  const existingSet = useMemo(
    () =>
      new Set(
        (existingUsernames || [])
          .filter(Boolean)
          .map((v) => String(v).trim().toLowerCase())
      ),
    [existingUsernames]
  );

  const validate = () => {
    const next = {};
    const username = form.email.trim().toLowerCase();
    const email = form.email.trim();

    if (!email) next.email = 'Email es requerido';
    if (email && !emailRegex.test(email)) next.email = 'Email inválido';

    // unicidad (solo en creación, o si cambió)
    if (
      username &&
      existingSet.has(username) &&
      (!user || username !== (user.username || '').toLowerCase())
    ) {
      next.email = 'Email ya existe';
    }

    if (!form.groupIds.length) {
      next.groupIds = 'Selecciona al menos un grupo';
    }

    return next;
  };

  const handleChange = (field) => (e) => {
    const value = field === 'isActive' ? e.target.checked : e.target.value;
    if (field === 'email') {
      setForm((prev) => ({ ...prev, email: value }));
      return;
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleGroupsChange = (event) => {
    const value = event.target.value;
    const list = Array.isArray(value) ? value : [value];
    setForm((prev) => ({ ...prev, groupIds: list.filter(Boolean) }));
  };

  const handleSubmit = async () => {
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length) return;
    setSubmitError('');

    try {
      await onSave?.({
        ...form,
        email: form.email.trim(),
        groupIds: form.groupIds
      });
    } catch (err) {
      setSubmitError(err?.message || 'No fue posible guardar el usuario.');
    }
  };

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}
      subtitle="Define credenciales, datos y grupos"
      actions={
        <FormActions spacing={1}>
          <Button onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={loading}>
            Guardar
          </Button>
        </FormActions>
      }
    >
      <Stack className="crm-form">
        {submitError ? <Alert severity="error">{submitError}</Alert> : null}
        <FormSection
          title="Identidad"
          subtitle="Captura los datos base del usuario y su correo corporativo."
        >
          <Box className="crm-form__grid">
            <FormField
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              error={errors.email}
              autoComplete="email"
            />
            <FormField
              label="Nombre"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="Nombre visible dentro del sistema"
            />
          </Box>
        </FormSection>

        <FormSection
          title="Acceso"
          subtitle="Asigna grupos y define el estado operativo del usuario."
        >
          <Stack className="crm-form__stack">
            <FormField
              component={TextField}
              select
              SelectProps={{ multiple: true }}
              label="Grupos asignados"
              value={form.groupIds}
              onChange={handleGroupsChange}
              error={errors.groupIds}
              helperText={errors.groupIds || 'Selecciona al menos un grupo.'}
            >
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </FormField>

            {mode === 'edit' ? (
              <FormControlLabel
                className="crm-form__toggle-row"
                control={
                  <Switch
                    checked={form.isActive}
                    onChange={handleChange('isActive')}
                  />
                }
                label={
                  <Stack spacing={0.25}>
                    <Typography variant="body2" className="crm-text-strong">
                      Usuario activo
                    </Typography>
                    <Typography variant="caption" className="crm-form__hint">
                      Controla si el usuario puede seguir accediendo sin eliminar su historial.
                    </Typography>
                  </Stack>
                }
              />
            ) : (
              <Typography variant="caption" className="crm-form__note">
                El usuario se crea activo por defecto y podra operar inmediatamente.
              </Typography>
            )}
          </Stack>
        </FormSection>
      </Stack>
    </BaseDialog>
  );
}
