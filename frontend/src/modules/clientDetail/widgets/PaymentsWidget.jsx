import { Box, Paper, Stack, Typography } from '@mui/material';
import { memo, useMemo } from 'react';
import BaseTable from '../../../components/BaseTable.jsx';
import EmptyState from '../../../components/EmptyState.jsx';

const dateFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' });
const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN'
});

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return dateFormatter.format(date);
};

const formatAmount = (value) => {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return String(value);
  }

  return currencyFormatter.format(numeric);
};

const normalizePayments = (payments) => (Array.isArray(payments) ? payments : []);

const resolvePaymentDate = (payment) =>
  payment?.fecha || payment?.fecha_pago || payment?.aplicado_en || payment?.created_at || null;

const resolvePaymentAmount = (payment) =>
  payment?.monto ?? payment?.importe ?? payment?.monto_pago ?? payment?.monto_detalle ?? null;

const resolvePaymentMethod = (payment) =>
  payment?.medio_pago ||
  payment?.metodo_pago ||
  payment?.forma_pago ||
  payment?.canal_pago ||
  payment?.medio ||
  '-';

const resolvePaymentReference = (payment) =>
  payment?.referencia || payment?.referencia_externa || payment?.folio || payment?.id_externo || '-';

const resolveAppliedCredit = (payment, creditsById) => {
  const directValue =
    payment?.numero_credito ||
    payment?.credito_numero ||
    payment?.credito?.numero_credito ||
    payment?.credit?.numero_credito;

  if (directValue) {
    return directValue;
  }

  const creditId =
    payment?.credito_id || payment?.credit_id || payment?.credito?.id || payment?.credit?.id;

  if (!creditId) {
    return '-';
  }

  return creditsById.get(String(creditId)) || `Crédito ${creditId}`;
};

function PaymentsWidget({
  title = 'Pagos',
  payments = [],
  credits = [],
  remainingBalance = null,
  loading = false,
  emptyTitle = 'Sin pagos',
  emptyDescription = 'No hay pagos registrados para este cliente.'
}) {
  const safePayments = normalizePayments(payments);
  const creditsById = useMemo(
    () =>
      new Map(
        (Array.isArray(credits) ? credits : []).map((credit) => [
          String(credit.id),
          credit.numero_credito || `Crédito ${credit.id}`
        ])
      ),
    [credits]
  );
  const totalPaid = useMemo(
    () =>
      safePayments.reduce((sum, payment) => {
        const amount = Number(resolvePaymentAmount(payment));
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0),
    [safePayments]
  );
  const lastPaymentDate = useMemo(() => {
    const latest = safePayments
      .map((payment) => {
        const value = resolvePaymentDate(payment);
        if (!value) {
          return null;
        }

        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
      })
      .filter(Boolean)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return latest || null;
  }, [safePayments]);

  return (
    <Paper variant="panel-sm">
      <Stack spacing={2}>
        <Stack className="crm-surface-card__header">
          <Stack className="crm-surface-card__header-main">
            <Typography variant="overline" className="crm-surface-card__eyebrow">
              Cobranza
            </Typography>
            <Typography variant="subtitle1" className="crm-surface-card__title">
              {title}
            </Typography>
            <Typography variant="body2" className="crm-surface-card__subtitle">
              {safePayments.length > 0
                ? `${safePayments.length} pago${safePayments.length === 1 ? '' : 's'} registrado${safePayments.length === 1 ? '' : 's'} para este cliente.`
                : 'No hay pagos aplicados para este cliente.'}
            </Typography>
          </Stack>
        </Stack>

        <Box className="crm-surface-card__stat-grid">
          <Box className="crm-surface-card__stat">
            <Typography variant="caption" className="crm-surface-card__stat-label">
              Total pagado
            </Typography>
            <Typography variant="body2" className="crm-surface-card__stat-value">
              {formatAmount(totalPaid)}
            </Typography>
            <Typography variant="caption" className="crm-surface-card__stat-support">
              Acumulado registrado en el expediente.
            </Typography>
          </Box>

          <Box className="crm-surface-card__stat">
            <Typography variant="caption" className="crm-surface-card__stat-label">
              Último pago
            </Typography>
            <Typography variant="body2" className="crm-surface-card__stat-value">
              {formatDate(lastPaymentDate)}
            </Typography>
            <Typography variant="caption" className="crm-surface-card__stat-support">
              Fecha más reciente aplicada al cliente.
            </Typography>
          </Box>

          <Box className="crm-surface-card__stat">
            <Typography variant="caption" className="crm-surface-card__stat-label">
              Saldo restante
            </Typography>
            <Typography variant="body2" className="crm-surface-card__stat-value">
              {formatAmount(remainingBalance)}
            </Typography>
            <Typography variant="caption" className="crm-surface-card__stat-support">
              Exposición pendiente estimada en cartera actual.
            </Typography>
          </Box>
        </Box>

        {safePayments.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} icon={null} dense />
        ) : (
          <BaseTable
            dense
            columns={[
              {
                id: 'fecha',
                label: 'Fecha',
                render: (row) => formatDate(resolvePaymentDate(row))
              },
              {
                id: 'monto',
                label: 'Monto',
                align: 'right',
                render: (row) => formatAmount(resolvePaymentAmount(row))
              },
              {
                id: 'medio_pago',
                label: 'Medio de pago',
                render: (row) => resolvePaymentMethod(row)
              },
              {
                id: 'referencia',
                label: 'Referencia',
                render: (row) => resolvePaymentReference(row)
              },
              {
                id: 'credito_aplicado',
                label: 'Aplicado a crédito',
                render: (row) => resolveAppliedCredit(row, creditsById)
              }
            ]}
            rows={safePayments}
            loading={loading}
          />
        )}
      </Stack>
    </Paper>
  );
}

const MemoizedPaymentsWidget = memo(PaymentsWidget);
MemoizedPaymentsWidget.displayName = 'PaymentsWidget';

export default MemoizedPaymentsWidget;
