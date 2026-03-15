import { Box, Paper, Stack, Typography } from '@mui/material';
import { memo } from 'react';
import EmptyState from '../../../components/EmptyState.jsx';

const dateFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' });
const numberFormatter = new Intl.NumberFormat('es-MX');
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

const formatBalanceValue = (balance, field) => {
  if (!balance || balance.valor === undefined || balance.valor === null) {
    return '-';
  }

  const numeric = Number(balance.valor);
  if (!Number.isNaN(numeric)) {
    const tipoDato = field?.tipo_dato || balance?.campo_saldo?.tipo_dato;
    if (tipoDato === 'currency' || field?.es_principal) {
      return currencyFormatter.format(numeric);
    }

    return numberFormatter.format(numeric);
  }

  return String(balance.valor);
};

const normalizeCredits = (credits) => (Array.isArray(credits) ? credits : []);

const getBalanceMap = (balancesByCredit, creditId) => {
  const normalizedCreditId = String(creditId);

  if (balancesByCredit instanceof Map) {
    return (
      balancesByCredit.get(normalizedCreditId) ||
      balancesByCredit.get(creditId) ||
      new Map()
    );
  }

  if (balancesByCredit && typeof balancesByCredit === 'object') {
    return balancesByCredit[normalizedCreditId] || balancesByCredit[creditId] || new Map();
  }

  return new Map();
};

const resolveBalanceValue = (balancesByCredit, creditId, column) => {
  const balanceMap = getBalanceMap(balancesByCredit, creditId);
  return (
    balanceMap.get(String(column.id)) ||
    balanceMap.get(column.id) ||
    null
  );
};

function CreditsWidget({
  title = 'Créditos',
  credits = [],
  balanceColumns = [],
  balancesByCredit = new Map(),
  loading = false,
  isReady = true,
  emptyTitle = 'Sin créditos',
  emptyDescription = 'Este cliente no tiene créditos registrados.'
}) {
  const safeCredits = normalizeCredits(credits);
  const safeBalanceColumns = Array.isArray(balanceColumns) ? balanceColumns : [];
  const creditsEmpty = safeCredits.length === 0;

  return (
    <Paper variant="panel-sm">
      <Stack spacing={2}>
        <Stack className="crm-surface-card__header">
          <Stack className="crm-surface-card__header-main">
            <Typography variant="overline" className="crm-surface-card__eyebrow">
              Cartera
            </Typography>
            <Typography variant="subtitle1" className="crm-surface-card__title">
              {title}
            </Typography>
            <Typography variant="body2" className="crm-surface-card__subtitle">
              {creditsEmpty
                ? 'No hay créditos vinculados para mostrar en esta vista.'
                : `${safeCredits.length} crédito${safeCredits.length === 1 ? '' : 's'} con detalle operativo y saldos.`}
            </Typography>
          </Stack>
        </Stack>

        {!isReady && loading ? (
          <Typography variant="body2" color="text.secondary">
            Cargando créditos...
          </Typography>
        ) : creditsEmpty ? (
          <EmptyState title={emptyTitle} description={emptyDescription} icon={null} dense />
        ) : (
          <Stack className="crm-credit-detail__stack">
            {safeCredits.map((credit) => (
              <Paper
                key={credit.id}
                variant="outlined"
                className="crm-credit-detail__item crm-surface-card__list-item"
              >
                <Stack spacing={1.3}>
                  <Stack className="crm-surface-card__header crm-surface-card__header--split">
                    <Stack className="crm-surface-card__header-main">
                      <Typography variant="subtitle1" className="crm-surface-card__title">
                        {credit.numero_credito || `Crédito ${credit.id}`}
                      </Typography>
                      <Typography variant="body2" className="crm-surface-card__subtitle">
                        {credit.producto || 'Sin producto'}{credit.numero_credito_externo
                          ? ` · Ref. ${credit.numero_credito_externo}`
                          : ''}
                      </Typography>
                    </Stack>
                  </Stack>

                  <Box className="crm-surface-card__meta-grid crm-surface-card__meta-grid--wide">
                    <Box className="crm-surface-card__meta-item">
                      <Typography variant="caption" className="crm-surface-card__meta-label">
                        Producto
                      </Typography>
                      <Typography variant="body2" className="crm-surface-card__meta-value">
                        {credit.producto || '-'}
                      </Typography>
                    </Box>
                    <Box className="crm-surface-card__meta-item">
                      <Typography variant="caption" className="crm-surface-card__meta-label">
                        Crédito externo
                      </Typography>
                      <Typography variant="body2" className="crm-surface-card__meta-value">
                        {credit.numero_credito_externo || '-'}
                      </Typography>
                    </Box>
                    <Box className="crm-surface-card__meta-item">
                      <Typography variant="caption" className="crm-surface-card__meta-label">
                        Estado
                      </Typography>
                      <Typography variant="body2" className="crm-surface-card__meta-value">
                        {credit.estado || credit.status || '-'}
                      </Typography>
                    </Box>
                    <Box className="crm-surface-card__meta-item">
                      <Typography variant="caption" className="crm-surface-card__meta-label">
                        Creado
                      </Typography>
                      <Typography variant="body2" className="crm-surface-card__meta-value">
                        {formatDate(credit.created_at)}
                      </Typography>
                    </Box>
                  </Box>

                  <Stack spacing={0.8}>
                    <Typography variant="caption" className="crm-credit-detail__section-label">
                      Campos de saldo
                    </Typography>

                    {safeBalanceColumns.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No hay campos de saldo configurados para este crédito.
                      </Typography>
                    ) : (
                      <Box className="crm-credit-detail__balances-grid">
                        {safeBalanceColumns.map((column) => {
                          const balance = resolveBalanceValue(balancesByCredit, credit.id, column);

                          return (
                            <Box
                              key={`${credit.id}-${column.id}`}
                              className="crm-credit-detail__balance-item"
                            >
                              <Typography variant="caption" className="crm-credit-detail__balance-label">
                                {column.label}
                              </Typography>
                              <Typography variant="body2" className="crm-credit-detail__balance-value">
                                {formatBalanceValue(balance, column)}
                              </Typography>
                              {column.es_principal ? (
                                <Typography
                                  variant="caption"
                                  className="crm-credit-detail__balance-caption"
                                >
                                  Principal
                                </Typography>
                              ) : null}
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

const MemoizedCreditsWidget = memo(CreditsWidget);
MemoizedCreditsWidget.displayName = 'CreditsWidget';

export default MemoizedCreditsWidget;
