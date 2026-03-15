import {
  ArrowBack,
  EmailOutlined,
  PaymentsOutlined,
  PlaceOutlined,
  PhoneOutlined,
  PostAddOutlined,
  WhatsApp,
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
import { useCallback, useEffect, useMemo, useState } from 'react';
import EmptyState from '../components/EmptyState.jsx';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import usePermissions from '../hooks/usePermissions.js';
import useNotify from '../hooks/useNotify.jsx';
import useNavigation from '../hooks/useNavigation.js';
import { getClientDetail } from '../services/clients.js';
import { createGestion, listHistorialGestiones, listResultadosGestion } from '../services/gestiones.js';
import { buildRoutePath, getRouteParams } from '../routes/paths.js';
import CreditsWidget from '../modules/clientDetail/widgets/CreditsWidget.jsx';
import GestionesWidget from '../modules/clientDetail/widgets/GestionesWidget.jsx';
import NegotiationsWidget from '../modules/clientDetail/widgets/NegotiationsWidget.jsx';
import PaymentsWidget from '../modules/clientDetail/widgets/PaymentsWidget.jsx';

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN'
});
const integerFormatter = new Intl.NumberFormat('es-MX');

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

const resolveRiskLevel = ({ status, totalDebt, totalOverdue }) => {
  if (status === 'legal') {
    return { label: 'Alta morosidad', color: 'error' };
  }

  if (totalDebt <= 0 || totalOverdue <= 0) {
    return { label: 'Al corriente', color: 'success' };
  }

  const ratio = totalDebt > 0 ? totalOverdue / totalDebt : 0;
  if (ratio >= 0.35) {
    return { label: 'Alta morosidad', color: 'error' };
  }

  return { label: 'Riesgo', color: 'warning' };
};

const normalizeComparableText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const resolveOverdueDaysColumns = (balanceColumns) =>
  (Array.isArray(balanceColumns) ? balanceColumns : []).filter((column) => {
    const text = normalizeComparableText(
      `${column?.label || ''} ${column?.nombre_campo || ''}`
    );

    const mentionsDays = text.includes('dia') || text.includes('days');
    const mentionsDelinquency =
      text.includes('atras') ||
      text.includes('mora') ||
      text.includes('venc') ||
      text.includes('overdue') ||
      text.includes('delinq');

    return mentionsDays && mentionsDelinquency;
  });

const resolveMaxBalanceMetric = (credits, balanceColumns, balancesByCredit) => {
  let maxValue = null;

  (credits || []).forEach((credit) => {
    (balanceColumns || []).forEach((column) => {
      const balance = resolveCreditBalance(balancesByCredit, credit.id, column);
      const numeric = toNumber(balance?.valor);

      if (numeric === null) {
        return;
      }

      maxValue = maxValue === null ? numeric : Math.max(maxValue, numeric);
    });
  });

  return maxValue;
};

const resolveDaysOverdue = ({
  credits,
  balanceColumns,
  balancesByCredit,
  lastPaymentDate,
  totalOverdue
}) => {
  const explicitDays = resolveMaxBalanceMetric(
    credits,
    resolveOverdueDaysColumns(balanceColumns),
    balancesByCredit
  );

  if (explicitDays !== null) {
    return Math.max(0, Math.round(explicitDays));
  }

  if (totalOverdue <= 0) {
    return 0;
  }

  const lastPayment = parseDateValue(lastPaymentDate);
  if (!lastPayment) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastPayment.setHours(0, 0, 0, 0);

  const diffDays = Math.round((today.getTime() - lastPayment.getTime()) / 86400000);
  return Math.max(diffDays, 0);
};

const resolveContactability = (contacts) => {
  const phones = (Array.isArray(contacts?.phones) ? contacts.phones : []).filter((item) =>
    Boolean(String(item?.telefono || '').trim())
  ).length;
  const emails = (Array.isArray(contacts?.emails) ? contacts.emails : []).filter((item) =>
    Boolean(String(item?.email || '').trim())
  ).length;
  const addresses = (Array.isArray(contacts?.addresses) ? contacts.addresses : []).filter(
    (item) => Boolean(formatAddressValue(item))
  ).length;

  const score = Math.min(
    100,
    phones * 40 + emails * 25 + addresses * 20 + (phones > 0 && emails > 0 ? 15 : 0)
  );

  if (score >= 80) {
    return { label: 'Contacto Alto', tone: 'success', score };
  }

  if (score >= 45) {
    return { label: 'Contacto Medio', tone: 'warning', score };
  }

  return {
    label: score > 0 ? 'Contacto Bajo' : 'Sin contacto',
    tone: 'danger',
    score
  };
};

