import {
  ArrowBack,
  Call,
  EmailOutlined,
  InsightsOutlined,
  PlaceOutlined,
  PhoneOutlined,
  Sms,
  WhatsApp,
  DirectionsWalk
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useState } from 'react';
import EmptyState from '../components/EmptyState.jsx';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import usePermissions from '../hooks/usePermissions.js';
import useNotify from '../hooks/useNotify.jsx';
import useNavigation from '../hooks/useNavigation.js';
import { getClientDetail } from '../services/clients.js';
import { createGestion, listHistorialGestiones } from '../services/gestiones.js';
import { buildRoutePath, getRouteParams } from '../routes/paths.js';
import CreditsWidget from '../modules/clientDetail/widgets/CreditsWidget.jsx';
import GestionesWidget from '../modules/clientDetail/widgets/GestionesWidget.jsx';
import NegotiationsWidget from '../modules/clientDetail/widgets/NegotiationsWidget.jsx';
import PaymentsWidget from '../modules/clientDetail/widgets/PaymentsWidget.jsx';

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN'
});

const DETAIL_TAB_VALUES = {
  gestiones: 'gestiones',
  pagos: 'pagos',
  negociaciones: 'negociaciones',
  creditos: 'creditos',
  documentos: 'documentos'
};

const getClientIdFromPath = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = getRouteParams('clientDetail', window.location.pathname);
  const id = (params?.id || '').trim();
  return id || null;
};


const resolveClientFullName = (client) =>
  [client?.nombre, client?.apellido_paterno, client?.apellido_materno].filter(Boolean).join(' ');

const formatAddressValue = (address) => {
  if (!address) {
    return '';
  }

  return [address?.linea1, address?.linea2, address?.ciudad, address?.estado, address?.codigo_postal]
    .filter(Boolean)
    .join(', ');
};

const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCurrency = (value) => {
  const parsed = toNumber(value);
  if (parsed === null) {
    return '-';
  }

  return currencyFormatter.format(parsed);
};

const normalizeStatusLabel = (value) => {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (!normalized) {
    return '';
  }

  if (
    normalized.includes('pagad') ||
    normalized.includes('liquidad') ||
    normalized.includes('cerrad') ||
    normalized.includes('paid')
  ) {
    return 'paid';
  }

  if (normalized.includes('legal') || normalized.includes('judicial')) {
    return 'legal';
  }

  if (
    normalized.includes('negoci') ||
    normalized.includes('convenio') ||
    normalized.includes('reestruct')
  ) {
    return 'negotiated';
  }

  if (
    normalized.includes('activo') ||
    normalized.includes('vigente') ||
    normalized.includes('current') ||
    normalized.includes('al corriente')
  ) {
    return 'active';
  }

  return '';
};

const resolveStatusPresentation = (value) => {
  switch (value) {
    case 'paid':
      return { label: 'Pagado', color: 'success' };
    case 'legal':
      return { label: 'Jurídico', color: 'error' };
    case 'negotiated':
      return { label: 'Negociado', color: 'warning' };
    case 'active':
    default:
      return { label: 'Activo', color: 'primary' };
  }
};

const resolvePrimaryBalanceColumn = (balanceColumns) =>
  (Array.isArray(balanceColumns) ? balanceColumns : []).find((column) => column.es_principal) ||
  (Array.isArray(balanceColumns) ? balanceColumns[0] : null) ||
  null;

