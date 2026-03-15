import {
  AddTask,
  CancelOutlined,
  CheckCircleOutline,
  Percent,
  Refresh
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { Parser } from 'expr-eval';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import BaseDialog from '../../../components/BaseDialog.jsx';
import BaseTable from '../../../components/BaseTable.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import useNotify from '../../../hooks/useNotify.jsx';
import {
  createNegotiation,
  listAvailableDiscountLevels,
  listClientNegotiations,
  updateNegotiationStatus
} from '../../../services/negotiations.js';
import { getPortfolioById } from '../../../services/portfolios.js';

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN'
});
const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short'
});
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

const defaultCreateForm = {
  nivel_descuento_id: '',
  referencia: '',
  observaciones: '',
  monto_base_total: '',
  monto_negociado_total: ''
};

const defaultStatusForm = {
  observaciones: '',
  monto_negociado_total: ''
};

const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const roundCurrency = (value) => Math.round(value * 100) / 100;

const normalizeText = (value) => String(value ?? '').trim();

const normalizeVariableName = (value) => {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+/g, '_')
    .toLowerCase()
    .trim();

  if (!normalized) {
    return '';
  }

  return /^[a-z_]/.test(normalized) ? normalized : `v_${normalized}`;
};

const buildFallbackRuleFormula = (value) =>
  `adeudo_total * ${(Math.max(0, 1 - (toNumber(value) ?? 0) / 100)).toFixed(4)}`;

const resolveRuleFormula = (row) =>
  normalizeText(row?.regla_formula) || buildFallbackRuleFormula(row?.porcentaje_descuento);

const formatCurrency = (value) => {
  const parsed = toNumber(value);
  if (parsed === null) {
    return '-';
  }
  return currencyFormatter.format(parsed);
};

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return dateFormatter.format(date);
};

const normalizeCredits = (credits) => (Array.isArray(credits) ? credits : []);

const parsePrimaryBalance = (credit) => {
  const balances = Array.isArray(credit?.balances) ? credit.balances : [];
  const principal = balances.find((balance) => Boolean(balance?.campo_saldo?.es_principal));
  const parsed = toNumber(principal?.valor);
  return parsed ?? 0;
};

const normalizeHistory = (history) => (Array.isArray(history) ? history : []);

const matchesConfiguredDebtField = (balanceFieldId, configuredDebtFieldId) => {
  if (configuredDebtFieldId === undefined || configuredDebtFieldId === null) {
    return false;
  }

  const normalizedBalanceFieldId = String(balanceFieldId ?? '').trim();
  const normalizedConfiguredFieldId = String(configuredDebtFieldId).trim();

  return (
    normalizedBalanceFieldId === normalizedConfiguredFieldId ||
    normalizedBalanceFieldId === `dynamic:${normalizedConfiguredFieldId}`
  );
};

const evaluateRuleFormula = ({ formula, context }) => {
  try {
    const parsed = formulaParser.parse(formula);
    const variables = parsed.variables();
    const resolvedContext = variables.reduce((accumulator, variableName) => {
      accumulator[variableName] = context?.[variableName] ?? 0;
      return accumulator;
    }, {});
    const result = Number(parsed.evaluate(resolvedContext));
    if (!Number.isFinite(result) || result < 0) {
      return 0;
    }
    return roundCurrency(result);
  } catch {
    return 0;
  }
};

