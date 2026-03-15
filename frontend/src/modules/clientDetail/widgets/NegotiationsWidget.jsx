import {
  AddTask,
  CalendarMonthOutlined,
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
const dateTimeFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short'
});
const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium'
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

const PERIODICITY_OPTIONS = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual', label: 'Mensual' }
];

const buildDefaultFirstDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
};

const createDefaultCreateForm = () => ({
  nivel_descuento_id: '',
  referencia: '',
  observaciones: '',
  monto_negociado_total: '',
  parcialidades: '1',
  primera_fecha: buildDefaultFirstDate(),
  periodicidad: 'quincenal'
});

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

const formatDate = (value) => {
  if (!value) {
    return '-';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return dateFormatter.format(date);
};

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return dateTimeFormatter.format(date);
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

const parsePositiveInteger = (value, fallback = 1, max = 60) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
};

const clampNegotiatedAmount = ({ amount, minimumAmount, maximumAmount }) => {
  const numericAmount = toNumber(amount);
  if (numericAmount === null) {
    return null;
  }

  const floor = Math.max(0, roundCurrency(minimumAmount ?? 0));
  const ceiling = Math.max(floor, roundCurrency(maximumAmount ?? 0));
  return roundCurrency(Math.min(Math.max(numericAmount, floor), ceiling));
};

const addPeriodsToDate = (value, periodicity, index) => {
  const baseDate = new Date(`${value}T12:00:00`);
  if (Number.isNaN(baseDate.getTime())) {
    return null;
  }

  const nextDate = new Date(baseDate);
  if (periodicity === 'semanal') {
    nextDate.setDate(nextDate.getDate() + index * 7);
    return nextDate;
  }

  if (periodicity === 'quincenal') {
    nextDate.setDate(nextDate.getDate() + index * 15);
    return nextDate;
  }

  nextDate.setMonth(nextDate.getMonth() + index);
  return nextDate;
};

const buildPaymentSchedule = ({
  totalAmount,
  installments,
  firstDate,
  periodicity
}) => {
  const amount = roundCurrency(toNumber(totalAmount) ?? 0);
  const count = parsePositiveInteger(installments, 1, 60);

  if (!firstDate || amount <= 0 || count <= 0) {
    return [];
  }

  const baseAmount = roundCurrency(amount / count);
  let remaining = amount;

  return Array.from({ length: count }, (_, index) => {
    const rowAmount =
      index === count - 1 ? roundCurrency(Math.max(remaining, 0)) : baseAmount;
    remaining = roundCurrency(remaining - rowAmount);

    return {
      id: `payment-${index + 1}`,
      parcialidad: index + 1,
      fecha: addPeriodsToDate(firstDate, periodicity, index),
      monto: rowAmount
    };
  });
};

function NegotiationMetric({ label, value, helper }) {
  return (
    <Box className="crm-surface-card__meta-item">
      <Typography variant="caption" className="crm-surface-card__meta-label">
        {label}
      </Typography>
      <Typography variant="body2" className="crm-surface-card__meta-value">
        {value}
      </Typography>
      {helper ? (
        <Typography variant="caption" color="text.secondary">
          {helper}
        </Typography>
      ) : null}
    </Box>
  );
}