const resolveOverdueBalanceColumns = (balanceColumns) =>
  (Array.isArray(balanceColumns) ? balanceColumns : []).filter((column) => {
    const label = `${column?.label || ''} ${column?.nombre_campo || ''}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    return (
      label.includes('venc') ||
      label.includes('atras') ||
      label.includes('mor') ||
      label.includes('overdue') ||
      label.includes('delinq')
    );
  });

const resolveCreditBalance = (balancesByCredit, creditId, balanceColumn) => {
  if (!balanceColumn?.id || !(balancesByCredit instanceof Map)) {
    return null;
  }

  const creditBalances =
    balancesByCredit.get(String(creditId)) ||
    balancesByCredit.get(creditId);
  if (!(creditBalances instanceof Map)) {
    return null;
  }

  return creditBalances.get(String(balanceColumn.id)) || creditBalances.get(balanceColumn.id) || null;
};

const sumCreditBalances = (credits, balanceColumns, balancesByCredit) =>
  (credits || []).reduce((sum, credit) => {
    const creditSum = (balanceColumns || []).reduce((columnSum, column) => {
      const balance = resolveCreditBalance(balancesByCredit, credit.id, column);
      return columnSum + (toNumber(balance?.valor) ?? 0);
    }, 0);

    return sum + creditSum;
  }, 0);

const resolveLastPaymentDate = (client, credits) => {
  const candidates = [
    client?.last_payment_date,
    client?.ultimo_pago_fecha,
    client?.fecha_ultimo_pago,
    ...(credits || []).flatMap((credit) => [
      credit?.last_payment_date,
      credit?.ultimo_pago_fecha,
      credit?.fecha_ultimo_pago,
      credit?.last_payment_at
    ])
  ].filter(Boolean);

  const parsed = candidates
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());

  return parsed[0] || null;
};

const formatDateShort = (value) => {
  if (!value) {
    return '-';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(date);
};

const formatScoreValue = (value) => {
  const parsed = toNumber(value);
  return parsed === null ? '-' : parsed.toFixed(0);
};

const resolveScoreSignal = (value) => {
  const parsed = toNumber(value);

  if (parsed === null) {
    return {
      palette: 'default',
      label: 'Sin score',
      tone: 'Sin dato'
    };
  }

  if (parsed >= 70) {
    return {
      palette: 'success',
      label: 'Verde',
      tone: 'Óptimo'
    };
  }

  if (parsed >= 40) {
    return {
      palette: 'warning',
      label: 'Amarillo',
      tone: 'Atención'
    };
  }

  return {
    palette: 'error',
    label: 'Rojo',
    tone: 'Crítico'
  };
};

const resolveRiskColor = (value) => {
  switch (String(value || '').toUpperCase()) {
    case 'BAJO':
      return 'success';
    case 'MEDIO':
      return 'warning';
    case 'ALTO':
      return 'error';
    default:
      return 'default';
  }
};

const resolveClientScoringSnapshot = (client) => ({
  score_global: client?.scoring_global ?? null,
  score_llamada: client?.scoring_llamada ?? null,
  score_whatsapp: client?.scoring_whatsapp ?? null,
  score_sms: client?.scoring_sms ?? null,
  score_email: client?.scoring_email ?? null,
  score_visita: client?.scoring_visita ?? null,
  scoring_riesgo_nivel: client?.scoring_riesgo_nivel ?? null,
  scoring_permitir_contacto: client?.scoring_permitir_contacto ?? null,
  scoring_bloquear_cliente: client?.scoring_bloquear_cliente ?? null,
  scoring_recomendar_reintento: client?.scoring_recomendar_reintento ?? null,
  scoring_actualizado_at: client?.scoring_actualizado_at ?? null,
  strategy_next_best_action: client?.strategy_next_best_action ?? null,
  strategy_recommended_channel: client?.strategy_recommended_channel ?? null,
  strategy_should_stop_contact: client?.strategy_should_stop_contact ?? false,
  strategy_should_escalate_visit: client?.strategy_should_escalate_visit ?? false,
  strategy_visit_eligible: client?.strategy_visit_eligible ?? false,
  strategy_sequence_step: client?.strategy_sequence_step ?? 1,
  strategy_reason_codes: client?.strategy_reason_codes ?? [],
  strategy_contact_plan: client?.strategy_contact_plan ?? null,
  strategy_actualizado_at: client?.strategy_actualizado_at ?? null
});

const mergeClientScoringIntoDetail = (previousDetail, scoringSnapshot) => {
  if (!previousDetail?.client || !scoringSnapshot) {
    return previousDetail;
  }

  return {
    ...previousDetail,
    client: {
      ...previousDetail.client,
      scoring_global: scoringSnapshot.score_global ?? null,
      scoring_llamada: scoringSnapshot.score_llamada ?? null,
      scoring_whatsapp: scoringSnapshot.score_whatsapp ?? null,
      scoring_sms: scoringSnapshot.score_sms ?? null,
      scoring_email: scoringSnapshot.score_email ?? null,
      scoring_visita: scoringSnapshot.score_visita ?? null,
      scoring_riesgo_nivel: scoringSnapshot.scoring_riesgo_nivel ?? null,
      scoring_permitir_contacto: scoringSnapshot.scoring_permitir_contacto ?? null,
      scoring_bloquear_cliente: scoringSnapshot.scoring_bloquear_cliente ?? null,
      scoring_recomendar_reintento: scoringSnapshot.scoring_recomendar_reintento ?? null,
      scoring_actualizado_at: scoringSnapshot.scoring_actualizado_at ?? null,
      strategy_next_best_action: scoringSnapshot.strategy_next_best_action ?? null,
      strategy_recommended_channel: scoringSnapshot.strategy_recommended_channel ?? null,
      strategy_should_stop_contact: scoringSnapshot.strategy_should_stop_contact ?? false,
      strategy_should_escalate_visit: scoringSnapshot.strategy_should_escalate_visit ?? false,
      strategy_visit_eligible: scoringSnapshot.strategy_visit_eligible ?? false,
      strategy_sequence_step: scoringSnapshot.strategy_sequence_step ?? 1,
      strategy_reason_codes: scoringSnapshot.strategy_reason_codes ?? [],
      strategy_contact_plan: scoringSnapshot.strategy_contact_plan ?? null,
      strategy_actualizado_at: scoringSnapshot.strategy_actualizado_at ?? null
    }
  };
};

const parseDateValue = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const inferClientStatus = ({ client, credits, totalDebt }) => {
  const candidates = [
    client?.estado,
    client?.status,
    ...(credits || []).flatMap((credit) => [credit?.estado, credit?.status])
  ]
    .map(normalizeStatusLabel)
    .filter(Boolean);

  if (candidates.includes('legal')) {
    return 'legal';
  }
  if (candidates.includes('negotiated')) {
    return 'negotiated';
  }
  if (candidates.includes('paid')) {
    return 'paid';
  }
  if (
    totalDebt <= 0 &&
    (credits || []).some((credit) => Array.isArray(credit?.balances) && credit.balances.length > 0)
  ) {
    return 'paid';
  }

  return 'active';
};

const normalizeComparableText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizePhoneForAction = (value) => String(value || '').replace(/\D/g, '');

function ClientHeader({
  loading,
  isReady,
  client,
  clientId,
  clientFullName,
  contacts,
  credits,
  balanceColumns,
  portafolioId,
  primaryBalanceColumn,
  balancesByCredit,
  onBack,
  onCopyValue
}) {
  const phoneItems = useMemo(
    () => (Array.isArray(contacts?.phones) ? contacts.phones : []).slice(0, 3),
    [contacts?.phones]
  );
  const hiddenPhoneCount = Math.max((contacts?.phones?.length || 0) - phoneItems.length, 0);
  const emailItems = useMemo(
    () => (Array.isArray(contacts?.emails) ? contacts.emails : []).slice(0, 3),
    [contacts?.emails]
  );
  const hiddenEmailCount = Math.max((contacts?.emails?.length || 0) - emailItems.length, 0);
  const addressItems = useMemo(
    () => (Array.isArray(contacts?.addresses) ? contacts.addresses : []).slice(0, 3),
    [contacts?.addresses]
  );
  const hiddenAddressCount = Math.max(
    (contacts?.addresses?.length || 0) - addressItems.length,
    0
  );
  const totalCredits = credits.length;
  const totalDebt = useMemo(() => {
    if (!primaryBalanceColumn) {
      return 0;
    }

    return sumCreditBalances(credits, [primaryBalanceColumn], balancesByCredit);
  }, [balancesByCredit, credits, primaryBalanceColumn]);

  const totalOverdue = useMemo(() => {
    const overdueColumns = (Array.isArray(balanceColumns) ? balanceColumns : []).filter((column) => {
      const label = normalizeComparableText(
        `${column?.label || ''} ${column?.nombre_campo || ''}`
      );

      return (
        label.includes('venc') ||
        label.includes('atras') ||
        label.includes('mora') ||
        label.includes('overdue') ||
        label.includes('delinq')
      );
    });

    return sumCreditBalances(credits, overdueColumns, balancesByCredit);
  }, [balanceColumns, balancesByCredit, credits]);

  const lastPaymentDate = useMemo(
    () => resolveLastPaymentDate(client, credits),
    [client, credits]
  );

  const status = useMemo(
    () => inferClientStatus({ client, credits, totalDebt }),
    [client, credits, totalDebt]
  );
  const statusPresentation = resolveStatusPresentation(status);

  if (loading && !isReady) {
    return (
      <Paper variant="panel" className="crm-client-detail__header-shell">
        <Box className="crm-client-detail__header-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <Paper key={index} variant="outlined" className="crm-client-detail__header-card">
              <Stack spacing={1.1}>
                <Skeleton variant="text" width="34%" />
                <Skeleton variant="text" width="68%" height={34} />
                <Skeleton variant="text" width="48%" />
                <Box className="crm-client-detail__header-summary-grid">
                  {Array.from({ length: 4 }).map((__, itemIndex) => (
                    <Box key={itemIndex} className="crm-client-detail__header-summary-item">
                      <Skeleton variant="text" width="56%" />
                      <Skeleton variant="text" width="74%" />
                    </Box>
                  ))}
                </Box>
              </Stack>
            </Paper>
          ))}
        </Box>
      </Paper>
    );
  }

  return (
    <Paper variant="panel" className="crm-client-detail__header-shell">
      <Box className="crm-client-detail__header-grid">
        <Paper
          variant="outlined"
          className="crm-client-detail__header-card crm-client-detail__header-card--identity"
        >
          <Stack className="crm-client-detail__header-card-head" direction="row" spacing={1}>
            <Stack className="crm-client-detail__header-card-copy">
              <Typography variant="h5" className="crm-client-detail__header-title">
                {clientFullName || client?.nombre || 'Cliente sin nombre'}
              </Typography>
              <Stack direction="row" spacing={0.7} useFlexGap flexWrap="wrap">
                <Chip
                  size="small"
                  label={statusPresentation.label}
                  color={statusPresentation.color}
                  variant="outlined"
                />
              </Stack>
            </Stack>
            <Button
              variant="outlined"
              startIcon={<ArrowBack fontSize="small" />}
              onClick={onBack}
              className="crm-client-detail__back-button"
            >
              Volver
            </Button>
          </Stack>

          <Box className="crm-client-detail__header-card-body">
            <Box className="crm-client-detail__header-summary-grid">
              <Box className="crm-client-detail__header-summary-item">
                <Typography variant="caption" className="crm-surface-card__meta-label">
                  Número de cliente
                </Typography>
                <Typography variant="body2" className="crm-surface-card__meta-value">
                  {client?.numero_cliente || client?.id || clientId || '-'}
                </Typography>
              </Box>
              <Box className="crm-client-detail__header-summary-item">
                <Typography variant="caption" className="crm-surface-card__meta-label">
                  Portafolio
                </Typography>
                <Typography variant="body2" className="crm-surface-card__meta-value">
                  {portafolioId || '-'}
                </Typography>
              </Box>
              <Box className="crm-client-detail__header-summary-item">
                <Typography variant="caption" className="crm-surface-card__meta-label">
                  RFC
                </Typography>
                <Typography variant="body2" className="crm-surface-card__meta-value">
                  {client?.rfc || '-'}
                </Typography>
              </Box>
              <Box className="crm-client-detail__header-summary-item">
                <Typography variant="caption" className="crm-surface-card__meta-label">
                  Estado
                </Typography>
                <Typography variant="body2" className="crm-surface-card__meta-value">
                  {statusPresentation.label}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

        <Paper variant="outlined" className="crm-client-detail__header-card">
          <Stack className="crm-client-detail__header-card-head">
            <Typography variant="subtitle1" className="crm-client-detail__header-section-title">
              Información de contacto
            </Typography>
          </Stack>

          <Box className="crm-client-detail__header-card-body crm-client-detail__header-card-body--contacts">
            <Stack className="crm-client-detail__contact-groups">
            <Stack className="crm-client-detail__contact-group">
              <Typography variant="caption" className="crm-client-detail__contact-group-title">
                Teléfonos
              </Typography>
              <Stack className="crm-client-detail__contact-card-list">
                {phoneItems.length === 0 ? (
                  <Box className="crm-client-detail__contact-card crm-client-detail__contact-card--empty">
                    <Typography variant="body2" color="text.secondary">
                      Sin teléfonos
                    </Typography>
                  </Box>
                ) : (
                  phoneItems.map((item, index) => {
                    const rawPhone = String(item?.telefono || '').trim();
                    const actionPhone = normalizePhoneForAction(rawPhone);
                    const whatsappHref = actionPhone ? `https://wa.me/${actionPhone}` : undefined;

                    return (
                      <Box
                        key={item?.id || `${rawPhone}-${index}`}
                        className="crm-client-detail__contact-card"
                      >
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                          <PhoneOutlined
                            fontSize="small"
                            className="crm-client-detail__contact-icon"
                          />
                          <Typography variant="body2" className="crm-client-detail__contact-card-value">
                            {rawPhone || '-'}
                          </Typography>
                        </Stack>
                        <Stack
                          direction="row"
                          spacing={0.35}
                          useFlexGap
                          className="crm-client-detail__contact-card-actions"
                        >
                          <Button
                            size="small"
                            variant="ghost"
                            component="a"
                            href={actionPhone ? `tel:${actionPhone}` : undefined}
                            disabled={!actionPhone}
                            className="crm-client-detail__contact-action"
                          >
                            Llamar
                          </Button>
                          <Button
                            size="small"
                            variant="ghost"
                            component="a"
                            href={whatsappHref}
                            target="_blank"
                            rel="noreferrer"
                            disabled={!whatsappHref}
                            className="crm-client-detail__contact-action"
                          >
                            WhatsApp
                          </Button>
                          <Button
                            size="small"
                            variant="ghost"
                            disabled={!rawPhone}
                            onClick={() => onCopyValue && onCopyValue(rawPhone, 'Telefono copiado')}
                            className="crm-client-detail__contact-action"
                          >
                            Copiar
                          </Button>
                        </Stack>
                      </Box>
                    );
                  })
                )}
                {hiddenPhoneCount > 0 && (
                  <Typography variant="caption" className="crm-client-detail__contact-more">
                    +{hiddenPhoneCount} más
                  </Typography>
                )}
              </Stack>
            </Stack>

            <Stack className="crm-client-detail__contact-group">
              <Typography variant="caption" className="crm-client-detail__contact-group-title">
                Correos
              </Typography>
              <Stack className="crm-client-detail__contact-card-list">
                {emailItems.length === 0 ? (
                  <Box className="crm-client-detail__contact-card crm-client-detail__contact-card--empty">
                    <Typography variant="body2" color="text.secondary">
                      Sin correos
                    </Typography>
                  </Box>
                ) : (
                  emailItems.map((item, index) => {
                    const email = String(item?.email || '').trim();

                    return (
                      <Box
                        key={item?.id || `${email}-${index}`}
                        className="crm-client-detail__contact-card"
                      >
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                          <EmailOutlined
                            fontSize="small"
                            className="crm-client-detail__contact-icon"
                          />
                          <Typography variant="body2" className="crm-client-detail__contact-card-value">
                            {email || '-'}
                          </Typography>
                        </Stack>
                        <Stack
                          direction="row"
                          spacing={0.35}
                          useFlexGap
                          className="crm-client-detail__contact-card-actions"
                        >
                          <Button
                            size="small"
                            variant="ghost"
                            component="a"
                            href={email ? `mailto:${email}` : undefined}
                            disabled={!email}
                            className="crm-client-detail__contact-action"
                          >
                            Correo
                          </Button>
                          <Button
                            size="small"
                            variant="ghost"
                            disabled={!email}
                            onClick={() => onCopyValue && onCopyValue(email, 'Email copiado')}
                            className="crm-client-detail__contact-action"
                          >
                            Copiar
                          </Button>
                        </Stack>
                      </Box>
                    );
                  })
                )}
                {hiddenEmailCount > 0 && (
                  <Typography variant="caption" className="crm-client-detail__contact-more">
                    +{hiddenEmailCount} más
                  </Typography>
                )}
              </Stack>
            </Stack>

            <Stack className="crm-client-detail__contact-group">
              <Typography variant="caption" className="crm-client-detail__contact-group-title">
                Direcciones
              </Typography>
              <Stack className="crm-client-detail__contact-card-list">
                {addressItems.length === 0 ? (
                  <Box className="crm-client-detail__contact-card crm-client-detail__contact-card--empty">
                    <Typography variant="body2" color="text.secondary">
                      Sin direcciones
                    </Typography>
                  </Box>
                ) : (
                  addressItems.map((item, index) => {
                    const addressValue = formatAddressValue(item);

                    return (
                      <Box
                        key={item?.id || `${addressValue}-${index}`}
                        className="crm-client-detail__contact-card crm-client-detail__contact-card--address"
                      >
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                          <PlaceOutlined
                            fontSize="small"
                            className="crm-client-detail__contact-icon"
                          />
                          <Typography
                            variant="body2"
                            className="crm-client-detail__contact-card-value crm-client-detail__contact-card-value--multiline"
                          >
                            {addressValue || '-'}
                          </Typography>
                        </Stack>
                      </Box>
                    );
                  })
                )}
                {hiddenAddressCount > 0 && (
                  <Typography variant="caption" className="crm-client-detail__contact-more">
                    +{hiddenAddressCount} más
                  </Typography>
                )}
              </Stack>
            </Stack>
            </Stack>
          </Box>
        </Paper>

        <Paper variant="outlined" className="crm-client-detail__header-card">
          <Stack className="crm-client-detail__header-card-head">
            <Typography variant="subtitle1" className="crm-client-detail__header-section-title">
              Resumen crediticio
            </Typography>
          </Stack>

          <Box className="crm-client-detail__header-card-body">
            <Box className="crm-client-detail__header-summary-grid crm-client-detail__header-summary-grid--compact">
              <Box className="crm-client-detail__header-summary-item">
                <Typography variant="caption" className="crm-surface-card__meta-label">
                  Total de créditos
                </Typography>
                <Typography variant="body2" className="crm-surface-card__meta-value">
                  {totalCredits}
                </Typography>
              </Box>
              <Box className="crm-client-detail__header-summary-item">
                <Typography variant="caption" className="crm-surface-card__meta-label">
                  Deuda total
                </Typography>
                <Typography variant="body2" className="crm-surface-card__meta-value">
                  {formatCurrency(totalDebt)}
                </Typography>
              </Box>
              <Box className="crm-client-detail__header-summary-item">
                <Typography variant="caption" className="crm-surface-card__meta-label">
                  Total vencido
                </Typography>
                <Typography variant="body2" className="crm-surface-card__meta-value">
                  {formatCurrency(totalOverdue)}
                </Typography>
              </Box>
              <Box className="crm-client-detail__header-summary-item">
                <Typography variant="caption" className="crm-surface-card__meta-label">
                  Último pago
                </Typography>
                <Typography variant="body2" className="crm-surface-card__meta-value">
                  {formatDateShort(lastPaymentDate)}
                </Typography>
              </Box>
            </Box>

          </Box>
        </Paper>
      </Box>
    </Paper>
  );
}

