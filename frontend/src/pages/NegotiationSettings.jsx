import {
  Add,
  Edit,
  GroupWork,
  PowerSettingsNew,
  Refresh,
  Security
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  Tooltip,
  Typography
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import BaseDialog from '../components/BaseDialog.jsx';
import BaseTable from '../components/BaseTable.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FormActions from '../components/form/FormActions.jsx';
import FormField from '../components/form/FormField.jsx';
import FormSection from '../components/form/FormSection.jsx';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import TableToolbar from '../components/TableToolbar.jsx';
import useNotify from '../hooks/useNotify.jsx';
import usePermissions from '../hooks/usePermissions.js';
import {
  createDiscountLevel,
  listDiscountLevels,
  setDiscountLevelGroups,
  updateDiscountLevel
} from '../services/negotiations.js';
import { listGroups } from '../services/groups.js';
import { buildRoutePath } from '../routes/paths.js';

const defaultForm = {
  nombre: '',
  descripcion: '',
  porcentaje_descuento: '',
  activo: true
};

const parsePercentage = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatPercentage = (value) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return '-';
  }
  return `${parsed.toFixed(2)}%`;
};

export default function NegotiationSettings() {
  const { hasPermission } = usePermissions();
  const { notify } = useNotify();
  const canRead = hasPermission('negotiations.config.read');
  const canWrite = hasPermission('negotiations.config.write');

  const [rows, setRows] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [dialogForm, setDialogForm] = useState(defaultForm);
  const [dialogError, setDialogError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [savingGroups, setSavingGroups] = useState(false);
  const [groupDialogError, setGroupDialogError] = useState('');

  const loadData = useCallback(
    async (signal) => {
      if (!canRead) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [levels, availableGroups] = await Promise.all([
          listDiscountLevels({ includeInactive, signal }),
          listGroups({ limit: 500, offset: 0, signal }).catch(() => [])
        ]);

        setRows(levels);
        setGroups(Array.isArray(availableGroups) ? availableGroups : []);
      } catch (err) {
        if (!signal?.aborted) {
          setError(err.message || 'No fue posible cargar la configuracion de negociaciones.');
          setRows([]);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [canRead, includeInactive]
  );

  useEffect(() => {
    if (!canRead) {
      return undefined;
    }

    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [canRead, loadData]);

  const openCreateDialog = () => {
    setDialogMode('create');
    setDialogForm(defaultForm);
    setDialogError('');
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEditDialog = (row) => {
    setDialogMode('edit');
    setEditingId(row.id);
    setDialogForm({
      nombre: row.nombre || '',
      descripcion: row.descripcion || '',
      porcentaje_descuento:
        row.porcentaje_descuento !== undefined && row.porcentaje_descuento !== null
          ? String(row.porcentaje_descuento)
          : '',
      activo: Boolean(row.activo)
    });
    setDialogError('');
    setDialogOpen(true);
  };

  const openGroupDialog = (row) => {
    setSelectedLevel(row);
    const selected = Array.isArray(row.grupos)
      ? row.grupos
          .map((group) => Number.parseInt(group.id, 10))
          .filter((id) => Number.isInteger(id) && id > 0)
      : [];
    setSelectedGroupIds(selected);
    setGroupDialogError('');
    setGroupDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) {
      return;
    }
    setDialogOpen(false);
    setDialogError('');
    setEditingId(null);
  };

  const closeGroupDialog = () => {
    if (savingGroups) {
      return;
    }
    setGroupDialogOpen(false);
    setSelectedLevel(null);
    setSelectedGroupIds([]);
    setGroupDialogError('');
  };

  const handleSaveLevel = async () => {
    const nombre = String(dialogForm.nombre || '').trim();
    const porcentaje = parsePercentage(dialogForm.porcentaje_descuento);

    if (!nombre) {
      setDialogError('El nombre del nivel es obligatorio.');
      return;
    }

    if (porcentaje === null || porcentaje < 0 || porcentaje > 100) {
      setDialogError('El porcentaje debe estar entre 0 y 100.');
      return;
    }

    setSaving(true);
    setDialogError('');

    try {
      const payload = {
        nombre,
        descripcion: String(dialogForm.descripcion || '').trim() || null,
        porcentaje_descuento: porcentaje,
        activo: Boolean(dialogForm.activo)
      };

      if (dialogMode === 'create') {
        await createDiscountLevel(payload);
        notify('Nivel de descuento creado', { severity: 'success' });
      } else {
        await updateDiscountLevel(editingId, payload);
        notify('Nivel de descuento actualizado', { severity: 'success' });
      }

      setDialogOpen(false);
      await loadData();
    } catch (err) {
      setDialogError(err.message || 'No fue posible guardar el nivel de descuento.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLevelActive = async (row) => {
    try {
      await updateDiscountLevel(row.id, {
        activo: !row.activo
      });
      notify(
        !row.activo ? 'Nivel activado' : 'Nivel desactivado',
        { severity: 'success' }
      );
      await loadData();
    } catch (err) {
      notify(
        err.message ||
          (!row.activo ? 'No fue posible activar el nivel.' : 'No fue posible desactivar el nivel.'),
        { severity: 'error' }
      );
    }
  };

  const handleToggleGroup = (groupId, checked) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(groupId);
      } else {
        next.delete(groupId);
      }
      return Array.from(next);
    });
  };

  const handleSaveGroups = async () => {
    if (!selectedLevel?.id) {
      return;
    }

    setSavingGroups(true);
    setGroupDialogError('');
    try {
      await setDiscountLevelGroups({
        discountLevelId: selectedLevel.id,
        groupIds: selectedGroupIds
      });
      notify('Grupos autorizados actualizados', { severity: 'success' });
      setGroupDialogOpen(false);
      await loadData();
    } catch (err) {
      setGroupDialogError(err.message || 'No fue posible guardar la asignacion de grupos.');
    } finally {
      setSavingGroups(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: 'nombre',
        label: 'Nivel',
        render: (row) => (
          <Stack spacing={0.25}>
            <Typography variant="body2" className="crm-text-strong">
              {row.nombre}
            </Typography>
            {row.descripcion ? (
              <Typography variant="caption" color="text.secondary">
                {row.descripcion}
              </Typography>
            ) : null}
          </Stack>
        )
      },
      {
        id: 'porcentaje_descuento',
        label: 'Descuento',
        render: (row) => formatPercentage(row.porcentaje_descuento)
      },
      {
        id: 'grupos',
        label: 'Grupos autorizados',
        render: (row) => {
          const groupsAllowed = Array.isArray(row.grupos) ? row.grupos : [];
          if (groupsAllowed.length === 0) {
            return (
              <Chip size="small" variant="outlined" color="warning" label="Sin grupos" />
            );
          }

          return (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {groupsAllowed.slice(0, 2).map((group) => (
                <Chip key={`${row.id}-group-${group.id}`} size="small" label={group.name} />
              ))}
              {groupsAllowed.length > 2 && (
                <Chip size="small" variant="outlined" label={`+${groupsAllowed.length - 2}`} />
              )}
            </Stack>
          );
        }
      },
      {
        id: 'activo',
        label: 'Estado',
        render: (row) =>
          row.activo ? (
            <Chip size="small" color="success" label="Activo" />
          ) : (
            <Chip size="small" color="default" label="Inactivo" />
          )
      },
      {
        id: 'actions',
        label: '',
        align: 'right',
        render: (row) => (
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {canWrite && (
              <>
                <Tooltip title="Editar nivel">
                  <IconButton size="small" onClick={() => openEditDialog(row)}>
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Asignar grupos">
                  <IconButton size="small" onClick={() => openGroupDialog(row)}>
                    <Security fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={row.activo ? 'Desactivar' : 'Activar'}>
                  <IconButton
                    size="small"
                    color={row.activo ? 'warning' : 'success'}
                    onClick={() => handleToggleLevelActive(row)}
                  >
                    <PowerSettingsNew fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Stack>
        )
      }
    ],
    [canWrite]
  );

  if (!canRead) {
    return (
      <Paper variant="page">
        <Stack spacing={1}>
          <Typography variant="h6">Sin permisos</Typography>
          <Typography variant="body2" color="text.secondary">
            No tienes acceso a la configuracion de negociaciones.
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: 'Inicio', href: buildRoutePath('dashboard') },
          { label: 'Configuracion de negociaciones' }
        ]}
        title="Configuración de Negociaciones"
        subtitle="Define niveles de descuento y asigna qué grupos pueden utilizarlos."
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => loadData()}
              disabled={loading}
            >
              Actualizar
            </Button>
            {canWrite && (
              <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog}>
                Nuevo nivel
              </Button>
            )}
          </Stack>
        }
      />

      <PageContent>
        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <BaseTable
          toolbar={
            <TableToolbar
              eyebrow="Filtros"
              title="Niveles configurados"
              subtitle="Organiza la vista y controla si los niveles inactivos deben formar parte del análisis."
              filters={
                <>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={includeInactive}
                        onChange={(event) => setIncludeInactive(event.target.checked)}
                      />
                    }
                    label="Mostrar niveles inactivos"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Los niveles sin grupos asignados no serán visibles para gestores no administradores.
                  </Typography>
                </>
              }
            />
          }
          columns={columns}
          rows={rows}
          loading={loading}
          emptyContent={
            <EmptyState
              title="Sin niveles configurados"
              description="Crea niveles de descuento para comenzar con las negociaciones."
              icon={GroupWork}
            />
          }
        />

        <BaseDialog
          open={dialogOpen}
          onClose={closeDialog}
          title={dialogMode === 'create' ? 'Nuevo nivel de descuento' : 'Editar nivel de descuento'}
          subtitle="Estos niveles se usan al crear una negociación en el detalle del cliente."
          actions={
            <FormActions spacing={1}>
              <Button onClick={closeDialog} disabled={saving}>
                Cancelar
              </Button>
              <Button variant="contained" onClick={handleSaveLevel} disabled={saving}>
                {dialogMode === 'create' ? 'Crear nivel' : 'Guardar cambios'}
              </Button>
            </FormActions>
          }
        >
          <Stack className="crm-form">
            {dialogError && <Alert severity="error">{dialogError}</Alert>}
            <FormSection
              title="Nivel de descuento"
              subtitle="Configura el nombre, porcentaje y descripcion visible para negociaciones."
            >
              <Stack className="crm-form__stack">
                <FormField
                  label="Nombre"
                  value={dialogForm.nombre}
                  onChange={(event) =>
                    setDialogForm((prev) => ({ ...prev, nombre: event.target.value }))
                  }
                  required
                />
                <FormField
                  label="Porcentaje de descuento"
                  type="number"
                  value={dialogForm.porcentaje_descuento}
                  onChange={(event) =>
                    setDialogForm((prev) => ({
                      ...prev,
                      porcentaje_descuento: event.target.value
                    }))
                  }
                  required
                  inputProps={{ min: 0, max: 100, step: '0.01' }}
                />
                <FormField
                  label="Descripcion"
                  value={dialogForm.descripcion}
                  onChange={(event) =>
                    setDialogForm((prev) => ({ ...prev, descripcion: event.target.value }))
                  }
                  multiline
                  minRows={3}
                />
              </Stack>
            </FormSection>

            <FormSection
              title="Estado"
              subtitle="Activa o desactiva el nivel sin perder su configuracion."
            >
              <FormControlLabel
                className="crm-form__toggle-row"
                control={
                  <Switch
                    checked={dialogForm.activo}
                    onChange={(event) =>
                      setDialogForm((prev) => ({ ...prev, activo: event.target.checked }))
                    }
                  />
                }
                label={
                  <Stack spacing={0.25}>
                    <Typography variant="body2" className="crm-text-strong">
                      Nivel activo
                    </Typography>
                    <Typography variant="caption" className="crm-form__hint">
                      Los niveles inactivos no apareceran para gestores no administradores.
                    </Typography>
                  </Stack>
                }
              />
            </FormSection>
          </Stack>
        </BaseDialog>

        <BaseDialog
          open={groupDialogOpen}
          onClose={closeGroupDialog}
          title="Grupos autorizados"
          subtitle={
            selectedLevel
              ? `Define qué grupos pueden visualizar el nivel "${selectedLevel.nombre}".`
              : undefined
          }
          actions={
            <FormActions spacing={1}>
              <Button onClick={closeGroupDialog} disabled={savingGroups}>
                Cancelar
              </Button>
              <Button variant="contained" onClick={handleSaveGroups} disabled={savingGroups}>
                Guardar grupos
              </Button>
            </FormActions>
          }
        >
          <Stack className="crm-form">
            {groupDialogError && <Alert severity="error">{groupDialogError}</Alert>}
            {groups.length === 0 ? (
              <Alert severity="warning">
                No se pudieron cargar grupos. Verifica permisos de lectura de grupos.
              </Alert>
            ) : (
              <FormSection
                title="Acceso por grupos"
                subtitle="Marca los grupos que podran visualizar este nivel de descuento."
              >
                <Stack className="crm-form__selection-list">
                  {groups.map((group) => {
                    const groupId = Number.parseInt(group.id, 10);
                    if (!Number.isInteger(groupId) || groupId <= 0) {
                      return null;
                    }
                    const checked = selectedGroupIds.includes(groupId);
                    return (
                      <Box
                        key={`discount-group-${group.id}`}
                        className={[
                          'crm-form__selection-item',
                          checked ? 'crm-form__selection-item--selected' : ''
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={checked}
                              onChange={(event) => handleToggleGroup(groupId, event.target.checked)}
                            />
                          }
                          label={
                            <Stack spacing={0.15}>
                              <Typography variant="body2" className="crm-text-strong">
                                {group.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {group.description || 'Sin descripcion'}
                              </Typography>
                            </Stack>
                          }
                        />
                      </Box>
                    );
                  })}
                </Stack>
              </FormSection>
            )}
          </Stack>
        </BaseDialog>
      </PageContent>
    </Page>
  );
}