function NegotiationsWidget({
  clientId,
  portafolioId,
  credits = [],
  canRead = false,
  canWrite = false
}) {
  const { notify } = useNotify();
  const safeCredits = useMemo(() => normalizeCredits(credits), [credits]);
  const [levels, setLevels] = useState([]);
  const [portfolioConfig, setPortfolioConfig] = useState(null);
  const [activeNegotiation, setActiveNegotiation] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [selectedCreditIds, setSelectedCreditIds] = useState([]);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusAction, setStatusAction] = useState('cerrada');
  const [statusForm, setStatusForm] = useState(defaultStatusForm);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState('');

  const loadData = useCallback(
    async (signal) => {
      if (!canRead || !clientId || !portafolioId) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const [negotiationData, levelsData, portfolioData] = await Promise.all([
          listClientNegotiations({
            clienteId: clientId,
            portafolioId,
            limit: 20,
            offset: 0
          }),
          listAvailableDiscountLevels({ portafolioId }),
          getPortfolioById({ id: portafolioId, signal }).catch(() => null)
        ]);

        setActiveNegotiation(negotiationData?.active || null);
        setHistory(normalizeHistory(negotiationData?.history));
        setLevels(Array.isArray(levelsData) ? levelsData : []);
        setPortfolioConfig(portfolioData || null);
      } catch (err) {
        if (!signal?.aborted) {
          setError(err.message || 'No fue posible cargar las negociaciones del cliente.');
          setActiveNegotiation(null);
          setHistory([]);
          setPortfolioConfig(null);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [canRead, clientId, portafolioId]
  );

  useEffect(() => {
    if (!canRead) {
      return undefined;
    }

    const controller = new AbortController();
    loadData(controller.signal);

    return () => controller.abort();
  }, [canRead, loadData]);

  useEffect(() => {
    if (selectedCreditIds.length > 0) {
      return;
    }

    const allCreditIds = safeCredits
      .map((credit) => Number.parseInt(credit.id, 10))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (allCreditIds.length > 0) {
      setSelectedCreditIds(allCreditIds);
    }
  }, [safeCredits, selectedCreditIds.length]);

  const selectedLevel = useMemo(() => {
    const selectedId = Number.parseInt(createForm.nivel_descuento_id, 10);
    if (!Number.isInteger(selectedId) || selectedId <= 0) {
      return null;
    }

    return levels.find((level) => Number(level.id) === selectedId) || null;
  }, [createForm.nivel_descuento_id, levels]);

  const selectedCredits = useMemo(() => {
    const selectedIds = new Set(selectedCreditIds.map((id) => Number(id)));
    return safeCredits.filter((credit) => selectedIds.has(Number(credit.id)));
  }, [safeCredits, selectedCreditIds]);

  const configuredDebtFieldId = useMemo(() => {
    const parsed = Number.parseInt(portfolioConfig?.debt_total_saldo_field_id, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [portfolioConfig?.debt_total_saldo_field_id]);

  const negotiationContext = useMemo(() => {
    const totalsByVariable = new Map();
    let adeudoTotal = 0;

    selectedCredits.forEach((credit) => {
      const balances = Array.isArray(credit?.balances) ? credit.balances : [];
      let hasConfiguredDebtValue = false;

      balances.forEach((balance) => {
        const numericValue = toNumber(balance?.valor);
        if (numericValue === null) {
          return;
        }

        const fieldId = balance?.campo_saldo_id ?? balance?.campo_saldo?.id;
        const variableName = normalizeVariableName(balance?.campo_saldo?.nombre_campo);

        if (variableName) {
          totalsByVariable.set(
            variableName,
            roundCurrency((totalsByVariable.get(variableName) || 0) + numericValue)
          );
        }

        if (matchesConfiguredDebtField(fieldId, configuredDebtFieldId)) {
          adeudoTotal += numericValue;
          hasConfiguredDebtValue = true;
        }
      });

      if (!hasConfiguredDebtValue) {
        adeudoTotal += parsePrimaryBalance(credit);
      }
    });

    const computedBaseAmount = roundCurrency(adeudoTotal);
    const manualBaseAmount = toNumber(createForm.monto_base_total);
    const effectiveBaseAmount =
      manualBaseAmount !== null ? roundCurrency(manualBaseAmount) : computedBaseAmount;

    return {
      computedBaseAmount,
      effectiveBaseAmount,
      variables: Object.fromEntries(totalsByVariable.entries())
    };
  }, [configuredDebtFieldId, createForm.monto_base_total, selectedCredits]);

  const selectedRuleFormula = useMemo(
    () => (selectedLevel ? resolveRuleFormula(selectedLevel) : ''),
    [selectedLevel]
  );

  const negotiatedEstimate = useMemo(() => {
    if (!selectedRuleFormula) {
      return 0;
    }

    return evaluateRuleFormula({
      formula: selectedRuleFormula,
      context: {
        adeudo_total: negotiationContext.effectiveBaseAmount,
        ...negotiationContext.variables
      }
    });
  }, [negotiationContext.effectiveBaseAmount, negotiationContext.variables, selectedRuleFormula]);

  const handleToggleCredit = (creditId, checked) => {
    const resolvedId = Number.parseInt(creditId, 10);
    if (!Number.isInteger(resolvedId) || resolvedId <= 0) {
      return;
    }

    setSelectedCreditIds((prev) => {
      const next = new Set(prev.map((item) => Number(item)));
      if (checked) {
        next.add(resolvedId);
      } else {
        next.delete(resolvedId);
      }
      return Array.from(next);
    });
  };

  const handleCreateNegotiation = async () => {
    const nivelDescuentoId = Number.parseInt(createForm.nivel_descuento_id, 10);
    if (!Number.isInteger(nivelDescuentoId) || nivelDescuentoId <= 0) {
      setError('Selecciona una regla para iniciar la negociación.');
      return;
    }

    if (selectedCreditIds.length === 0) {
      setError('Selecciona al menos un crédito para negociar.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await createNegotiation({
        portafolio_id: portafolioId,
        cliente_id: clientId,
        nivel_descuento_id: nivelDescuentoId,
        credito_ids: selectedCreditIds,
        referencia: createForm.referencia.trim() || undefined,
        observaciones: createForm.observaciones.trim() || undefined,
        monto_base_total: createForm.monto_base_total
          ? Number.parseFloat(createForm.monto_base_total)
          : undefined,
        monto_negociado_total: createForm.monto_negociado_total
          ? Number.parseFloat(createForm.monto_negociado_total)
          : undefined
      });
      notify('Negociación iniciada', { severity: 'success' });
      setCreateForm(defaultCreateForm);
      await loadData();
    } catch (err) {
      setError(err.message || 'No fue posible crear la negociación.');
    } finally {
      setSaving(false);
    }
  };

  const openStatusDialog = (action) => {
    setStatusAction(action);
    setStatusForm(defaultStatusForm);
    setStatusError('');
    setStatusDialogOpen(true);
  };

  const closeStatusDialog = () => {
    if (statusSaving) {
      return;
    }
    setStatusDialogOpen(false);
    setStatusError('');
    setStatusForm(defaultStatusForm);
  };

  const handleSubmitStatus = async () => {
    if (!activeNegotiation?.id) {
      return;
    }

    setStatusSaving(true);
    setStatusError('');
    try {
      await updateNegotiationStatus({
        negotiationId: activeNegotiation.id,
        estado: statusAction,
        observaciones: statusForm.observaciones.trim() || undefined,
        monto_negociado_total: statusForm.monto_negociado_total
          ? Number.parseFloat(statusForm.monto_negociado_total)
          : undefined
      });

      notify(
        statusAction === 'cerrada'
          ? 'Negociación cerrada'
          : 'Negociación cancelada',
        { severity: 'success' }
      );
      setStatusDialogOpen(false);
      await loadData();
    } catch (err) {
      setStatusError(err.message || 'No fue posible actualizar la negociación.');
    } finally {
      setStatusSaving(false);
    }
  };

  if (!canRead) {
    return (
      <Paper variant="panel-sm">
        <Typography variant="body2" color="text.secondary">
          No tienes permisos para consultar negociaciones.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper variant="panel-sm">
        <Stack spacing={2}>
          <Stack className="crm-surface-card__header crm-surface-card__header--split">
            <Stack className="crm-surface-card__header-main">
              <Typography variant="overline" className="crm-surface-card__eyebrow">
                Negociación
              </Typography>
              <Typography variant="subtitle1" className="crm-surface-card__title">
                Regla activa
              </Typography>
              <Typography variant="caption" className="crm-surface-card__subtitle">
                Solo puede existir una negociación activa por cliente, incluso si tiene múltiples créditos.
              </Typography>
            </Stack>
            <Stack direction="row" className="crm-surface-card__actions">
              <Button
                variant="outlined"
                size="small"
                startIcon={<Refresh />}
                onClick={() => loadData()}
                disabled={loading}
              >
                Actualizar
              </Button>
            </Stack>
          </Stack>

          {loading ? (
            <Stack spacing={1}>
              <Skeleton width={220} />
              <Skeleton width="70%" />
              <Skeleton width="50%" />
            </Stack>
          ) : !activeNegotiation ? (
            <EmptyState
              title="Sin negociación activa"
              description="Puedes iniciar una nueva negociación desde el formulario inferior."
              icon={Percent}
              dense
            />
          ) : (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} className="crm-surface-card__badge-row">
                <Chip color="primary" label={`Regla: ${activeNegotiation.nivel_descuento_nombre}`} />
                <Chip
                  variant="outlined"
                  label={`Base: ${formatCurrency(activeNegotiation.monto_base_total)}`}
                />
                <Chip
                  variant="outlined"
                  label={`Negociado: ${formatCurrency(activeNegotiation.monto_negociado_total)}`}
                />
                <Chip
                  color="warning"
                  variant="outlined"
                  label={`Quita total: ${formatCurrency(activeNegotiation.monto_descuento_total)}`}
                />
              </Stack>

              <Typography variant="body2" color="text.secondary">
                Fórmula aplicada: {resolveRuleFormula(activeNegotiation)}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Iniciada: {formatDateTime(activeNegotiation.fecha_inicio)}
              </Typography>
              {activeNegotiation.referencia ? (
                <Typography variant="body2">
                  Referencia: {activeNegotiation.referencia}
                </Typography>
              ) : null}
              {activeNegotiation.observaciones ? (
                <Typography variant="body2">{activeNegotiation.observaciones}</Typography>
              ) : null}

              <Stack direction="row" spacing={1} className="crm-surface-card__badge-row">
                {(activeNegotiation.creditos || []).map((credit) => (
                  <Chip
                    key={`active-credit-${activeNegotiation.id}-${credit.credito_id}`}
                    size="small"
                    label={credit.numero_credito || `Credito ${credit.credito_id}`}
                    variant="outlined"
                  />
                ))}
              </Stack>

              {canWrite && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} className="crm-surface-card__action-row">
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircleOutline />}
                    onClick={() => openStatusDialog('cerrada')}
                  >
                    Cerrar negociación
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<CancelOutlined />}
                    onClick={() => openStatusDialog('cancelada')}
                  >
                    Cancelar negociación
                  </Button>
                </Stack>
              )}
            </Stack>
          )}
        </Stack>
      </Paper>

      {canWrite && (
        <Paper variant="panel-sm">
          <Stack spacing={2}>
            <Stack className="crm-surface-card__header">
              <Stack className="crm-surface-card__header-main">
                <Typography variant="overline" className="crm-surface-card__eyebrow">
                  Configuración
                </Typography>
                <Typography variant="subtitle1" className="crm-surface-card__title">
                  Iniciar nueva negociación
                </Typography>
                <Typography variant="body2" className="crm-surface-card__subtitle">
                  Selecciona la regla, los créditos incluidos y el marco base del acuerdo.
                </Typography>
              </Stack>
            </Stack>

            {activeNegotiation ? (
              <Alert severity="info">
                Este cliente ya tiene una negociación activa. Ciérrala o cancélala para iniciar otra.
              </Alert>
            ) : null}

            {!activeNegotiation && levels.length === 0 ? (
              <Alert severity="warning">
                No tienes reglas autorizadas para negociar. Solicita asignación al administrador.
              </Alert>
            ) : null}

            {!activeNegotiation && !portfolioConfig?.debt_total_saldo_field_id ? (
              <Alert severity="info">
                El portafolio no tiene configurado el campo de <strong>adeudo total</strong>.
                Se usará el saldo principal detectado en cada crédito como base de cálculo.
              </Alert>
            ) : null}

            <TextField
              select
              label="Regla de negociación"
              value={createForm.nivel_descuento_id}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  nivel_descuento_id: event.target.value
                }))
              }
              SelectProps={{ native: true }}
              disabled={Boolean(activeNegotiation) || levels.length === 0}
              fullWidth
            >
              <option value="">Selecciona una regla</option>
              {levels.map((level) => (
                <option key={`level-${level.id}`} value={level.id}>
                  {level.nombre}
                </option>
              ))}
            </TextField>

            {selectedRuleFormula ? (
              <Alert severity="info">
                <strong>Fórmula activa:</strong> {selectedRuleFormula}
              </Alert>
            ) : null}

            <Stack spacing={1}>
              <Typography variant="body2" className="crm-text-strong">
                Créditos incluidos
              </Typography>
              {safeCredits.length === 0 ? (
                <Alert severity="warning">Este cliente no tiene créditos para negociar.</Alert>
              ) : (
                <Stack spacing={0.75}>
                  {safeCredits.map((credit) => (
                    <Box
                      key={`credit-selector-${credit.id}`}
                      className={[
                        'crm-surface-card__selection-item',
                        selectedCreditIds.includes(Number(credit.id))
                          ? 'crm-surface-card__selection-item--checked'
                          : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selectedCreditIds.includes(Number(credit.id))}
                            onChange={(event) => handleToggleCredit(credit.id, event.target.checked)}
                            disabled={Boolean(activeNegotiation)}
                          />
                        }
                        label={
                          <Stack spacing={0.15}>
                            <Typography variant="body2" className="crm-text-strong">
                              {credit.numero_credito || `Credito ${credit.id}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Producto: {credit.producto || 'SIN_PRODUCTO'}
                            </Typography>
                          </Stack>
                        }
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Monto base total (opcional)"
                type="number"
                value={createForm.monto_base_total}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, monto_base_total: event.target.value }))
                }
                inputProps={{ min: 0, step: '0.01' }}
                fullWidth
                disabled={Boolean(activeNegotiation)}
              />
              <TextField
                label="Monto negociado total (opcional)"
                type="number"
                value={createForm.monto_negociado_total}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, monto_negociado_total: event.target.value }))
                }
                inputProps={{ min: 0, step: '0.01' }}
                fullWidth
                disabled={Boolean(activeNegotiation)}
              />
            </Stack>

            <TextField
              label="Referencia"
              value={createForm.referencia}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, referencia: event.target.value }))
              }
              fullWidth
              disabled={Boolean(activeNegotiation)}
            />
            <TextField
              label="Observaciones"
              value={createForm.observaciones}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, observaciones: event.target.value }))
              }
              fullWidth
              multiline
              minRows={2}
              disabled={Boolean(activeNegotiation)}
            />

            <Stack direction="row" spacing={1} className="crm-surface-card__badge-row">
              <Chip
                variant="outlined"
                label={`Base estimada (${portfolioConfig?.debt_total_saldo_field_label || 'saldo principal'}): ${formatCurrency(negotiationContext.computedBaseAmount)}`}
              />
              <Chip
                variant="outlined"
                label={`Adeudo total aplicado: ${formatCurrency(negotiationContext.effectiveBaseAmount)}`}
              />
              <Chip
                variant="outlined"
                label={`Negociado estimado: ${formatCurrency(negotiatedEstimate)}`}
              />
            </Stack>

            <Stack direction="row" className="crm-surface-card__action-row">
              <Button
                variant="contained"
                startIcon={<AddTask />}
                onClick={handleCreateNegotiation}
                disabled={
                  saving ||
                  Boolean(activeNegotiation) ||
                  levels.length === 0 ||
                  safeCredits.length === 0
                }
              >
                Iniciar negociación
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <Paper variant="panel-sm">
        <Stack spacing={2}>
          <Stack className="crm-surface-card__header">
            <Stack className="crm-surface-card__header-main">
              <Typography variant="overline" className="crm-surface-card__eyebrow">
                Histórico
              </Typography>
              <Typography variant="subtitle1" className="crm-surface-card__title">
                Historial de negociaciones
              </Typography>
              <Typography variant="body2" className="crm-surface-card__subtitle">
                Acuerdos anteriores cerrados o cancelados con su contexto financiero.
              </Typography>
            </Stack>
          </Stack>
          <BaseTable
            dense
            loading={loading}
            columns={[
              {
                id: 'fecha_inicio',
                label: 'Inicio',
                render: (row) => formatDateTime(row.fecha_inicio)
              },
              {
                id: 'estado',
                label: 'Estado',
                render: (row) => (
                  <Chip
                    size="small"
                    color={
                      row.estado === 'cerrada'
                        ? 'success'
                        : row.estado === 'cancelada'
                          ? 'default'
                          : 'warning'
                    }
                    label={String(row.estado || '').toUpperCase()}
                  />
                )
              },
              {
                id: 'nivel_descuento_nombre',
                label: 'Regla',
                render: (row) => row.nivel_descuento_nombre || '-'
              },
              {
                id: 'monto_base_total',
                label: 'Monto base',
                align: 'right',
                render: (row) => formatCurrency(row.monto_base_total)
              },
              {
                id: 'monto_negociado_total',
                label: 'Monto negociado',
                align: 'right',
                render: (row) => formatCurrency(row.monto_negociado_total)
              },
              {
                id: 'creditos',
                label: 'Créditos',
                render: (row) => {
                  const creditCount = Array.isArray(row.creditos) ? row.creditos.length : 0;
                  return creditCount > 0 ? `${creditCount}` : '-';
                }
              }
            ]}
            rows={history}
            emptyContent={
              <EmptyState
                dense
                title="Sin historial"
                description="No hay negociaciones cerradas o canceladas para este cliente."
                icon={Percent}
              />
            }
          />
        </Stack>
      </Paper>

      <BaseDialog
        open={statusDialogOpen}
        onClose={closeStatusDialog}
        title={statusAction === 'cerrada' ? 'Cerrar negociación' : 'Cancelar negociación'}
        subtitle={
          statusAction === 'cerrada'
            ? 'Confirma el monto final para cerrar la negociación.'
            : 'La negociación dejará de estar activa y no se aplicará.'
        }
        actions={
          <>
            <Button onClick={closeStatusDialog} disabled={statusSaving}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              color={statusAction === 'cerrada' ? 'success' : 'warning'}
              onClick={handleSubmitStatus}
              disabled={statusSaving}
            >
              {statusAction === 'cerrada' ? 'Cerrar' : 'Cancelar negociación'}
            </Button>
          </>
        }
      >
        {statusError && <Alert severity="error">{statusError}</Alert>}

        {statusAction === 'cerrada' && (
          <TextField
            label="Monto negociado final (opcional)"
            type="number"
            value={statusForm.monto_negociado_total}
            onChange={(event) =>
              setStatusForm((prev) => ({
                ...prev,
                monto_negociado_total: event.target.value
              }))
            }
            inputProps={{ min: 0, step: '0.01' }}
            fullWidth
          />
        )}

        <TextField
          label="Observaciones"
          value={statusForm.observaciones}
          onChange={(event) =>
            setStatusForm((prev) => ({ ...prev, observaciones: event.target.value }))
          }
          multiline
          minRows={3}
          fullWidth
        />
      </BaseDialog>
    </Stack>
  );
}

const MemoizedNegotiationsWidget = memo(NegotiationsWidget);
MemoizedNegotiationsWidget.displayName = 'NegotiationsWidget';

export default MemoizedNegotiationsWidget;