function ClientDocumentsPanel() {
  return (
    <Paper variant="panel-sm">
      <Stack spacing={2}>
        <Stack className="crm-surface-card__header">
          <Stack className="crm-surface-card__header-main">
            <Typography variant="overline" className="crm-surface-card__eyebrow">
              Expediente
            </Typography>
            <Typography variant="subtitle1" className="crm-surface-card__title">
              Documentos
            </Typography>
          </Stack>
        </Stack>

        <EmptyState
          title="Sin documentos"
          description="No hay documentos asociados a este cliente en la vista actual."
          icon={null}
          dense
        />
      </Stack>
    </Paper>
  );
}

function ScoreChannelCard({ label, value, icon }) {
  const signal = resolveScoreSignal(value);
  const displayValue = formatScoreValue(value);
  const paletteKey = signal.palette === 'default' ? 'grey' : signal.palette;

  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        borderRadius: 3,
        p: 2,
        minHeight: 132,
        borderColor:
          signal.palette === 'default'
            ? theme.palette.divider
            : alpha(theme.palette[paletteKey].main, 0.32),
        background:
          signal.palette === 'default'
            ? theme.palette.background.paper
            : `linear-gradient(180deg, ${alpha(theme.palette[paletteKey].main, 0.12)}, ${alpha(
                theme.palette[paletteKey].main,
                0.03
              )})`
      })}
    >
      <Stack spacing={1.2} sx={{ height: '100%' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <Box
              sx={(theme) => ({
                width: 38,
                height: 38,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                bgcolor:
                  signal.palette === 'default'
                    ? theme.palette.action.hover
                    : alpha(theme.palette[paletteKey].main, 0.14),
                color:
                  signal.palette === 'default'
                    ? theme.palette.text.secondary
                    : theme.palette[paletteKey].main
              })}
            >
              {icon}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
          </Stack>

          <Box
            sx={(theme) => ({
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor:
                signal.palette === 'default'
                  ? theme.palette.action.disabled
                  : theme.palette[paletteKey].main,
              boxShadow:
                signal.palette === 'default'
                  ? 'none'
                  : `0 0 0 4px ${alpha(theme.palette[paletteKey].main, 0.12)}`
            })}
          />
        </Stack>

        <Typography variant="h4">{displayValue}</Typography>

        <Stack direction="row" spacing={0.75} alignItems="center">
          <Chip size="small" color={signal.palette} label={signal.label} />
          <Typography variant="caption" color="text.secondary">
            {signal.tone}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}

function ClientScorePanel({ scoring, loading = false }) {
  const scoreItems = [
    {
      key: 'llamada',
      label: 'Llamada',
      value: scoring?.score_llamada,
      icon: <Call fontSize="small" />
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      value: scoring?.score_whatsapp,
      icon: <WhatsApp fontSize="small" />
    },
    {
      key: 'sms',
      label: 'SMS',
      value: scoring?.score_sms,
      icon: <Sms fontSize="small" />
    },
    {
      key: 'email',
      label: 'Email',
      value: scoring?.score_email,
      icon: <EmailOutlined fontSize="small" />
    },
    {
      key: 'visita',
      label: 'Visita',
      value: scoring?.score_visita,
      icon: <DirectionsWalk fontSize="small" />
    }
  ];

  const globalSignal = resolveScoreSignal(scoring?.score_global);
  const globalPaletteKey = globalSignal.palette === 'default' ? 'grey' : globalSignal.palette;

  if (loading) {
    return (
      <Paper variant="panel">
        <Stack spacing={2}>
          <Skeleton variant="text" width="18%" />
          <Skeleton variant="text" width="32%" height={34} />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.1fr) minmax(0, 1.9fr)' },
              gap: 2
            }}
          >
            <Skeleton variant="rounded" height={220} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                gap: 2
              }}
            >
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} variant="rounded" height={132} />
              ))}
            </Box>
          </Box>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      variant="panel"
      sx={(theme) => ({
        overflow: 'hidden',
        background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.05)}, transparent 42%)`
      })}
    >
      <Stack spacing={2.2}>
        <Stack className="crm-surface-card__header">
          <Stack className="crm-surface-card__header-main">
            <Typography variant="overline" className="crm-surface-card__eyebrow">
              Decision Engine
            </Typography>
            <Typography variant="h6" className="crm-surface-card__title">
              Score del Cliente
            </Typography>
            <Typography variant="body2" className="crm-surface-card__subtitle">
              Vista consolidada del score general, canales y nivel de riesgo actual.
            </Typography>
          </Stack>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', xl: 'minmax(0, 1.05fr) minmax(0, 1.95fr)' },
            gap: 2
          }}
        >
          <Paper
            variant="outlined"
            sx={(theme) => ({
              borderRadius: 3,
              p: 2.5,
              minHeight: 220,
              borderColor:
                globalSignal.palette === 'default'
                  ? theme.palette.divider
                  : alpha(theme.palette[globalPaletteKey].main, 0.34),
              background:
                globalSignal.palette === 'default'
                  ? theme.palette.background.paper
                  : `linear-gradient(165deg, ${alpha(
                      theme.palette[globalPaletteKey].main,
                      0.16
                    )}, ${alpha(theme.palette[globalPaletteKey].main, 0.04)})`
            })}
          >
            <Stack spacing={2} sx={{ height: '100%' }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <Box
                    sx={(theme) => ({
                      width: 46,
                      height: 46,
                      borderRadius: 2.5,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor:
                        globalSignal.palette === 'default'
                          ? theme.palette.action.hover
                          : alpha(theme.palette[globalPaletteKey].main, 0.14),
                      color:
                        globalSignal.palette === 'default'
                          ? theme.palette.text.secondary
                          : theme.palette[globalPaletteKey].main
                    })}
                  >
                    <InsightsOutlined />
                  </Box>
                  <Stack spacing={0.25}>
                    <Typography variant="body2" color="text.secondary">
                      Score general
                    </Typography>
                    <Typography variant="h3">{formatScoreValue(scoring?.score_global)}</Typography>
                  </Stack>
                </Stack>

                <Chip
                  size="small"
                  color={resolveRiskColor(scoring?.scoring_riesgo_nivel)}
                  label={scoring?.scoring_riesgo_nivel || 'Sin riesgo'}
                />
              </Stack>

              <Typography variant="body2" color="text.secondary">
                Riesgo actual del cliente: <strong>{scoring?.scoring_riesgo_nivel || 'Sin clasificar'}</strong>
              </Typography>

              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip size="small" color={globalSignal.palette} label={globalSignal.label} />
                <Chip size="small" variant="outlined" label={globalSignal.tone} />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Actualizado ${formatDateShort(scoring?.scoring_actualizado_at)}`}
                />
              </Stack>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 1.25,
                  mt: 'auto'
                }}
              >
                {[
                  { label: 'Verde', note: '>= 70', palette: 'success' },
                  { label: 'Amarillo', note: '>= 40', palette: 'warning' },
                  { label: 'Rojo', note: '< 40', palette: 'error' }
                ].map((item) => (
                  <Box
                    key={item.label}
                    sx={(theme) => ({
                      borderRadius: 2,
                      px: 1.2,
                      py: 1,
                      bgcolor: alpha(theme.palette[item.palette].main, 0.1)
                    })}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {item.label}
                    </Typography>
                    <Typography variant="body2" className="crm-text-strong">
                      {item.note}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Stack>
          </Paper>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: 2
            }}
          >
            {scoreItems.map((item) => (
              <ScoreChannelCard
                key={item.key}
                label={item.label}
                value={item.value}
                icon={item.icon}
              />
            ))}
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}

