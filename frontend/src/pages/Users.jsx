import {
  Add,
  ContentCopy,
  Delete,
  Edit,
  LockReset,
  Refresh,
  ToggleOff,
  ToggleOn
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import BaseTable from '../components/BaseTable.jsx';
import BaseDialog from '../components/BaseDialog.jsx';
import FormActions from '../components/form/FormActions.jsx';
import FormField from '../components/form/FormField.jsx';
import FormSection from '../components/form/FormSection.jsx';
import usePermissions from '../hooks/usePermissions.js';
import useNotify from '../hooks/useNotify.jsx';
import {
  activateUser,
  createUser,
  deactivateUser,
  deleteUser,
  listUsers,
  resetUserPassword,
  updateUser
} from '../services/users.js';
import { listGroups } from '../services/groups.js';
import EmptyState from '../components/EmptyState.jsx';
import useAuth from '../hooks/useAuth.js';

const estimatedTotal = (page, rowsPerPage, hasNext, rowsLength) =>
  hasNext ? (page + 2) * rowsPerPage : page * rowsPerPage + rowsLength;

const buildChip = (active) =>
  active ? (
    <Chip size="small" label="Activo" color="success" variant="outlined" />
  ) : (
    <Chip size="small" label="Inactivo" color="default" variant="outlined" />
  );

export default function Users() {
  const { hasPermission } = usePermissions();
  const { notify } = useNotify();
  const { user: currentUser } = useAuth();
  const canRead = hasPermission('users.read');
  const canWrite = hasPermission('users.write');
  const canDeactivate = hasPermission('users.deactivate');
  const canResetPassword = hasPermission('users.reset_password');
  const canDelete = hasPermission('users.delete');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [hasNext, setHasNext] = useState(false);
  const [groups, setGroups] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    email: '',
    name: '',
    password: '',
    isActive: true,
    groupIds: []
  });
  const [formErrors, setFormErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmDeleteValue, setConfirmDeleteValue] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetInfo, setResetInfo] = useState(null);

  const columns = useMemo(
    () => [
      { id: 'username', label: 'Username' },
      { id: 'name', label: 'Nombre' },
      { id: 'email', label: 'Email' },
      {
        id: 'group',
        label: 'Grupos',
        render: (row) =>
          Array.isArray(row.groups) && row.groups.length
            ? row.groups.map((g) => (
                <Chip
                  key={`${row.id}-${g}`}
                  size="small"
                  label={g}
                  className="crm-users__group-chip"
                />
              ))
            : row.group_id || '-'
      },
      {
        id: 'is_active',
        label: 'Estado',
        render: (row) => buildChip(row.is_active)
      },
      {
        id: 'actions',
        label: '',
        align: 'right',
        render: (row) => (
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {canDeactivate && row.id !== currentUser?.id ? (
              <Tooltip title={row.is_active ? 'Desactivar' : 'Activar'}>
                <IconButton
                  size="small"
                  onClick={() => handleToggleActive(row)}
                >
                  {row.is_active ? <ToggleOn color="success" /> : <ToggleOff />}
                </IconButton>
              </Tooltip>
            ) : null}
            {canWrite && row.id !== currentUser?.id ? (
              <Tooltip title="Editar">
                <IconButton size="small" onClick={() => openEdit(row)}>
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
            {canResetPassword && row.id !== currentUser?.id ? (
              <Tooltip title="Reset password (genera temporal)">
                <IconButton size="small" onClick={() => handleResetPassword(row)}>
                  <LockReset fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
            {canDelete && row.id !== currentUser?.id ? (
              <Tooltip title="Eliminar">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(row)}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
          </Stack>
        )
      }
    ],
    [canWrite, canDeactivate, canResetPassword, canDelete, currentUser]
  );

  const breadcrumbs = [
    { label: 'Inicio' },
    { label: 'Usuarios' }
  ];

  const loadGroups = useCallback(
    async (signal) => {
      try {
        const data = await listGroups({ limit: 200, offset: 0, signal });
        setGroups(data);
      } catch {
        // ignore silently to not bloquear UI
      }
    },
    []
  );

  const loadUsers = useCallback(
    async (signal) => {
      if (!canRead) return;
      setLoading(true);
      setError('');

      try {
        const data = await listUsers({
          limit: rowsPerPage,
          offset: page * rowsPerPage,
          signal
        });
        setRows(data);
        setHasNext(data.length === rowsPerPage);
      } catch (err) {
        if (!signal?.aborted) {
          setError(err.message || 'No fue posible cargar usuarios.');
          setRows([]);
          setHasNext(false);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [canRead, page, rowsPerPage]
  );

  useEffect(() => {
    if (!canRead) return undefined;
    const controller = new AbortController();
    loadUsers(controller.signal);
    loadGroups(controller.signal);
    return () => controller.abort();
  }, [canRead, loadUsers, loadGroups]);

  useEffect(() => {
    setPage(0);
  }, [rowsPerPage]);

  const estimatedCount = useMemo(
    () => estimatedTotal(page, rowsPerPage, hasNext, rows.length),
    [page, rowsPerPage, hasNext, rows.length]
  );

  const resetForm = () => {
    setForm({
      email: '',
      name: '',
      password: '',
      isActive: true,
      groupIds: []
    });
    setEditingId(null);
    setDialogError('');
  };

  const openCreate = () => {
    resetForm();
    setDialogMode('create');
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setForm({
      email: row.email || row.username || '',
      name: row.name || '',
      password: '',
      isActive: Boolean(row.is_active),
      groupIds: Array.isArray(row.groups) ? row.groupsIds || [] : row.group_id ? [row.group_id] : []
    });
    setEditingId(row.id);
    setDialogMode('edit');
    setDialogError('');
    setDialogOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!form.email.trim()) {
      errors.email = 'Email es requerido';
    }
    if (!form.groupIds.length) {
      errors.group = 'Selecciona al menos un grupo';
    }
    if (dialogMode === 'create' && !form.password.trim()) {
      errors.password = 'Contraseña requerida';
    }
    if (form.password && form.password.length < 6) {
      errors.password = 'Mínimo 6 caracteres';
    }
    return errors;
  };

  const handleSave = async () => {
    if (!canWrite) return;
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    setDialogError('');

    try {
      if (dialogMode === 'create') {
        await createUser({
          email: form.email.trim(),
          username: form.email,
          name: form.name,
          password: form.password,
          isActive: form.isActive,
          groupId: form.groupIds?.[0] || undefined
        });
        notify.success('Usuario creado.');
      } else {
        await updateUser(editingId, {
          email: form.email.trim(),
          username: form.email,
          name: form.name,
          password: form.password || undefined,
          isActive: form.isActive,
          groupId: form.groupIds?.[0] || undefined
        });
        notify.success('Usuario actualizado.');
      }
      setDialogOpen(false);
      resetForm();
      loadUsers();
    } catch (err) {
      setDialogError(err.message || 'No fue posible guardar el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = (row) => {
    if (!canDeactivate) return;
    if (row.id === currentUser?.id) {
      notify.error('No puedes desactivar tu propio usuario.');
      return;
    }
    setToggleTarget(row);
  };

  const handleDelete = (row) => {
    if (!canDelete) return;
    if (row.id === currentUser?.id) {
      notify.error('No puedes eliminar tu propio usuario.');
      return;
    }
    setDeleteTarget(row);
    setConfirmDeleteValue('');
  };

  const handleResetPassword = (row) => {
    if (!canResetPassword) return;
    if (row.id === currentUser?.id) {
      notify.error('No puedes resetear tu propia contraseña aquí. Usa cambio de contraseña.');
      return;
    }
    setResetTarget(row);
  };

  const confirmToggleStatus = async () => {
    if (!toggleTarget) return;
    setToggleLoading(true);
    try {
      if (toggleTarget.is_active) {
        await deactivateUser(toggleTarget.id);
        notify.info(`Usuario ${toggleTarget.username || ''} desactivado.`);
      } else {
        await activateUser(toggleTarget.id);
        notify.success(`Usuario ${toggleTarget.username || ''} activado.`);
      }
      setToggleTarget(null);
      loadUsers();
    } catch (err) {
      notify.error(err.message || 'No fue posible actualizar el estado.');
    } finally {
      setToggleLoading(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    const expected = (deleteTarget.username || '').trim().toLowerCase();
    const typed = confirmDeleteValue.trim().toLowerCase();
    if (!expected || typed !== expected) {
      notify.error('Debes escribir el username exactamente para confirmar.');
      return;
    }

    setDeleteLoading(true);
    try {
      await deleteUser(deleteTarget.id);
      notify.success('Usuario eliminado (estado: inactivo).');
      setDeleteTarget(null);
      setConfirmDeleteValue('');
      loadUsers();
    } catch (err) {
      notify.error(err.message || 'No fue posible eliminar el usuario.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmResetPassword = async () => {
    if (!resetTarget) return;
    setResetLoading(true);
    try {
      const result = await resetUserPassword(resetTarget.id);
      const temp = result?.tempPassword;
      if (!temp) {
        throw new Error('No se recibió la contraseña generada.');
      }
      setResetInfo({
        user: resetTarget,
        tempPassword: temp
      });
      notify.success('Contraseña temporal generada.');
      setResetTarget(null);
    } catch (err) {
      notify.error(err.message || 'No fue posible resetear el password.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCopyTempPassword = async () => {
    if (!resetInfo?.tempPassword) return;
    if (!navigator?.clipboard?.writeText) {
      notify.error('No pudimos copiar automáticamente. Cópiala manualmente.');
      return;
    }
    try {
      await navigator.clipboard.writeText(resetInfo.tempPassword);
      notify.success('Contraseña copiada al portapapeles.');
    } catch (err) {
      notify.error('No pudimos copiar automáticamente. Cópiala manualmente.');
    }
  };

  const dialogActions = (
    <FormActions spacing={1}>
      <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
      <Button
        variant="contained"
        onClick={handleSave}
        disabled={saving}
      >
        {dialogMode === 'create' ? 'Crear' : 'Guardar'}
      </Button>
    </FormActions>
  );

  return (
    <Page>
      <PageHeader
        breadcrumbs={breadcrumbs}
        title="Usuarios"
        subtitle="Alta, edición y control de accesos."
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              startIcon={<Refresh />}
              onClick={() => loadUsers()}
              disabled={loading}
            >
              Recargar
            </Button>
            {canWrite ? (
              <Button
                startIcon={<Add />}
                variant="contained"
                onClick={openCreate}
              >
                Nuevo usuario
              </Button>
            ) : null}
          </Stack>
        }
      />
      <PageContent>
        <BaseTable
          columns={columns}
          rows={rows}
          loading={loading}
          emptyContent={
            error ? (
              <Alert severity="error">{error}</Alert>
            ) : (
              <EmptyState
                title="Sin usuarios"
                description="Crea usuarios para otorgar accesos y permisos."
              />
            )
          }
          pagination={{
            page,
            rowsPerPage,
            count: estimatedCount,
            onPageChange: (_, newPage) => setPage(newPage),
            onRowsPerPageChange: (event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            },
            labelDisplayedRows: ({ from, to }) =>
              `${from}-${to} de ${estimatedCount || to}`
          }}
        />
      </PageContent>

      <BaseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={dialogMode === 'create' ? 'Nuevo usuario' : 'Editar usuario'}
        subtitle="Completa los campos para guardar"
        actions={dialogActions}
      >
        <Stack className="crm-form">
          {dialogError ? <Alert severity="error">{dialogError}</Alert> : null}
          <FormSection
            title="Identidad"
            subtitle="Datos principales para identificar al usuario dentro del sistema."
          >
            <Box className="crm-form__grid">
              <FormField
                label="Correo"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    email: e.target.value
                  }))
                }
                error={formErrors.email}
                required
              />
              <FormField
                label="Nombre"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre visible en la plataforma"
              />
            </Box>
          </FormSection>

          <FormSection
            title="Acceso"
            subtitle="Controla la contraseña inicial, el grupo principal y el estado operativo."
          >
            <Stack className="crm-form__stack">
              <Box className="crm-form__grid">
                <FormField
                  label="Contraseña"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  helperText={
                    dialogMode === 'edit' ? 'Deja en blanco para mantener la actual.' : ''
                  }
                  error={formErrors.password}
                />
                <FormField
                  component={TextField}
                  select
                  label="Grupo"
                  value={form.groupIds[0] || ''}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      groupIds: e.target.value ? [e.target.value] : []
                    }))
                  }
                  SelectProps={{ native: true }}
                  error={formErrors.group}
                  helperText={formErrors.group || 'Asigna un grupo principal para el acceso.'}
                >
                  <option value="">(Sin grupo)</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </FormField>
              </Box>
              <FormControlLabel
                className="crm-form__toggle-row"
                control={
                  <Switch
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                  />
                }
                label={
                  <Stack spacing={0.25}>
                    <Typography variant="body2" className="crm-text-strong">
                      Usuario activo
                    </Typography>
                    <Typography variant="caption" className="crm-form__hint">
                      Cuando esta activo puede autenticarse y operar normalmente.
                    </Typography>
                  </Stack>
                }
              />
            </Stack>
          </FormSection>
        </Stack>
      </BaseDialog>

      <BaseDialog
        open={Boolean(toggleTarget)}
        onClose={() => {
          if (toggleLoading) return;
          setToggleTarget(null);
        }}
        title={toggleTarget?.is_active ? 'Desactivar usuario' : 'Activar usuario'}
        subtitle="Confirma el cambio de estado"
        dividers={false}
        actions={
          <FormActions spacing={1}>
            <Button onClick={() => setToggleTarget(null)} disabled={toggleLoading}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              color={toggleTarget?.is_active ? 'warning' : 'success'}
              startIcon={toggleTarget?.is_active ? <ToggleOff /> : <ToggleOn />}
              onClick={confirmToggleStatus}
              disabled={toggleLoading}
            >
              {toggleTarget?.is_active ? 'Desactivar' : 'Activar'}
            </Button>
          </FormActions>
        }
      >
        <Stack spacing={2} alignItems="center" className="crm-users__dialog-stack">
          <Box
            className={[
              'crm-users__status-icon-shell',
              toggleTarget?.is_active
                ? 'crm-users__status-icon-shell--warning'
                : 'crm-users__status-icon-shell--success'
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {toggleTarget?.is_active ? (
              <ToggleOff className="crm-users__status-icon" />
            ) : (
              <ToggleOn className="crm-users__status-icon" />
            )}
          </Box>
          <Typography align="center">
            {toggleTarget?.is_active
              ? `Se desactivará el acceso de ${toggleTarget?.username || 'este usuario'}.`
              : `Se activará el acceso de ${toggleTarget?.username || 'este usuario'}.`}
          </Typography>
          <Alert
            severity={toggleTarget?.is_active ? 'warning' : 'info'}
            className="crm-alert--full-width"
          >
            El historial se conserva. Puedes cambiar el estado nuevamente cuando sea necesario.
          </Alert>
        </Stack>
      </BaseDialog>

      <BaseDialog
        open={Boolean(resetTarget)}
        onClose={() => {
          if (resetLoading) return;
          setResetTarget(null);
        }}
        title="Resetear contraseña"
        subtitle="Genera una contraseña temporal y obliga cambio al siguiente acceso"
        dividers={false}
        actions={
          <FormActions spacing={1}>
            <Button onClick={() => setResetTarget(null)} disabled={resetLoading}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="warning"
              startIcon={<LockReset />}
              onClick={confirmResetPassword}
              disabled={resetLoading}
            >
              Generar temporal
            </Button>
          </FormActions>
        }
      >
        <Stack spacing={2} alignItems="center" className="crm-users__dialog-stack">
          <Box className="crm-users__status-icon-shell crm-users__status-icon-shell--warning">
            <LockReset className="crm-users__reset-icon" />
          </Box>
          <Typography align="center">
            Se generará una contraseña temporal para{' '}
            <strong>{resetTarget?.username || resetTarget?.email}</strong>.
          </Typography>
          <Alert severity="info" className="crm-alert--full-width">
            El usuario deberá cambiarla al iniciar sesión. Compártela solo por un canal seguro.
          </Alert>
        </Stack>
      </BaseDialog>

      <BaseDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (deleteLoading) return;
          setDeleteTarget(null);
          setConfirmDeleteValue('');
        }}
        title="Eliminar usuario"
        subtitle="Confirma escribiendo el username exacto"
        actions={
          <FormActions spacing={1}>
            <Button onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<Delete />}
              onClick={confirmDeleteUser}
              disabled={
                deleteLoading ||
                !confirmDeleteValue.trim()
              }
            >
              Eliminar
            </Button>
          </FormActions>
        }
      >
        <Stack spacing={2}>
          <Alert severity="warning">
            Esta acción desactivará al usuario{' '}
            <strong>{deleteTarget?.username}</strong>. Escribe el username para confirmar.
          </Alert>
          <TextField
            label="Escribe el username para confirmar"
            fullWidth
            autoFocus
            value={confirmDeleteValue}
            onChange={(e) => setConfirmDeleteValue(e.target.value)}
            placeholder={deleteTarget?.username || ''}
            error={
              Boolean(confirmDeleteValue) &&
              confirmDeleteValue.trim().toLowerCase() !==
                (deleteTarget?.username || '').trim().toLowerCase()
            }
            helperText="Escribe exactamente el username para habilitar la acción."
          />
        </Stack>
      </BaseDialog>

      <BaseDialog
        open={Boolean(resetInfo)}
        onClose={() => setResetInfo(null)}
        title="Contraseña temporal generada"
        subtitle="Muéstrala solo por un canal seguro. Visible una sola vez."
        dividers={false}
        actions={
          <FormActions spacing={1}>
            <Button
              startIcon={<ContentCopy />}
              onClick={handleCopyTempPassword}
              disabled={!resetInfo?.tempPassword}
            >
              Copiar
            </Button>
            <Button variant="contained" onClick={() => setResetInfo(null)}>
              Cerrar
            </Button>
          </FormActions>
        }
      >
        <Stack spacing={2}>
          <Alert severity="success" icon={<LockReset />}>
            Contraseña temporal creada para {resetInfo?.user?.username || 'el usuario'}.
          </Alert>
          <TextField
            label="Contraseña temporal"
            value={resetInfo?.tempPassword || ''}
            fullWidth
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleCopyTempPassword}
                    disabled={!resetInfo?.tempPassword}
                  >
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <Alert severity="warning">
            Se mostrará solo una vez. Al iniciar sesión se pedirá un cambio obligatorio.
          </Alert>
        </Stack>
      </BaseDialog>
    </Page>
  );
}
