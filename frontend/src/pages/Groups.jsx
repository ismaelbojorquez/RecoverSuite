import {
  Add,
  AdminPanelSettings,
  Close,
  Delete,
  Edit,
  PersonAdd,
  Refresh,
  Security
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
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
import EmptyState from '../components/EmptyState.jsx';
import usePermissions from '../hooks/usePermissions.js';
import useNotify from '../hooks/useNotify.jsx';
import {
  addGroupMember,
  createGroup,
  deleteGroup,
  listGroupMembers,
  listGroupPermissions,
  listGroups,
  removeGroupMember,
  replaceGroupPermissions,
  updateGroup
} from '../services/groups.js';
import { listPermissions } from '../services/permissions.js';
import { listUsers } from '../services/users.js';

const estimatedTotal = (page, rowsPerPage, hasNext, rowsLength) =>
  hasNext ? (page + 2) * rowsPerPage : page * rowsPerPage + rowsLength;

export default function Groups() {
  const { hasPermission } = usePermissions();
  const { notify } = useNotify();

  const canRead = hasPermission('groups.read');
  const canCreate = hasPermission('groups.create');
  const canUpdate = hasPermission('groups.update');
  const canDelete = hasPermission('groups.delete');
  const canAssignPermissions = hasPermission('permissions.assign');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [hasNext, setHasNext] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [dialogError, setDialogError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    isAdminGroup: false
  });
  const [formErrors, setFormErrors] = useState({});

  const [manageOpen, setManageOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupPermissions, setGroupPermissions] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [assignPermissionIds, setAssignPermissionIds] = useState([]);
  const [assignUserId, setAssignUserId] = useState('');
  const [manageLoading, setManageLoading] = useState(false);
  const [manageError, setManageError] = useState('');
  const [membersCount, setMembersCount] = useState({});

  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(null);
  const [confirmDeleteValue, setConfirmDeleteValue] = useState('');

  const columns = useMemo(
    () => [
      { id: 'name', label: 'Nombre' },
      { id: 'description', label: 'Descripción', render: (row) => row.description || '-' },
      {
        id: 'is_admin_group',
        label: 'Admin',
        render: (row) =>
          row.is_admin_group ? (
            <Chip
              size="small"
              color="warning"
              icon={<AdminPanelSettings fontSize="small" />}
              label="Admin"
            />
          ) : (
            <Chip size="small" color="default" label="Normal" />
          )
      },
      {
        id: 'member_count',
        label: 'Miembros',
        render: (row) =>
          typeof membersCount[row.id] === 'number'
            ? membersCount[row.id]
            : row.member_count ?? '—'
      },
      {
        id: 'actions',
        label: '',
        align: 'right',
        render: (row) => (
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {(canAssignPermissions || canUpdate) && (
              <Tooltip title="Permisos y miembros">
                <IconButton size="small" onClick={() => openManage(row)}>
                  <Security fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canUpdate && (
              <Tooltip title="Editar">
                <IconButton size="small" onClick={() => openEdit(row)}>
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {canDelete && (
              <Tooltip title="Eliminar">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(row)}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        )
      }
    ],
    [canAssignPermissions, canUpdate, canDelete, membersCount]
  );

  const breadcrumbs = useMemo(() => [{ label: 'Inicio' }, { label: 'Grupos' }], []);

  const loadGroups = useCallback(
    async (signal) => {
      if (!canRead) return;
      setLoading(true);
      setError('');
      try {
        const data = await listGroups({
          limit: rowsPerPage,
          offset: page * rowsPerPage,
          signal
        });
        setRows(data);
        setHasNext(data.length === rowsPerPage);

        const counts = {};
        await Promise.all(
          data.map(async (g) => {
            try {
              const members = await listGroupMembers({ groupId: g.id, signal });
              counts[g.id] = members.length;
            } catch {
              counts[g.id] = g.member_count ?? undefined;
            }
          })
        );
        setMembersCount(counts);
      } catch (err) {
        if (!signal?.aborted) {
          setError(err.message || 'No fue posible cargar grupos.');
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

  const loadCatalogs = useCallback(async (signal) => {
    try {
      const [perms, users] = await Promise.all([
        listPermissions({ limit: 500, offset: 0, signal }),
        listUsers({ limit: 500, offset: 0, signal })
      ]);
      setAvailablePermissions(perms);
      setAvailableUsers(users);
    } catch {
      // ignore
    }
  }, []);

  const loadGroupDetails = useCallback(
    async (groupId, signal) => {
      setManageLoading(true);
      setManageError('');
      try {
        const [perms, members] = await Promise.all([
          listGroupPermissions({ groupId, signal }),
          listGroupMembers({ groupId, signal })
        ]);
        setGroupPermissions(perms);
        setGroupMembers(members);
        setAssignPermissionIds(perms.map((p) => String(p.id)));
        setMembersCount((prev) => ({ ...prev, [groupId]: members.length }));
      } catch (err) {
        if (!signal?.aborted) {
          setManageError(err.message || 'No fue posible cargar el detalle del grupo.');
          setGroupPermissions([]);
          setGroupMembers([]);
        }
      } finally {
        if (!signal?.aborted) {
          setManageLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!canRead) return undefined;
    const controller = new AbortController();
    loadGroups(controller.signal);
    loadCatalogs(controller.signal);
    return () => controller.abort();
  }, [canRead, loadGroups, loadCatalogs]);

  useEffect(() => {
    setPage(0);
  }, [rowsPerPage]);

  const estimatedCount = useMemo(
    () => estimatedTotal(page, rowsPerPage, hasNext, rows.length),
    [page, rowsPerPage, hasNext, rows.length]
  );

  const resetForm = () => {
    setForm({ name: '', description: '', isAdminGroup: false });
    setEditingId(null);
    setDialogError('');
    setFormErrors({});
  };

  const openCreate = () => {
    resetForm();
    setDialogMode('create');
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setForm({
      name: row.name || '',
      description: row.description || '',
      isAdminGroup: Boolean(row.is_admin_group)
    });
    setEditingId(row.id);
    setDialogMode('edit');
    setDialogError('');
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const errors = {};
    const nameTrimmed = form.name.trim();
    if (!nameTrimmed) errors.name = 'El nombre es requerido';
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    setDialogError('');
    try {
      if (dialogMode === 'create') {
        await createGroup({
          name: nameTrimmed,
          description: form.description,
          isAdminGroup: form.isAdminGroup
        });
        notify.success('Grupo creado.');
      } else {
        await updateGroup(editingId, {
          name: nameTrimmed,
          description: form.description,
          isAdminGroup: form.isAdminGroup
        });
        notify.success('Grupo actualizado.');
      }
      setDialogOpen(false);
      resetForm();
      loadGroups();
    } catch (err) {
      setDialogError(err.message || 'No fue posible guardar el grupo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (row) => {
    setConfirmDeleteGroup(row);
    setConfirmDeleteValue('');
  };

  const openManage = (group) => {
    setSelectedGroup(group);
    setManageError('');
    setManageOpen(true);
    const controller = new AbortController();
    loadGroupDetails(group.id, controller.signal);
    return () => controller.abort();
  };

  const handleSavePermissions = async () => {
    if (!selectedGroup) return;
    try {
      await replaceGroupPermissions({
        groupId: selectedGroup.id,
        permissionIds: assignPermissionIds.map((v) => Number(v))
      });
      notify.success('Permisos actualizados.');
      loadGroupDetails(selectedGroup.id);
    } catch (err) {
      notify.error(err.message || 'No fue posible actualizar permisos.');
    }
  };

  const handleAddMember = async () => {
    if (!assignUserId || !selectedGroup) return;
    try {
      await addGroupMember({
        groupId: selectedGroup.id,
        userId: Number(assignUserId)
      });
      notify.success('Usuario agregado al grupo.');
      setAssignUserId('');
      loadGroupDetails(selectedGroup.id);
    } catch (err) {
      notify.error(err.message || 'No fue posible agregar el usuario.');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!selectedGroup) return;
    try {
      await removeGroupMember({
        groupId: selectedGroup.id,
        userId
      });
      notify.info('Usuario removido.');
      loadGroupDetails(selectedGroup.id);
    } catch (err) {
      notify.error(
        err.message ||
          'No fue posible remover el usuario. Verifica que no sea el último admin.'
      );
    }
  };

  const dialogActions = (
    <FormActions spacing={1}>
      <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
      <Button variant="contained" onClick={handleSave} disabled={saving}>
        {dialogMode === 'create' ? 'Crear' : 'Guardar'}
      </Button>
    </FormActions>
  );

  return (
    <Page>
      <PageHeader
        breadcrumbs={breadcrumbs}
        title="Grupos"
        subtitle="Gestiona roles, permisos y miembros."
        actions={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<Refresh />} onClick={() => loadGroups()} disabled={loading}>
              Recargar
            </Button>
            {canCreate && (
              <Button startIcon={<Add />} variant="contained" onClick={openCreate}>
                Nuevo grupo
              </Button>
            )}
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
                title="Sin grupos"
                description="Crea grupos para asignar permisos y organizar usuarios."
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
            labelDisplayedRows: ({ from, to }) => `${from}-${to} de ${estimatedCount || to}`
          }}
        />
      </PageContent>

      <BaseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={dialogMode === 'create' ? 'Nuevo grupo' : 'Editar grupo'}
        subtitle="Define el nombre y descripción"
        actions={dialogActions}
      >
        <Stack className="crm-form">
          {dialogError ? <Alert severity="error">{dialogError}</Alert> : null}
          <FormSection
            title="Identidad del grupo"
            subtitle="Define el nombre visible y una descripcion corta para el equipo o rol."
          >
            <Stack className="crm-form__stack">
              <FormField
                label="Nombre"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                error={formErrors.name}
                required
              />
              <FormField
                label="Descripcion"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                multiline
                minRows={3}
                placeholder="Resume el alcance o tipo de miembros que tendra este grupo."
              />
            </Stack>
          </FormSection>

          <FormSection
            title="Privilegios"
            subtitle="Controla si este grupo tiene permisos administrativos elevados."
          >
            <FormControlLabel
              className="crm-form__toggle-row"
              control={
                <Switch
                  checked={form.isAdminGroup}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, isAdminGroup: e.target.checked }))
                  }
                />
              }
              label={
                <Stack spacing={0.25}>
                  <Typography variant="body2" className="crm-text-strong">
                    Grupo administrador
                  </Typography>
                  <Typography variant="caption" className="crm-form__hint">
                    Usalo solo en roles con alcance global o control de permisos.
                  </Typography>
                </Stack>
              }
            />
          </FormSection>
        </Stack>
      </BaseDialog>

      <BaseDialog
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        title={selectedGroup ? `Gestionar ${selectedGroup.name}` : 'Gestionar grupo'}
        subtitle="Permisos y miembros"
        maxWidth="md"
        actions={
          <FormActions spacing={1}>
            <Button onClick={() => setManageOpen(false)} startIcon={<Close />}>
              Cerrar
            </Button>
          </FormActions>
        }
      >
        {manageError ? <Alert severity="error" className="crm-alert--spaced">{manageError}</Alert> : null}
        <Stack spacing={3}>
          <FormSection
            title="Permisos"
            subtitle="Selecciona uno o varios permisos para el grupo actual."
          >
            <Paper variant="outlined" className="crm-groups__permissions-panel">
              <Stack className="crm-form__stack">
                <FormField
                  component={TextField}
                  select
                  SelectProps={{ multiple: true, native: true }}
                  label="Permisos asignados"
                  value={assignPermissionIds}
                  onChange={(e) => {
                    const value = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setAssignPermissionIds(value);
                  }}
                  helperText="Selecciona uno o varios permisos para el grupo."
                  disabled={!canAssignPermissions}
                >
                  {availablePermissions.map((perm) => (
                    <option key={perm.id} value={perm.id}>
                      {perm.key} - {perm.label || perm.description || ''}
                    </option>
                  ))}
                </FormField>
                <Stack className="crm-form__compact-actions">
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSavePermissions}
                    disabled={manageLoading || !canAssignPermissions}
                    startIcon={<Security fontSize="small" />}
                  >
                    Guardar permisos
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </FormSection>

          <Divider />

          <FormSection
            title="Miembros"
            subtitle="Asigna usuarios y administra la membresia del grupo."
          >
            <Stack className="crm-form__stack">
              <Box className="crm-form__grid">
                <FormField
                  component={TextField}
                  select
                  label="Agregar usuario"
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  SelectProps={{ native: true }}
                  className="crm-groups__member-select"
                >
                  <option value="">Selecciona un usuario</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email || user.username || `Usuario ${user.id}`}
                    </option>
                  ))}
                </FormField>
                <Stack className="crm-form__compact-actions">
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleAddMember}
                    disabled={!assignUserId || manageLoading || !canUpdate}
                    className="crm-groups__member-add"
                    startIcon={<PersonAdd fontSize="small" />}
                  >
                    Agregar
                  </Button>
                </Stack>
              </Box>
              <Paper variant="outlined">
                <List dense>
                  {groupMembers.length === 0 ? (
                    <ListItem>
                      <ListItemText primary="Sin usuarios asignados." />
                    </ListItem>
                  ) : (
                    groupMembers.map((user) => (
                      <ListItem key={user.id} divider>
                        <ListItemText
                          primary={user.email || user.username || `Usuario ${user.id}`}
                          secondary={user.name || user.nombre || ''}
                        />
                        {canUpdate && (
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={() => handleRemoveMember(user.id)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </ListItemSecondaryAction>
                        )}
                      </ListItem>
                    ))
                  )}
                </List>
              </Paper>
            </Stack>
          </FormSection>
        </Stack>
      </BaseDialog>

      <BaseDialog
        open={Boolean(confirmDeleteGroup)}
        onClose={() => setConfirmDeleteGroup(null)}
        title="Eliminar grupo"
        subtitle="Escribe el nombre del grupo para confirmar"
        actions={
          <FormActions spacing={1}>
            <Button onClick={() => setConfirmDeleteGroup(null)}>Cancelar</Button>
            <Button
              variant="contained"
              color="error"
              disabled={
                !confirmDeleteGroup ||
                confirmDeleteValue.trim().toLowerCase() !==
                  (confirmDeleteGroup?.name || '').trim().toLowerCase()
              }
              onClick={async () => {
                try {
                  await deleteGroup(confirmDeleteGroup.id);
                  notify.success('Grupo eliminado.');
                  setConfirmDeleteGroup(null);
                  setConfirmDeleteValue('');
                  loadGroups();
                } catch (err) {
                  notify.error(
                    err.message ||
                      'No fue posible eliminar el grupo. Verifica que no sea el último admin.'
                  );
                }
              }}
            >
              Eliminar
            </Button>
          </FormActions>
        }
      >
        <Stack spacing={2}>
          <Alert severity="warning">
            Esta acción es irreversible. Si es el último grupo admin, el backend la bloqueará.
          </Alert>
          <TextField
            label="Escribe el nombre del grupo"
            value={confirmDeleteValue}
            onChange={(e) => setConfirmDeleteValue(e.target.value)}
            fullWidth
            placeholder={confirmDeleteGroup?.name || ''}
          />
        </Stack>
      </BaseDialog>
    </Page>
  );
}