function SchedulePreview({ rows = [], totalAmount = 0 }) {
  if (!rows.length) {
    return (
      <Box className="crm-negotiations__schedule-empty">
        <Typography variant="body2" color="text.secondary">
          Selecciona una regla y define las parcialidades para visualizar el calendario propuesto.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1} className="crm-negotiations__schedule-list">
      {rows.map((row) => (
        <Box key={row.id} className="crm-negotiations__schedule-row">
          <Typography variant="caption" className="crm-negotiations__schedule-index">
            Pago {row.parcialidad}
          </Typography>
          <Typography variant="body2" className="crm-negotiations__schedule-date">
            {formatDate(row.fecha)}
          </Typography>
          <Typography variant="body2" className="crm-negotiations__schedule-amount">
            {formatCurrency(row.monto)}
          </Typography>
        </Box>
      ))}
      <Box className="crm-negotiations__schedule-total">
        <Typography variant="caption" color="text.secondary">
          Total programado
        </Typography>
        <Typography variant="body2" className="crm-negotiations__schedule-amount">
          {formatCurrency(totalAmount)}
        </Typography>
      </Box>
    </Stack>
  );
}

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

  const [createForm, setCreateForm] = useState(() => createDefaultCreateForm());
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

    return {
      computedBaseAmount,
      effectiveBaseAmount: computedBaseAmount,
      variables: Object.fromEntries(totalsByVariable.entries())
    };
  }, [configuredDebtFieldId, selectedCredits]);

  const selectedRuleFormula = useMemo(
    () => (selectedLevel ? resolveRuleFormula(selectedLevel) : ''),
    [selectedLevel]
  );

  const ruleMinimumAmount = useMemo(() => {
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

  const minimumNegotiatedAmount = useMemo(() => {
    if (negotiationContext.effectiveBaseAmount <= 0) {
      return 0;
    }

    return roundCurrency(
      Math.min(ruleMinimumAmount, negotiationContext.effectiveBaseAmount)
    );
  }, [negotiationContext.effectiveBaseAmount, ruleMinimumAmount]);

  const selectedCreditCount = selectedCredits.length;
  const normalizedInstallments = useMemo(
    () => parsePositiveInteger(createForm.parcialidades, 1, 60),
    [createForm.parcialidades]
  );

  const proposedNegotiatedAmount = useMemo(() => {
    const maximumAmount = negotiationContext.effectiveBaseAmount;
    if (maximumAmount <= 0) {
      return 0;
    }

    const clamped = clampNegotiatedAmount({
      amount: createForm.monto_negociado_total,
      minimumAmount: minimumNegotiatedAmount,
      maximumAmount
    });

    if (clamped !== null) {
      return clamped;
    }

    return minimumNegotiatedAmount;
  }, [
    createForm.monto_negociado_total,
    minimumNegotiatedAmount,
    negotiationContext.effectiveBaseAmount
  ]);

  const estimatedDiscountAmount = useMemo(() => {
    if (negotiationContext.effectiveBaseAmount <= 0 || proposedNegotiatedAmount <= 0) {
      return 0;
    }

    return roundCurrency(
      Math.max(negotiationContext.effectiveBaseAmount - proposedNegotiatedAmount, 0)
    );
  }, [negotiationContext.effectiveBaseAmount, proposedNegotiatedAmount]);

  const schedulePreview = useMemo(
    () =>
      buildPaymentSchedule({
        totalAmount: proposedNegotiatedAmount,
        installments: normalizedInstallments,
        firstDate: createForm.primera_fecha,
        periodicity: createForm.periodicidad
      }),
    [
      createForm.periodicidad,
      createForm.primera_fecha,
      normalizedInstallments,
      proposedNegotiatedAmount
    ]
  );

  useEffect(() => {
    if (!selectedLevel || negotiationContext.effectiveBaseAmount <= 0) {
      return;
    }

    setCreateForm((prev) => {
      const currentValue = toNumber(prev.monto_negociado_total);

      if (
        currentValue !== null &&
        currentValue >= minimumNegotiatedAmount &&
        currentValue <= negotiationContext.effectiveBaseAmount
      ) {
        return prev;
      }

      return {
        ...prev,
        monto_negociado_total: String(minimumNegotiatedAmount)
      };
    });
  }, [
    minimumNegotiatedAmount,
    negotiationContext.effectiveBaseAmount,
    selectedLevel
  ]);

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

  const handleNormalizeNegotiatedAmount = () => {
    const normalizedAmount = clampNegotiatedAmount({
      amount: createForm.monto_negociado_total,
      minimumAmount: minimumNegotiatedAmount,
      maximumAmount: negotiationContext.effectiveBaseAmount
    });

    setCreateForm((prev) => ({
      ...prev,
      monto_negociado_total:
        normalizedAmount === null ? '' : String(normalizedAmount)
    }));
  };

  const handleNormalizeInstallments = () => {
    setCreateForm((prev) => ({
      ...prev,
      parcialidades: String(parsePositiveInteger(prev.parcialidades, 1, 60))
    }));
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

    if (negotiationContext.effectiveBaseAmount <= 0) {
      setError('No hay un monto base válido para calcular la negociación.');
      return;
    }

    if (proposedNegotiatedAmount < minimumNegotiatedAmount) {
      setError('El monto a cobrar no puede ser menor al mínimo calculado por la regla.');
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
        monto_base_total: negotiationContext.effectiveBaseAmount,
        monto_negociado_total: proposedNegotiatedAmount || undefined
      });
      notify('Negociación iniciada', { severity: 'success' });
      setCreateForm(createDefaultCreateForm());
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
    <Box className="crm-negotiations">
      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box className="crm-negotiations__grid">
        <Paper variant="panel-sm" className="crm-negotiations__panel">
          <Stack spacing={1.5} className="crm-negotiations__panel-stack">
            <Stack className="crm-surface-card__header crm-surface-card__header--split">
              <Stack className="crm-surface-card__header-main">
                <Typography variant="overline" className="crm-surface-card__eyebrow">
                  Negociación
                </Typography>
                <Typography variant="subtitle1" className="crm-surface-card__title">
                  {activeNegotiation ? 'Acuerdo activo' : 'Nuevo acuerdo'}
                </Typography>
                <Typography variant="caption" className="crm-surface-card__subtitle">
                  El asesor ve primero el monto máximo a cobrar, el mínimo permitido por la regla
                  y una propuesta de parcialidades sin salir del expediente.
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
                <Skeleton width="100%" height={74} />
                <Skeleton width="100%" height={200} />
              </Stack>
            ) : activeNegotiation ? (
              <>
                <Box className="crm-surface-card__meta-grid crm-negotiations__summary-grid">
                  <NegotiationMetric
                    label="Regla aplicada"
                    value={activeNegotiation.nivel_descuento_nombre || '-'}
                    helper={resolveRuleFormula(activeNegotiation)}
                  />
                  <NegotiationMetric
                    label="Monto base"
                    value={formatCurrency(activeNegotiation.monto_base_total)}
                  />
                  <NegotiationMetric
                    label="Monto negociado"
                    value={formatCurrency(activeNegotiation.monto_negociado_total)}
                  />
                  <NegotiationMetric
                    label="Quita total"
                    value={formatCurrency(activeNegotiation.monto_descuento_total)}
                    helper={`Inicio: ${formatDateTime(activeNegotiation.fecha_inicio)}`}
                  />
                </Box>

                <Box className="crm-negotiations__active-grid">
                  <Box className="crm-surface-card__selection-item crm-negotiations__block">
                    <Stack spacing={1}>
                      <Typography variant="body2" className="crm-text-strong">
                        Créditos incluidos
                      </Typography>
                      <Stack direction="row" className="crm-surface-card__badge-row">
                        {(activeNegotiation.creditos || []).map((credit) => (
                          <Chip
                            key={`active-credit-${activeNegotiation.id}-${credit.credito_id}`}
                            size="small"
                            label={credit.numero_credito || `Registro ${credit.credito_id}`}
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                      {activeNegotiation.referencia ? (
                        <Typography variant="body2">
                          Referencia: {activeNegotiation.referencia}
                        </Typography>
                      ) : null}
                      {activeNegotiation.observaciones ? (
                        <Typography variant="body2" color="text.secondary">
                          {activeNegotiation.observaciones}
                        </Typography>
                      ) : null}
                    </Stack>
                  </Box>

                  <Box className="crm-surface-card__selection-item crm-negotiations__block">
                    <Stack spacing={1}>
                      <Typography variant="body2" className="crm-text-strong">
                        Gestión del acuerdo
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Mientras exista esta negociación activa no se podrá crear otra para el
                        cliente.
                      </Typography>
                      {canWrite ? (
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1}
                          className="crm-surface-card__action-row"
                        >
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
                      ) : null}
                    </Stack>
                  </Box>
                </Box>
              </>
            ) : (
              <>
                {levels.length === 0 ? (
                  <Alert severity="warning">
                    No tienes reglas autorizadas para negociar. Solicita la asignación al
                    administrador.
                  </Alert>
                ) : null}

                {!portfolioConfig?.debt_total_saldo_field_id ? (
                  <Alert severity="info">
                    El portafolio no tiene configurado el <strong>campo principal</strong>. Se
                    usará el saldo principal detectado en cada crédito como base de cálculo.
                  </Alert>
                ) : null}

                <Box className="crm-surface-card__meta-grid crm-negotiations__summary-grid">
                  <NegotiationMetric
                    label="Máximo a cobrar"
                    value={formatCurrency(negotiationContext.effectiveBaseAmount)}
                    helper={
                      portfolioConfig?.debt_total_saldo_field_label || 'Calculado desde el campo principal'
                    }
                  />
                  <NegotiationMetric
                    label="Mínimo por regla"
                    value={
                      selectedLevel ? formatCurrency(minimumNegotiatedAmount) : 'Selecciona una regla'
                    }
                    helper={selectedLevel ? resolveRuleFormula(selectedLevel) : 'Sin fórmula seleccionada'}
                  />
                  <NegotiationMetric
                    label="Monto propuesto"
                    value={
                      proposedNegotiatedAmount > 0
                        ? formatCurrency(proposedNegotiatedAmount)
                        : 'Pendiente'
                    }
                    helper={
                      proposedNegotiatedAmount > 0
                        ? `Quita estimada: ${formatCurrency(estimatedDiscountAmount)}`
                        : 'Define el acuerdo a cobrar'
                    }
                  />
                  <NegotiationMetric
                    label="Parcialidades"
                    value={`${normalizedInstallments}`}
                    helper={`${selectedCreditCount} crédito${selectedCreditCount === 1 ? '' : 's'} incluido${selectedCreditCount === 1 ? '' : 's'}`}
                  />
                </Box>

                {!canWrite ? (
                  <Alert severity="info">
                    Tu perfil puede consultar el histórico y los montos sugeridos, pero no iniciar
                    nuevas negociaciones.
                  </Alert>
                ) : (
                  <Box className="crm-negotiations__composer-grid">
                    <Stack spacing={1.25} className="crm-negotiations__composer-column">
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
                        disabled={levels.length === 0}
                        fullWidth
                      >
                        <option value="">Selecciona una regla</option>
                        {levels.map((level) => (
                          <option key={`level-${level.id}`} value={level.id}>
                            {level.nombre}
                          </option>
                        ))}
                      </TextField>

                      <Box className="crm-negotiations__credit-picker">
                        <Stack spacing={0.85}>
                          <Typography variant="body2" className="crm-text-strong">
                            Créditos incluidos
                          </Typography>
                          {safeCredits.length === 0 ? (
                            <Alert severity="warning">
                              Este cliente no tiene créditos disponibles para negociar.
                            </Alert>
                          ) : (
                            <Box className="crm-negotiations__credit-picker-list">
                              {safeCredits.map((credit) => (
                                <Box
                                  key={`credit-selector-${credit.id}`}
                                  className={[
                                    'crm-surface-card__selection-item',
                                    'crm-negotiations__credit-item',
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
                                        onChange={(event) =>
                                          handleToggleCredit(credit.id, event.target.checked)
                                        }
                                      />
                                    }
                                    label={
                                      <Stack spacing={0.15}>
                                        <Typography variant="body2" className="crm-text-strong">
                                          {credit.numero_credito || `Registro ${credit.id}`}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          Producto: {credit.producto || 'SIN_PRODUCTO'}
                                        </Typography>
                                      </Stack>
                                    }
                                  />
                                </Box>
                              ))}
                            </Box>
                          )}
                        </Stack>
                      </Box>

                      <TextField
                        label="Referencia"
                        value={createForm.referencia}
                        onChange={(event) =>
                          setCreateForm((prev) => ({ ...prev, referencia: event.target.value }))
                        }
                        fullWidth
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
                      />
                    </Stack>

                    <Stack spacing={1.25} className="crm-negotiations__composer-column">
                      <Box className="crm-negotiations__terms-grid">
                        <TextField
                          label="Monto a cobrar"
                          type="number"
                          value={createForm.monto_negociado_total}
                          onChange={(event) =>
                            setCreateForm((prev) => ({
                              ...prev,
                              monto_negociado_total: event.target.value
                            }))
                          }
                          onBlur={handleNormalizeNegotiatedAmount}
                          inputProps={{
                            min: minimumNegotiatedAmount || 0,
                            max: negotiationContext.effectiveBaseAmount || 0,
                            step: '0.01'
                          }}
                          helperText={
                            selectedLevel
                              ? `Mínimo permitido: ${formatCurrency(minimumNegotiatedAmount)}`
                              : 'Selecciona una regla para calcular el mínimo permitido'
                          }
                          fullWidth
                        />

                        <TextField
                          label="Parcialidades"
                          type="number"
                          value={createForm.parcialidades}
                          onChange={(event) =>
                            setCreateForm((prev) => ({
                              ...prev,
                              parcialidades: event.target.value
                            }))
                          }
                          onBlur={handleNormalizeInstallments}
                          inputProps={{ min: 1, max: 60, step: 1 }}
                          fullWidth
                        />

                        <TextField
                          label="Primera fecha de pago"
                          type="date"
                          value={createForm.primera_fecha}
                          onChange={(event) =>
                            setCreateForm((prev) => ({
                              ...prev,
                              primera_fecha: event.target.value
                            }))
                          }
                          InputLabelProps={{ shrink: true }}
                          fullWidth
                        />

                        <TextField
                          select
                          label="Periodicidad"
                          value={createForm.periodicidad}
                          onChange={(event) =>
                            setCreateForm((prev) => ({
                              ...prev,
                              periodicidad: event.target.value
                            }))
                          }
                          SelectProps={{ native: true }}
                          fullWidth
                        >
                          {PERIODICITY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </TextField>
                      </Box>

                      <Box className="crm-surface-card__selection-item crm-negotiations__schedule-panel">
                        <Stack spacing={1.1}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CalendarMonthOutlined fontSize="small" />
                            <Box>
                              <Typography variant="body2" className="crm-text-strong">
                                Calendario estimado
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Vista previa de fechas y montos por parcialidad.
                              </Typography>
                            </Box>
                          </Stack>
                          <SchedulePreview
                            rows={schedulePreview}
                            totalAmount={proposedNegotiatedAmount}
                          />
                        </Stack>
                      </Box>

                      <Stack direction="row" className="crm-surface-card__action-row">
                        <Button
                          variant="contained"
                          startIcon={<AddTask />}
                          onClick={handleCreateNegotiation}
                          disabled={saving || levels.length === 0 || safeCredits.length === 0}
                        >
                          Iniciar negociación
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                )}
              </>
            )}
          </Stack>
        </Paper>

        <Paper variant="panel-sm" className="crm-negotiations__panel crm-negotiations__history-panel">
          <Stack spacing={1.25} className="crm-negotiations__panel-stack">
            <Stack className="crm-surface-card__header">
              <Stack className="crm-surface-card__header-main">
                <Typography variant="overline" className="crm-surface-card__eyebrow">
                  Histórico
                </Typography>
                <Typography variant="subtitle1" className="crm-surface-card__title">
                  Negociaciones anteriores
                </Typography>
                <Typography variant="body2" className="crm-surface-card__subtitle">
                  Revisa rápidamente acuerdos cerrados o cancelados sin salir del flujo actual.
                </Typography>
              </Stack>
            </Stack>

            <Box className="crm-negotiations__history-table">
              <BaseTable
                dense
                loading={loading}
                columns={[
                  {
                    id: 'fecha_inicio',
                    label: 'Inicio',
                    render: (row) => formatDate(row.fecha_inicio)
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
                    id: 'monto_negociado_total',
                    label: 'Cobro',
                    align: 'right',
                    render: (row) => formatCurrency(row.monto_negociado_total)
                  },
                  {
                    id: 'referencia',
                    label: 'Referencia',
                    render: (row) => row.referencia || '-'
                  }
                ]}
                rows={history}
                emptyContent={
                  <EmptyState
                    dense
                    title="Sin historial"
                    description="Todavía no hay negociaciones cerradas o canceladas para este cliente."
                    icon={Percent}
                  />
                }
              />
            </Box>
          </Stack>
        </Paper>
      </Box>

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
    </Box>
  );
}

const MemoizedNegotiationsWidget = memo(NegotiationsWidget);
MemoizedNegotiationsWidget.displayName = 'NegotiationsWidget';

export default MemoizedNegotiationsWidget;
