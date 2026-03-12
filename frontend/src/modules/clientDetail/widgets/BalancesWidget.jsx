import { Paper, Stack, Typography } from '@mui/material';
import { memo } from 'react';
import BaseTable from '../../../components/BaseTable.jsx';
import EmptyState from '../../../components/EmptyState.jsx';

const numberFormatter = new Intl.NumberFormat('es-MX');
const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN'
});

const formatBalanceValue = (balance, field) => {
  if (!balance || balance.valor === undefined || balance.valor === null) {
    return '-';
  }

  const numeric = Number(balance.valor);
  if (!Number.isNaN(numeric)) {
    const tipoDato = field?.tipo_dato || balance?.campo_saldo?.tipo_dato;
    if (tipoDato === 'currency') {
      return currencyFormatter.format(numeric);
    }

    return numberFormatter.format(numeric);
  }

  return String(balance.valor);
};

const normalizeCredits = (credits) => (Array.isArray(credits) ? credits : []);

const getBalanceMap = (balancesByCredit, creditId) => {
  if (balancesByCredit instanceof Map) {
    return balancesByCredit.get(creditId) || new Map();
  }

  if (balancesByCredit && typeof balancesByCredit === 'object') {
    return balancesByCredit[creditId] || new Map();
  }

  return new Map();
};

function BalancesWidget({
  title = 'Saldos',
  credits = [],
  balanceColumns = [],
  balancesByCredit = new Map(),
  loading = false
}) {
  const safeCredits = normalizeCredits(credits);
  const safeBalanceColumns = Array.isArray(balanceColumns) ? balanceColumns : [];

  const hasBalanceData = safeBalanceColumns.length > 0 && safeCredits.length > 0;

  return (
    <Paper variant="panel-sm">
      <Stack spacing={2}>
        <Typography variant="subtitle1">{title}</Typography>

        {!hasBalanceData ? (
          <EmptyState
            title="Sin saldos"
            description="No hay columnas de saldos configuradas para este cliente."
            icon={null}
            dense
          />
        ) : (
          <BaseTable
            dense
            columns={[
              {
                id: 'numero_credito',
                label: 'Credito',
                render: (row) => row.numero_credito || '-'
              },
              ...safeBalanceColumns.map((column) => ({
                id: `saldo_${column.id}`,
                label: column.label,
                align: 'right',
                render: (row) => {
                  const balance = getBalanceMap(balancesByCredit, row.id)?.get(column.id);
                  return formatBalanceValue(balance, column);
                }
              }))
            ]}
            rows={safeCredits}
            loading={loading}
          />
        )}
      </Stack>
    </Paper>
  );
}

const MemoizedBalancesWidget = memo(BalancesWidget);
MemoizedBalancesWidget.displayName = 'BalancesWidget';

export default MemoizedBalancesWidget;