function ClientOperationsTabs({ activeTab, onTabChange, error, onErrorClear, tabs = [] }) {
  return (
    <Paper variant="panel" className="crm-client-detail__operations-shell">
      <Box className="crm-client-detail__tabs-shell">
        <Tabs
          value={activeTab}
          onChange={onTabChange}
          variant="scrollable"
          className="crm-client-detail__tabs"
        >
          {tabs.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>
      </Box>

      <Box className="crm-client-detail__operations-content">
        <Stack spacing={1.2}>
          {error && (
            <Alert severity="error" onClose={onErrorClear}>
            {error}
          </Alert>
        )}

          {tabs.find((tab) => tab.value === activeTab)?.content || null}
        </Stack>
      </Box>
    </Paper>
  );
}

export default function ClientDetail({ routeParams }) {
  const { hasPermission } = usePermissions();
  const { notify } = useNotify();
  const canRead = hasPermission('clients.read');
  const canLog = hasPermission('gestiones.create');
  const canViewGestiones =
    hasPermission('gestiones.view_all') ||
    hasPermission('gestiones.view_portfolio') ||
    hasPermission('gestiones.view_own');
  const canConfigureDictamenes = hasPermission('dictamenes.read');
  const canReadNegotiations = hasPermission('negotiations.read');
  const canWriteNegotiations = hasPermission('negotiations.write');
  const { navigate } = useNavigation();

  const clientId = useMemo(() => {
    const fromRoute = (routeParams?.id || '').trim();
    if (fromRoute) {
      return fromRoute;
    }

    return getClientIdFromPath();
  }, [routeParams]);

  const [portafolioId, setPortafolioId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    medio_contacto: '',
    dictamen_id: '',
    comentario: ''
  });
  const [savingGestion, setSavingGestion] = useState(false);
  const [formError, setFormError] = useState('');

  const [gestiones, setGestiones] = useState([]);
  const [gestionesLoading, setGestionesLoading] = useState(false);
  const [gestionesError, setGestionesError] = useState('');
  const [gestionesPage, setGestionesPage] = useState(0);
  const [gestionesHasNext, setGestionesHasNext] = useState(false);
  const gestionesRowsPerPage = 20;

  const [activeTab, setActiveTab] = useState(DETAIL_TAB_VALUES.creditos);

  const loadClientDetail = useCallback(
    async (signal) => {
      if (!canRead || !clientId) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const data = await getClientDetail({
          id: clientId,
          signal
        });

        if (data?.client?.portafolio_id) {
          setPortafolioId(data.client.portafolio_id);
        }

        setDetail(data);
      } catch (err) {
        if (!signal?.aborted) {
          setError(err.message || 'No fue posible cargar el cliente.');
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [canRead, clientId]
  );

  useEffect(() => {
    if (!canRead) {
      return undefined;
    }

    if (!clientId) {
      setError('Cliente no valido.');
      return undefined;
    }

    const controller = new AbortController();
    loadClientDetail(controller.signal);
    return () => controller.abort();
  }, [canRead, clientId, loadClientDetail]);

  useEffect(() => {
    if (!canRead && activeTab !== DETAIL_TAB_VALUES.creditos) {
      setActiveTab(DETAIL_TAB_VALUES.creditos);
    }
  }, [activeTab, canRead]);

  const loadGestiones = useCallback(
    async (opts = {}) => {
      if (!canRead || !clientId || !portafolioId) {
        return;
      }

      const page = Number.isInteger(opts.page) && opts.page >= 0 ? opts.page : 0;
      const offset = page * gestionesRowsPerPage;

      setGestionesLoading(true);
      setGestionesError('');

      try {
        const { data } = await listHistorialGestiones({
          clienteId: clientId,
          portafolioId,
          limit: gestionesRowsPerPage,
          offset
        });

        setGestiones((prev) => {
          if (page === 0) {
            return data;
          }

          const next = [...prev];
          data.forEach((row) => {
            if (!next.some((item) => String(item.id) === String(row.id))) {
              next.push(row);
            }
          });
          return next;
        });
        setGestionesHasNext(data.length === gestionesRowsPerPage);
      } catch (err) {
        setGestionesError(err.message || 'No fue posible cargar el historial de gestiones.');
        if (page === 0) {
          setGestiones([]);
        }
        setGestionesHasNext(false);
      } finally {
        setGestionesLoading(false);
      }
    },
    [canRead, clientId, gestionesRowsPerPage, portafolioId]
  );

  useEffect(() => {
    if (!canRead || !canViewGestiones || !clientId || !portafolioId) {
      return;
    }

    setGestionesPage(0);
    loadGestiones({ page: 0 });
  }, [canRead, canViewGestiones, clientId, loadGestiones, portafolioId]);

  const client = detail?.client;
  const credits = detail?.credits || [];
  const contacts = detail?.contacts || { phones: [], emails: [], addresses: [] };
  const payments = useMemo(
    () =>
      Array.isArray(detail?.payments)
        ? detail.payments
        : Array.isArray(detail?.pagos)
          ? detail.pagos
          : [],
    [detail]
  );
  const isReady = Boolean(detail);
  const clientFullName = resolveClientFullName(client);
  const clientScoring = useMemo(() => resolveClientScoringSnapshot(client), [client]);

  const balanceColumns = useMemo(() => {
    const columnMap = new Map();

    credits.forEach((credit) => {
      (credit.balances || []).forEach((balance) => {
        const field = balance.campo_saldo;
        if (!field?.id) {
          return;
        }

        const fieldId = String(field.id);

        if (!columnMap.has(fieldId)) {
          columnMap.set(fieldId, {
            id: fieldId,
            label: field.etiqueta_visual || field.nombre_campo || `Saldo ${field.id}`,
            tipo_dato: field.tipo_dato,
            orden: field.orden,
            es_principal: Boolean(field.es_principal)
          });
        }
      });
    });

    const columns = Array.from(columnMap.values());
    columns.sort((a, b) => {
      if (a.es_principal !== b.es_principal) {
        return a.es_principal ? -1 : 1;
      }

      const orderA = Number.isFinite(a.orden) ? a.orden : Number.MAX_SAFE_INTEGER;
      const orderB = Number.isFinite(b.orden) ? b.orden : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.label.localeCompare(b.label, 'es');
    });

    return columns;
  }, [credits]);

  const balancesByCredit = useMemo(() => {
    const map = new Map();

    credits.forEach((credit) => {
      const balanceMap = new Map();
      (credit.balances || []).forEach((balance) => {
        const fieldId = balance.campo_saldo_id || balance?.campo_saldo?.id;
        if (fieldId) {
          balanceMap.set(String(fieldId), balance);
        }
      });
      map.set(String(credit.id), balanceMap);
    });

    return map;
  }, [credits]);

  const handleRegisterGestion = useCallback(async () => {
    setFormError('');

    const medioContacto = String(form.medio_contacto || '').trim();
    const dictamenId = form.dictamen_id;
    const comentario = (form.comentario || '').trim();

    if (!medioContacto) {
      setFormError('Selecciona un medio de contacto.');
      return;
    }

    if (!dictamenId) {
      setFormError('Selecciona un dictamen.');
      return;
    }

    if (!comentario) {
      setFormError('El comentario es obligatorio.');
      return;
    }

    if (!portafolioId) {
      setFormError('No hay portafolio asociado al cliente.');
      return;
    }

    const payload = {
      portafolio_id: portafolioId,
      cliente_id: clientId,
      medio_contacto: medioContacto,
      dictamen_id: dictamenId,
      comentario,
      fecha_gestion: new Date().toISOString()
    };

    try {
      setSavingGestion(true);
      const result = await createGestion(payload);
      notify('Gestion registrada', { severity: 'success' });
      setActiveTab(DETAIL_TAB_VALUES.gestiones);

      if (result?.client_scoring) {
        setDetail((prev) => mergeClientScoringIntoDetail(prev, result.client_scoring));
      }

      if (canViewGestiones) {
        setGestionesPage(0);
        loadGestiones({ page: 0 });
      }

      setForm({
        medio_contacto: '',
        dictamen_id: '',
        comentario: ''
      });
    } catch (err) {
      setFormError(err.message || 'No fue posible registrar la gestion.');
    } finally {
      setSavingGestion(false);
    }
  }, [
    canViewGestiones,
    clientId,
    form,
    loadGestiones,
    notify,
    portafolioId
  ]);

  const handleLoadMoreGestiones = useCallback(() => {
    const nextPage = gestionesPage + 1;
    setGestionesPage(nextPage);
    loadGestiones({ page: nextPage });
  }, [gestionesPage, loadGestiones]);

  const handleClearFormError = useCallback(() => {
    setFormError('');
  }, []);

  const handleClearGestionesError = useCallback(() => {
    setGestionesError('');
  }, []);

  const handleTabChange = useCallback((_, nextTab) => {
    setActiveTab(nextTab);
  }, []);

  const handleBackToClients = useCallback(() => {
    navigate(
      portafolioId
        ? buildRoutePath('clients', {}, { portafolio_id: portafolioId })
        : buildRoutePath('clients')
    );
  }, [navigate, portafolioId]);

  const primaryBalanceColumn = useMemo(
    () => resolvePrimaryBalanceColumn(balanceColumns),
    [balanceColumns]
  );
  const remainingBalance = useMemo(() => {
    if (!primaryBalanceColumn) {
      return null;
    }

    return sumCreditBalances(credits, [primaryBalanceColumn], balancesByCredit);
  }, [balancesByCredit, credits, primaryBalanceColumn]);

  const handleCopyValue = useCallback(
    async (value, message = 'Valor copiado') => {
      if (!value || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        return;
      }

      try {
        await navigator.clipboard.writeText(String(value));
        notify(message, { severity: 'success' });
      } catch {
        notify('No fue posible copiar el valor.', { severity: 'error' });
      }
    },
    [notify]
  );

  const handleOpenDictamenes = useCallback(() => {
    navigate(
      buildRoutePath('dictamenes', {}, { portafolio_id: portafolioId || undefined })
    );
  }, [navigate, portafolioId]);

  if (!canRead) {
    return (
      <Page>
        <PageHeader
          breadcrumbs={[
            { label: 'Inicio', href: buildRoutePath('dashboard') },
            { label: 'Clientes' },
            { label: 'Detalle' }
          ]}
          title="Detalle del cliente"
          subtitle="Vista integral del expediente y operación del cliente."
        />
        <PageContent>
          <EmptyState
            eyebrow="Acceso"
            title="Sin permisos para ver el detalle"
            description="Tu perfil actual no puede abrir expedientes de clientes."
            icon={null}
          />
        </PageContent>
      </Page>
    );
  }

  return (
    <Page>
      <PageContent>
        <Box className="crm-client-detail-page">
          <Box className="crm-client-detail__shell">
            <Box className="crm-client-detail__header-zone">
              <ClientHeader
                loading={loading}
                isReady={isReady}
                client={client}
                clientId={clientId}
                clientFullName={clientFullName}
                contacts={contacts}
                credits={credits}
                balanceColumns={balanceColumns}
                portafolioId={portafolioId}
                primaryBalanceColumn={primaryBalanceColumn}
                balancesByCredit={balancesByCredit}
                onBack={handleBackToClients}
                onCopyValue={handleCopyValue}
              />
            </Box>

            <Box className="crm-client-detail__score-zone">
              <ClientScorePanel scoring={clientScoring} loading={loading && !isReady} />
            </Box>

            <Box className="crm-client-detail__operations-zone">
              <ClientOperationsTabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
                error={error}
                onErrorClear={() => setError('')}
                tabs={[
                  {
                    value: DETAIL_TAB_VALUES.creditos,
                    label: 'Créditos',
                    content: (
                      <Box className="crm-client-detail__tab-panel">
                        <CreditsWidget
                          title="Detalle de créditos"
                          credits={credits}
                          balanceColumns={balanceColumns}
                          balancesByCredit={balancesByCredit}
                          loading={loading}
                          isReady={isReady}
                        />
                      </Box>
                    )
                  },
                  {
                    value: DETAIL_TAB_VALUES.gestiones,
                    label: 'Gestiones',
                    content: (
                      <Box className="crm-client-detail__tab-panel">
                        <GestionesWidget
                          title="Gestiones"
                          portafolioId={portafolioId}
                          canLog={canLog}
                          canViewGestiones={canViewGestiones}
                          canConfigureDictamenes={canConfigureDictamenes}
                          form={form}
                          setForm={setForm}
                          formError={formError}
                          onFormErrorClear={handleClearFormError}
                          savingGestion={savingGestion}
                          onSubmit={handleRegisterGestion}
                          gestiones={gestiones}
                          gestionesLoading={gestionesLoading}
                          gestionesError={gestionesError}
                          onGestionesErrorClear={handleClearGestionesError}
                          gestionesHasNext={gestionesHasNext}
                          onLoadMore={handleLoadMoreGestiones}
                          onOpenDictamenes={handleOpenDictamenes}
                          clientScoring={clientScoring}
                          showForm={canLog}
                          showHistory
                        />
                      </Box>
                    )
                  },
                  {
                    value: DETAIL_TAB_VALUES.pagos,
                    label: 'Pagos',
                    content: (
                      <Box className="crm-client-detail__tab-panel">
                        <PaymentsWidget
                          title="Pagos del cliente"
                          payments={payments}
                          credits={credits}
                          remainingBalance={remainingBalance}
                          loading={loading && !isReady}
                        />
                      </Box>
                    )
                  },
                  {
                    value: DETAIL_TAB_VALUES.negociaciones,
                    label: 'Negociaciones',
                    content: (
                      <Box className="crm-client-detail__tab-panel">
                        <NegotiationsWidget
                          clientId={clientId}
                          portafolioId={portafolioId}
                          credits={credits}
                          canRead={canReadNegotiations}
                          canWrite={canWriteNegotiations}
                        />
                      </Box>
                    )
                  },
                  {
                    value: DETAIL_TAB_VALUES.documentos,
                    label: 'Documentos',
                    content: (
                      <Box className="crm-client-detail__tab-panel">
                        <ClientDocumentsPanel />
                      </Box>
                    )
                  }
                ]}
              />
            </Box>
          </Box>

        </Box>
      </PageContent>
    </Page>
  );
}
