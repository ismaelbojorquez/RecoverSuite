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
import { Parser } from 'expr-eval';
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
import { listPortfolios } from '../services/portfolios.js';
import { buildRoutePath } from '../routes/paths.js';

const defaultForm = {
  nombre: '',
  descripcion: '',
  regla_formula: '',
  portfolio_ids: [],
  activo: true
};

const formulaParser = new Parser({
  operators: {
    logical: true,
    comparison: true,
    additive: true,
    multiplicative: true,
    power: true,
    factorial: false
  }
});

const formatFallbackRule = (value) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return '-';
  }
  return `adeudo_total * ${(Math.max(0, 1 - parsed / 100)).toFixed(4)}`;
};

const resolveRuleFormula = (row) =>
  String(row?.regla_formula || '').trim() || formatFallbackRule(row?.porcentaje_descuento);

export default function NegotiationSettings() {
  const { hasPermission } = usePermissions();
  const { notify } = useNotify();
  const canRead = hasPermission('negotiations.config.read');
  const canWrite = hasPermission('negotiations.config.write');

  const [rows, setRows] = useState([]);
  const [groups, setGroups] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
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
        const [levels, availableGroups, availablePortfolios] = await Promise.all([
          listDiscountLevels({ includeInactive, signal }),
          listGroups({ limit: 500, offset: 0, signal }).catch(() => []),
          listPortfolios({ limit: 500, offset: 0, signal }).catch(() => [])
        ]);

        setRows(levels);
        setGroups(Array.isArray(availableGroups) ? availableGroups : []);
        setPortfolios(Array.isArray(availablePortfolios) ? availablePortfolios : []);
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
      regla_formula: String(row.regla_formula || '').trim() || formatFallbackRule(row.porcentaje_descuento),
      portfolio_ids: Array.isArray(row.portafolios)
        ? row.portafolios
            .map((portfolio) => Number.parseInt(portfolio.id, 10))
            .filter((id) => Number.isInteger(id) && id > 0)
        : [],
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
    const reglaFormula = String(dialogForm.regla_formula || '').trim();

    if (!nombre) {
      setDialogError('El nombre de la regla es obligatorio.');
      return;
    }

    if (!reglaFormula) {
      setDialogError('La regla es obligatoria.');
      return;
    }

    if (!Array.isArray(dialogForm.portfolio_ids) || dialogForm.portfolio_ids.length === 0) {
      setDialogError('Selecciona al menos un portafolio para la regla.');
      return;
    }

    try {
      formulaParser.parse(reglaFormula);
    } catch (err) {
      setDialogError(`La regla no es válida: ${err.message}`);
      return;
    }

    setSaving(true);
    setDialogError('');

    try {
      const payload = {
        nombre,
        descripcion: String(dialogForm.descripcion || '').trim() || null,
        porcentaje_descuento: 0,
        regla_formula: reglaFormula,
        portfolio_ids: dialogForm.portfolio_ids,
        activo: Boolean(dialogForm.activo)
      };

      if (dialogMode === 'create') {
        await createDiscountLevel(payload);
        notify('Regla de negociación creada', { severity: 'success' });
      } else {
        await updateDiscountLevel(editingId, payload);
        notify('Regla de negociación actualizada', { severity: 'success' });
      }

      setDialogOpen(false);
      await loadData();
    } catch (err) {
      setDialogError(err.message || 'No fue posible guardar la regla de negociación.');
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
        !row.activo ? 'Regla activada' : 'Regla desactivada',
        { severity: 'success' }
      );
      await loadData();
    } catch (err) {
      notify(
        err.message ||
          (!row.activo ? 'No fue posible activar la regla.' : 'No fue posible desactivar la regla.'),
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

  const handleTogglePortfolio = (portfolioId, checked) => {
    setDialogForm((prev) => {
      const next = new Set(
        (Array.isArray(prev.portfolio_ids) ? prev.portfolio_ids : []).map((id) => Number(id))
      );
      if (checked) {
        next.add(portfolioId);
      } else {
        next.delete(portfolioId);
      }
      return {
        ...prev,
        portfolio_ids: Array.from(next)
      };
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
        label: 'Regla',
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
        id: 'regla_formula',
        label: 'Regla',
        minWidth: 260,
        render: (row) => (
          <Typography variant="body2" color="text.secondary">
            {resolveRuleFormula(row)}
          </Typography>
        )
      },
      {
        id: 'portafolios',
        label: 'Portafolios',
        render: (row) => {
          const assignedPortfolios = Array.isArray(row.portafolios) ? row.portafolios : [];
          if (assignedPortfolios.length === 0) {
            return (
              <Chip size="small" variant="outlined" color="warning" label="Sin portafolios" />
            );
          }

          return (
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {assignedPortfolios.slice(0, 2).map((portfolio) => (
                <Chip key={`${row.id}-portfolio-${portfolio.id}`} size="small" label={portfolio.name} />
              ))}
              {assignedPortfolios.length > 2 && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`+${assignedPortfolios.length - 2}`}
                />
              )}
            </Stack>
          );
        }
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
                <Tooltip title="Editar regla">
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
      <Page>
        <PageHeader
          breadcrumbs={[
            { label: 'Inicio', href: buildRoutePath('dashboard') },
            { label: 'Configuracion de negociaciones' }
          ]}
          title="Configuración de Negociaciones"
          subtitle="Parámetros de reglas, grupos y criterios operativos de negociación."
        />
        <PageContent>
          <EmptyState
            eyebrow="Acceso"
            title="Sin permisos para configurar negociaciones"
            description="Este módulo requiere permisos de lectura de configuración de negociaciones."
            icon={null}
          />
        </PageContent>
      </Page>
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
        subtitle="Define reglas de negociación y asigna qué portafolios y grupos pueden utilizarlas."
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
                Nueva regla
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
              title="Reglas configuradas"
              subtitle="Organiza la vista y revisa en qué portafolios y grupos aplica cada regla."
              filters={
                <>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={includeInactive}
                        onChange={(event) => setIncludeInactive(event.target.checked)}
                      />
                    }
                    label="Mostrar reglas inactivas"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Las reglas sin grupos asignados no serán visibles para gestores no administradores.
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
              title="Sin reglas configuradas"
              description="Crea reglas para comenzar con las negociaciones."
              icon={GroupWork}
            />
          }
        />

        <BaseDialog
          open={dialogOpen}
          onClose={closeDialog}
          title={dialogMode === 'create' ? 'Nueva regla de negociación' : 'Editar regla de negociación'}
          subtitle="Estas reglas se usan al crear una negociación en el detalle del cliente."
          actions={
            <FormActions spacing={1}>
              <Button onClick={closeDialog} disabled={saving}>
                Cancelar
              </Button>
              <Button variant="contained" onClick={handleSaveLevel} disabled={saving}>
                {dialogMode === 'create' ? 'Crear regla' : 'Guardar cambios'}
              </Button>
            </FormActions>
          }
        >
          <Stack className="crm-form">
            {dialogError && <Alert severity="error">{dialogError}</Alert>}
            <FormSection
              title="Regla de negociación"
              subtitle="Usa adeudo_total y las keys de saldo dinámico para construir la fórmula operativa."
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
                  label="Regla"
                  value={dialogForm.regla_formula}
                  onChange={(event) =>
                    setDialogForm((prev) => ({
                      ...prev,
                      regla_formula: event.target.value
                    }))
                  }
                  required
                  multiline
                  minRows={3}
                  helperText="Ejemplo: adeudo_total * 0.5 + interes_vencido + honorarios / 3"
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
                <Alert severity="info">
                  <strong>Variables:</strong> `adeudo_total` usa el campo configurado en el portafolio.
                  También puedes usar las keys de campos dinámicos numéricos del mismo portafolio.
                </Alert>
              </Stack>
            </FormSection>

            <FormSection
              title="Portafolios aplicables"
              subtitle="La regla sólo podrá usarse en los portafolios seleccionados."
            >
              {portfolios.length === 0 ? (
                <Alert severity="warning">
                  No se pudieron cargar portafolios para asignar la regla.
                </Alert>
              ) : (
                <Stack className="crm-form__selection-list">
                  {portfolios.map((portfolio) => {
                    const portfolioId = Number.parseInt(portfolio.id, 10);
                    if (!Number.isInteger(portfolioId) || portfolioId <= 0) {
                      return null;
                    }
                    const checked = (dialogForm.portfolio_ids || []).includes(portfolioId);
                    return (
                      <Box
                        key={`discount-portfolio-${portfolio.id}`}
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
                              onChange={(event) =>
                                handleTogglePortfolio(portfolioId, event.target.checked)
                              }
                            />
                          }
                          label={
                            <Stack spacing={0.15}>
                              <Typography variant="body2" className="crm-text-strong">
                                {portfolio.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {portfolio.description || 'Sin descripcion'}
                              </Typography>
                            </Stack>
                          }
                        />
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </FormSection>

            <FormSection
              title="Estado"
              subtitle="Activa o desactiva la regla sin perder su configuracion."
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
                      Regla activa
                    </Typography>
                    <Typography variant="caption" className="crm-form__hint">
                      Las reglas inactivas no aparecerán para gestores no administradores.
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
              ? `Define qué grupos pueden visualizar la regla "${selectedLevel.nombre}".`
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
                subtitle="Marca los grupos que podrán visualizar esta regla."
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
