import {
  Refresh,
  Visibility,
  VisibilityOff,
  VpnKeyOutlined
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useMemo, useState } from 'react';
import FormActions from '../components/form/FormActions.jsx';
import FormField from '../components/form/FormField.jsx';
import FormSection from '../components/form/FormSection.jsx';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import useAuth from '../hooks/useAuth.js';
import useMe from '../hooks/useMe.js';
import useNotify from '../hooks/useNotify.jsx';
import { buildRoutePath } from '../routes/paths.js';
import { changeMyPassword } from '../services/users.js';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

const validatePasswordChange = ({ currentPassword, newPassword, confirmPassword }) => {
  if (!currentPassword || !newPassword || !confirmPassword) {
    return 'Debes completar todos los campos de contraseña.';
  }

  if (newPassword.length < 8) {
    return 'La nueva contraseña debe tener al menos 8 caracteres.';
  }

  if (newPassword !== confirmPassword) {
    return 'La confirmación de contraseña no coincide.';
  }

  if (currentPassword === newPassword) {
    return 'La nueva contraseña debe ser diferente a la actual.';
  }

  return '';
};

export default function Profile() {
  const { user: authUser } = useAuth();
  const { notify } = useNotify();
  const { data, loading, error, refresh } = useMe();
  const [formError, setFormError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  const profileUser = data?.user || authUser || null;
  const groups = Array.isArray(data?.groups) ? data.groups : [];
  const permissions = Array.isArray(data?.permissions) ? data.permissions : [];

  const displayName = useMemo(
    () =>
      profileUser?.nombre ||
      profileUser?.name ||
      profileUser?.username ||
      profileUser?.email ||
      'Usuario',
    [profileUser]
  );

  const togglePasswordVisibility = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handlePasswordInput = (field) => (event) => {
    const value = event.target.value;
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const clearPasswordForm = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleChangePassword = async () => {
    const validationError = validatePasswordChange(passwordForm);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSavingPassword(true);
    setFormError('');
    try {
      await changeMyPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      clearPasswordForm();
      notify('Contraseña actualizada correctamente.', { severity: 'success' });
      refresh().catch(() => {});
    } catch (err) {
      setFormError(err.message || 'No fue posible actualizar la contraseña.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: 'Inicio', href: buildRoutePath('dashboard') },
          { label: 'Mi perfil' }
        ]}
        title="Mi perfil"
        subtitle="Consulta tu información general y administra tu seguridad."
        actions={
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => refresh()}
            disabled={loading}
          >
            Actualizar
          </Button>
        }
      />

      <PageContent>
        {error && (
          <Alert severity="error">
            {error.message || 'No fue posible cargar la información del perfil.'}
          </Alert>
        )}

        <Box className="crm-client-detail__financial-grid">
          <Box className="crm-client-detail__financial-col crm-client-detail__financial-col--wide">
            <Paper variant="panel">
              <Stack spacing={2}>
                <Stack className="crm-surface-card__header">
                  <Stack className="crm-surface-card__header-main">
                    <Typography variant="overline" className="crm-surface-card__eyebrow">
                      Cuenta
                    </Typography>
                    <Typography variant="h5" className="crm-surface-card__title">
                      {displayName}
                    </Typography>
                    <Typography variant="body2" className="crm-surface-card__subtitle">
                      Perfil operativo, grupos asignados y permisos efectivos del usuario autenticado.
                    </Typography>
                  </Stack>
                </Stack>

                {loading && !profileUser ? (
                  <Stack spacing={1.5}>
                    <Skeleton variant="text" width="55%" />
                    <Skeleton variant="text" width="70%" />
                    <Skeleton variant="text" width="45%" />
                    <Skeleton variant="text" width="62%" />
                  </Stack>
                ) : (
                  <Stack spacing={1.4}>
                    <Box className="crm-surface-card__meta-grid">
                      <Box className="crm-surface-card__meta-item">
                        <Typography variant="caption" className="crm-surface-card__meta-label">
                          Usuario
                        </Typography>
                        <Typography variant="body2" className="crm-surface-card__meta-value">
                          {profileUser?.username || '-'}
                        </Typography>
                      </Box>
                      <Box className="crm-surface-card__meta-item">
                        <Typography variant="caption" className="crm-surface-card__meta-label">
                          Correo
                        </Typography>
                        <Typography variant="body2" className="crm-surface-card__meta-value">
                          {profileUser?.email || '-'}
                        </Typography>
                      </Box>
                      <Box className="crm-surface-card__meta-item">
                        <Typography variant="caption" className="crm-surface-card__meta-label">
                          Estado
                        </Typography>
                        <Box>
                          <Chip
                            size="small"
                            color={profileUser?.estado === 'activo' ? 'success' : 'default'}
                            label={profileUser?.estado || '-'}
                          />
                        </Box>
                      </Box>
                      <Box className="crm-surface-card__meta-item">
                        <Typography variant="caption" className="crm-surface-card__meta-label">
                          Alta
                        </Typography>
                        <Typography variant="body2" className="crm-surface-card__meta-value">
                          {formatDate(profileUser?.created_at)}
                        </Typography>
                      </Box>
                      <Box className="crm-surface-card__meta-item">
                        <Typography variant="caption" className="crm-surface-card__meta-label">
                          Última actualización
                        </Typography>
                        <Typography variant="body2" className="crm-surface-card__meta-value">
                          {formatDate(profileUser?.updated_at)}
                        </Typography>
                      </Box>
                      <Box className="crm-surface-card__meta-item">
                        <Typography variant="caption" className="crm-surface-card__meta-label">
                          Permisos efectivos
                        </Typography>
                        <Typography variant="body2" className="crm-surface-card__meta-value">
                          {permissions.length}
                        </Typography>
                      </Box>
                    </Box>

                    <Box>
                      <Typography variant="caption" className="crm-surface-card__meta-label">
                        Grupos
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={0.8}
                        flexWrap="wrap"
                        useFlexGap
                        className="crm-surface-card__badge-row"
                        sx={{ mt: 0.7 }}
                      >
                        {groups.length > 0 ? (
                          groups.map((group) => (
                            <Chip
                              key={`profile-group-${group.id || group.name}`}
                              size="small"
                              label={group.name || group.id}
                              variant="outlined"
                            />
                          ))
                        ) : (
                          <Typography variant="body2">Sin grupos asignados</Typography>
                        )}
                      </Stack>
                    </Box>
                  </Stack>
                )}
              </Stack>
            </Paper>
          </Box>

          <Box className="crm-client-detail__financial-col crm-client-detail__financial-col--narrow">
            <Paper variant="panel-sm">
              <Stack spacing={2}>
                <Stack className="crm-surface-card__header">
                  <Stack className="crm-surface-card__header-main">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <VpnKeyOutlined color="primary" fontSize="small" />
                      <Typography variant="subtitle1" className="crm-surface-card__title">
                        Cambiar contraseña
                      </Typography>
                    </Stack>
                    <Typography variant="body2" className="crm-surface-card__subtitle">
                      Actualiza tus credenciales con un flujo claro y más legible.
                    </Typography>
                  </Stack>
                </Stack>

                {profileUser?.requiere_cambio_password && (
                  <Alert severity="warning">
                    Debes actualizar tu contraseña para continuar operando con seguridad.
                  </Alert>
                )}

                {formError && (
                  <Alert severity="error" onClose={() => setFormError('')}>
                    {formError}
                  </Alert>
                )}

                <FormSection
                  title="Actualizacion de credenciales"
                  subtitle="Mantiene un foco claro, mejor legibilidad y confirmacion visual durante el cambio."
                >
                  <Stack className="crm-form__stack">
                    <FormField
                      component={TextField}
                      label="Contraseña actual"
                      type={showPassword.currentPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordInput('currentPassword')}
                      autoComplete="current-password"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              edge="end"
                              onClick={() => togglePasswordVisibility('currentPassword')}
                              aria-label="Mostrar contraseña actual"
                            >
                              {showPassword.currentPassword ? (
                                <VisibilityOff fontSize="small" />
                              ) : (
                                <Visibility fontSize="small" />
                              )}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />

                    <FormField
                      component={TextField}
                      label="Nueva contraseña"
                      type={showPassword.newPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={handlePasswordInput('newPassword')}
                      autoComplete="new-password"
                      helperText="Minimo 8 caracteres."
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              edge="end"
                              onClick={() => togglePasswordVisibility('newPassword')}
                              aria-label="Mostrar nueva contraseña"
                            >
                              {showPassword.newPassword ? (
                                <VisibilityOff fontSize="small" />
                              ) : (
                                <Visibility fontSize="small" />
                              )}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />

                    <FormField
                      component={TextField}
                      label="Confirmar nueva contraseña"
                      type={showPassword.confirmPassword ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordInput('confirmPassword')}
                      autoComplete="new-password"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              edge="end"
                              onClick={() => togglePasswordVisibility('confirmPassword')}
                              aria-label="Mostrar confirmación de contraseña"
                            >
                              {showPassword.confirmPassword ? (
                                <VisibilityOff fontSize="small" />
                              ) : (
                                <Visibility fontSize="small" />
                              )}
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Stack>
                </FormSection>

                <FormActions spacing={1} className="crm-surface-card__action-row">
                  <Button
                    variant="outlined"
                    onClick={() => {
                      clearPasswordForm();
                      setFormError('');
                    }}
                    disabled={savingPassword}
                  >
                    Limpiar
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleChangePassword}
                    disabled={savingPassword}
                  >
                    Guardar contraseña
                  </Button>
                </FormActions>
              </Stack>
            </Paper>
          </Box>
        </Box>
      </PageContent>
    </Page>
  );
}