const resolveCollectionScore = ({ status, totalDebt, totalOverdue, contactability, daysOverdue }) => {
  if (totalDebt <= 0 || totalOverdue <= 0) {
    return { label: 'Riesgo Bajo', tone: 'success' };
  }

  const ratio = totalDebt > 0 ? totalOverdue / totalDebt : 0;

  if (
    status === 'legal' ||
    ratio >= 0.35 ||
    (Number.isFinite(daysOverdue) && daysOverdue >= 90)
  ) {
    return { label: 'Riesgo Alto', tone: 'danger' };
  }

  if (
    ratio >= 0.12 ||
    (Number.isFinite(daysOverdue) && daysOverdue >= 30) ||
    contactability.score < 45
  ) {
    return { label: 'Riesgo Medio', tone: 'warning' };
  }

  return { label: 'Riesgo Bajo', tone: 'success' };
};

const normalizePhoneForAction = (value) => String(value || '').replace(/\D/g, '');

const isEditableTarget = (target) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]')
  );
};

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
  const overdueBalanceColumns = useMemo(
    () => resolveOverdueBalanceColumns(balanceColumns),
    [balanceColumns]
  );

  const totalDebt = useMemo(() => {
    if (!primaryBalanceColumn) {
      return 0;
    }

    return sumCreditBalances(credits, [primaryBalanceColumn], balancesByCredit);
  }, [balancesByCredit, credits, primaryBalanceColumn]);

  const totalOverdue = useMemo(
    () => sumCreditBalances(credits, overdueBalanceColumns, balancesByCredit),
    [balancesByCredit, credits, overdueBalanceColumns]
  );

  const lastPaymentDate = useMemo(
    () => resolveLastPaymentDate(client, credits),
    [client, credits]
  );
  const daysOverdue = useMemo(
    () =>
      resolveDaysOverdue({
        credits,
        balanceColumns,
        balancesByCredit,
        lastPaymentDate,
        totalOverdue
      }),
    [balanceColumns, balancesByCredit, credits, lastPaymentDate, totalOverdue]
  );

  const status = useMemo(
    () => inferClientStatus({ client, credits, totalDebt }),
    [client, credits, totalDebt]
  );
  const statusPresentation = resolveStatusPresentation(status);
  const contactability = useMemo(() => resolveContactability(contacts), [contacts]);
  const collectionScore = useMemo(
    () =>
      resolveCollectionScore({
        status,
        totalDebt,
        totalOverdue,
        contactability,
        daysOverdue
      }),
    [contactability, daysOverdue, status, totalDebt, totalOverdue]
  );
  const daysOverdueDisplay =
    daysOverdue === null ? 'N/D' : `${integerFormatter.format(daysOverdue)} días`;

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
            <Typography variant="body2" className="crm-client-detail__header-section-subtitle">
              Vista rápida de cobranza para decisiones operativas.
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

            <Box className="crm-client-detail__indicator-grid">
              <Box
                className={[
                  'crm-client-detail__indicator-card',
                  `crm-client-detail__indicator-card--${
                    daysOverdue !== null && daysOverdue >= 90
                      ? 'danger'
                      : daysOverdue !== null && daysOverdue >= 30
                        ? 'warning'
                        : 'success'
                  }`
                ].join(' ')}
              >
                <Typography variant="caption" className="crm-client-detail__indicator-label">
                  Días de atraso
                </Typography>
                <Typography variant="body2" className="crm-client-detail__indicator-value">
                  {daysOverdueDisplay}
                </Typography>
              </Box>

              <Box
                className={[
                  'crm-client-detail__indicator-card',
                  `crm-client-detail__indicator-card--${collectionScore.tone}`
                ].join(' ')}
              >
                <Typography variant="caption" className="crm-client-detail__indicator-label">
                  Score de cobranza
                </Typography>
                <Typography variant="body2" className="crm-client-detail__indicator-value">
                  {collectionScore.label}
                </Typography>
              </Box>

              <Box
                className={[
                  'crm-client-detail__indicator-card',
                  `crm-client-detail__indicator-card--${contactability.tone}`
                ].join(' ')}
              >
                <Typography variant="caption" className="crm-client-detail__indicator-label">
                  Contactabilidad
                </Typography>
                <Typography variant="body2" className="crm-client-detail__indicator-value">
                  {contactability.label}
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
            <Typography variant="body2" className="crm-surface-card__subtitle">
              Esta vista conserva el espacio operativo para documentos cuando el expediente los
              tenga disponibles.
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

function ClientQuickActions({
  onCall,
  onWhatsapp,
  onNewGestion,
  onRegisterPayment,
  hasPhone = false
}) {
  const actions = [
    {
      id: 'call',
      label: 'Llamar',
      icon: <PhoneOutlined fontSize="small" />,
      onClick: onCall,
      disabled: !hasPhone || typeof onCall !== 'function'
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: <WhatsApp fontSize="small" />,
      onClick: onWhatsapp,
      disabled: !hasPhone || typeof onWhatsapp !== 'function'
    },
    {
      id: 'gestion',
      label: 'Nueva gestión',
      icon: <PostAddOutlined fontSize="small" />,
      onClick: onNewGestion,
      disabled: typeof onNewGestion !== 'function'
    },
    {
      id: 'payment',
      label: 'Registrar pago',
      icon: <PaymentsOutlined fontSize="small" />,
      onClick: onRegisterPayment,
      disabled: typeof onRegisterPayment !== 'function'
    }
  ];

  return (
    <Box className="crm-client-detail__quick-actions">
      <Stack className="crm-client-detail__quick-actions-stack">
        {actions.map((action) => (
          <Button
            key={action.id}
            onClick={action.onClick}
            disabled={action.disabled}
            startIcon={action.icon}
            variant="outlined"
            size="small"
            className="crm-client-detail__quick-action-button"
            aria-label={action.label}
          >
            <Box component="span" className="crm-client-detail__quick-action-text">
              {action.label}
            </Box>
          </Button>
        ))}
      </Stack>
    </Box>
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

  const [resultados, setResultados] = useState([]);
  const [resultadosLoading, setResultadosLoading] = useState(false);
  const [form, setForm] = useState({
    resultado_id: '',
    comentario: '',
    promesa_monto: '',
    promesa_fecha: ''
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
  const [gestionesQuickAction, setGestionesQuickAction] = useState(null);
  const [gestionesFocusReturnToken, setGestionesFocusReturnToken] = useState(null);

  useEffect(() => {
    if (!canRead) {
      return undefined;
    }

    if (!clientId) {
      setError('Cliente no valido.');
      return undefined;
    }

    const controller = new AbortController();

    const fetchDetail = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getClientDetail({
          id: clientId,
          signal: controller.signal
        });

        if (data?.client?.portafolio_id) {
          setPortafolioId(data.client.portafolio_id);
        }

        setDetail(data);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message || 'No fue posible cargar el cliente.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchDetail();

    return () => controller.abort();
  }, [canRead, clientId]);

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

        setGestiones(data);
        setGestionesHasNext(data.length === gestionesRowsPerPage);
      } catch (err) {
        setGestionesError(err.message || 'No fue posible cargar el historial de gestiones.');
        setGestiones([]);
        setGestionesHasNext(false);
      } finally {
        setGestionesLoading(false);
      }
    },
    [canRead, clientId, gestionesRowsPerPage, portafolioId]
  );

  useEffect(() => {
    if (!canLog || !portafolioId) {
      return;
    }

    setResultadosLoading(true);
    listResultadosGestion({ portafolioId })
      .then((data) => setResultados(data))
      .catch(() => {
        notify('No se pudieron cargar los resultados de gestion', { severity: 'error' });
      })
      .finally(() => setResultadosLoading(false));
  }, [canLog, notify, portafolioId]);

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
  const primaryContactPhone = useMemo(
    () => String(contacts?.phones?.[0]?.telefono || '').trim(),
    [contacts]
  );

  const selectedResultado = resultados.find(
    (item) => String(item.id) === String(form.resultado_id)
  );
  const requierePromesa = Boolean(selectedResultado?.requiere_promesa);

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

    const resultadoId = form.resultado_id;
    const comentario = (form.comentario || '').trim();

    if (!resultadoId) {
      setFormError('Selecciona un resultado.');
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
      credito_id: credits[0]?.id || null,
      resultado_id: resultadoId,
      comentario,
      fecha_gestion: new Date().toISOString()
    };

    if (requierePromesa) {
      if (!form.promesa_monto || Number.parseFloat(form.promesa_monto) <= 0) {
        setFormError('Ingresa un monto de promesa valido.');
        return;
      }

      if (!form.promesa_fecha) {
        setFormError('Ingresa la fecha de promesa.');
        return;
      }

      payload.promesa_monto = Number.parseFloat(form.promesa_monto);
      payload.promesa_fecha = new Date(form.promesa_fecha).toISOString();
    }

    try {
      setSavingGestion(true);
      await createGestion(payload);
      notify('Gestion registrada', { severity: 'success' });
      setActiveTab(DETAIL_TAB_VALUES.gestiones);
      setGestionesFocusReturnToken(Date.now());

      if (canViewGestiones) {
        setGestionesPage(0);
        loadGestiones({ page: 0 });
      }

      setForm({
        resultado_id: '',
        comentario: '',
        promesa_monto: '',
        promesa_fecha: ''
      });
    } catch (err) {
      setFormError(err.message || 'No fue posible registrar la gestion.');
    } finally {
      setSavingGestion(false);
    }
  }, [
    canViewGestiones,
    clientId,
    credits,
    form,
    loadGestiones,
    notify,
    portafolioId,
    requierePromesa
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

  const handleQuickNewGestion = useCallback(() => {
    if (!canLog) {
      setActiveTab(DETAIL_TAB_VALUES.gestiones);
      setGestionesFocusReturnToken(Date.now());
      return;
    }

    const token = Date.now();
    setActiveTab(DETAIL_TAB_VALUES.gestiones);
    setGestionesQuickAction({ mode: 'gestion', token });
  }, [canLog]);

  const handleQuickRegisterPayment = useCallback(() => {
    if (!canLog) {
      setActiveTab(DETAIL_TAB_VALUES.gestiones);
      setGestionesFocusReturnToken(Date.now());
      return;
    }

    const token = Date.now();
    setActiveTab(DETAIL_TAB_VALUES.gestiones);
    setGestionesQuickAction({ mode: 'pago', token });
  }, [canLog]);

  const handleQuickCall = useCallback(() => {
    const phone = normalizePhoneForAction(primaryContactPhone);

    if (!phone || typeof window === 'undefined') {
      notify('No hay un telefono disponible para llamar.', { severity: 'warning' });
      return;
    }

    setActiveTab(DETAIL_TAB_VALUES.gestiones);
    setGestionesFocusReturnToken(Date.now());
    window.open(`tel:${phone}`, '_self');
  }, [notify, primaryContactPhone]);

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

  const handleQuickWhatsapp = useCallback(() => {
    const phone = normalizePhoneForAction(primaryContactPhone);

    if (!phone || typeof window === 'undefined') {
      notify('No hay un telefono disponible para WhatsApp.', { severity: 'warning' });
      return;
    }

    setActiveTab(DETAIL_TAB_VALUES.gestiones);
    setGestionesFocusReturnToken(Date.now());
    window.open(`https://wa.me/${phone}`, '_blank', 'noopener,noreferrer');
  }, [notify, primaryContactPhone]);

  useEffect(() => {
    if (typeof window === 'undefined' || !canRead) {
      return undefined;
    }

    const handleKeydown = (event) => {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      const key = String(event.key || '').toLowerCase();

      if (key === 'g') {
        event.preventDefault();
        handleQuickNewGestion();
        return;
      }

      if (key === 'p') {
        event.preventDefault();
        handleQuickRegisterPayment();
        return;
      }

      if (key === 'w') {
        event.preventDefault();
        handleQuickWhatsapp();
      }
    };

    window.addEventListener('keydown', handleKeydown);

    return () => window.removeEventListener('keydown', handleKeydown);
  }, [canRead, handleQuickNewGestion, handleQuickRegisterPayment, handleQuickWhatsapp]);

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
                          canLog={canLog}
                          canViewGestiones={canViewGestiones}
                          form={form}
                          setForm={setForm}
                          formError={formError}
                          onFormErrorClear={handleClearFormError}
                          resultados={resultados}
                          resultadosLoading={resultadosLoading}
                          requierePromesa={requierePromesa}
                          savingGestion={savingGestion}
                          onSubmit={handleRegisterGestion}
                          gestiones={gestiones}
                          gestionesLoading={gestionesLoading}
                          gestionesError={gestionesError}
                          onGestionesErrorClear={handleClearGestionesError}
                          gestionesHasNext={gestionesHasNext}
                          onLoadMore={handleLoadMoreGestiones}
                          onQuickWhatsapp={primaryContactPhone ? handleQuickWhatsapp : undefined}
                          quickActionRequest={gestionesQuickAction}
                          focusReturnToken={gestionesFocusReturnToken}
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

          <ClientQuickActions
            onCall={handleQuickCall}
            onWhatsapp={handleQuickWhatsapp}
            onNewGestion={handleQuickNewGestion}
            onRegisterPayment={handleQuickRegisterPayment}
            hasPhone={Boolean(primaryContactPhone)}
          />
        </Box>
      </PageContent>
    </Page>
  );
}
