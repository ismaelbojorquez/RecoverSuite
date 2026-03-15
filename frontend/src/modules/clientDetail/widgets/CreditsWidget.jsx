import { Chip, Stack, Typography } from '@mui/material';
import { memo, useMemo } from 'react';
import BaseTable from '../../../components/BaseTable.jsx';
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
  return balanceMap.get(String(column.id)) || balanceMap.get(column.id) || null;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isSummableColumn = (column) => {
  const tipoDato = String(column?.tipo_dato || '').toLowerCase();
  return column?.es_principal || tipoDato === 'currency' || tipoDato === 'number';
};

const formatNumericValue = (value, column) => {
  const numeric = toNumber(value);
  if (numeric === null) {
    return '-';
  }

  if (column?.es_principal || String(column?.tipo_dato || '').toLowerCase() === 'currency') {
    return currencyFormatter.format(numeric);
  }

  return numberFormatter.format(numeric);
};

const formatBalanceValue = (balance, field) => {
  if (!balance || balance.valor === undefined || balance.valor === null) {
    return '-';
  }

  return formatNumericValue(balance.valor, field);
};

const normalizeStatusTone = (value) => {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (
    normalized.includes('pagad') ||
    normalized.includes('liquidad') ||
    normalized.includes('cerrad')
  ) {
    return { label: value || 'Pagado', color: 'success' };
  }

  if (normalized.includes('legal') || normalized.includes('judicial')) {
    return { label: value || 'Jurídico', color: 'error' };
  }

  if (normalized.includes('negoci') || normalized.includes('convenio')) {
    return { label: value || 'Negociado', color: 'warning' };
  }

  return { label: value || 'Activo', color: 'primary' };
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

  const columns = useMemo(() => {
    const baseColumns = [
      {
        id: 'credito',
        label: 'Crédito',
        minWidth: 220,
        render: (row) => {
          if (row.__footer) {
            return (
              <Stack spacing={0.2}>
                <Typography variant="body2" className="crm-text-strong">
                  Totales
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {row.creditCount} crédito{row.creditCount === 1 ? '' : 's'}
                </Typography>
              </Stack>
            );
          }

          return (
            <Stack spacing={0.15}>
              <Typography variant="body2" className="crm-text-strong">
                {row.numero_credito || `Crédito ${row.id}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {row.numero_credito_externo ? `Ref. ${row.numero_credito_externo}` : 'Sin referencia'}
              </Typography>
            </Stack>
          );
        }
      },
      {
        id: 'producto',
        label: 'Producto',
        minWidth: 150,
        render: (row) => (row.__footer ? '-' : row.producto || '-')
      },
      {
        id: 'estado',
        label: 'Estado',
        minWidth: 130,
        render: (row) => {
          if (row.__footer) {
            return '-';
          }

          const tone = normalizeStatusTone(row.estado || row.status);
          return (
            <Chip
              size="small"
              color={tone.color}
              variant="outlined"
              label={tone.label}
            />
          );
        }
      },
      {
        id: 'creado',
        label: 'Creado',
        minWidth: 132,
        render: (row) => (row.__footer ? '-' : formatDate(row.created_at))
      }
    ];

    const balanceDrivenColumns = safeBalanceColumns.map((column) => ({
      id: String(column.id),
      label: column.label,
      minWidth: 150,
      align: isSummableColumn(column) ? 'right' : 'left',
      render: (row) => {
        if (row.__footer) {
          if (!isSummableColumn(column)) {
            return '-';
          }

          return formatNumericValue(row.totals?.[String(column.id)], column);
        }

        const balance = resolveBalanceValue(balancesByCredit, row.id, column);
        return formatBalanceValue(balance, column);
      }
    }));

    return [...baseColumns, ...balanceDrivenColumns];
  }, [balancesByCredit, safeBalanceColumns]);

  const footerRows = useMemo(() => {
    if (safeCredits.length <= 1 || safeBalanceColumns.length === 0) {
      return [];
    }

    const totals = safeBalanceColumns.reduce((accumulator, column) => {
      if (!isSummableColumn(column)) {
        return accumulator;
      }

      const total = safeCredits.reduce((sum, credit) => {
        const balance = resolveBalanceValue(balancesByCredit, credit.id, column);
        return sum + (toNumber(balance?.valor) ?? 0);
      }, 0);

      return {
        ...accumulator,
        [String(column.id)]: total
      };
    }, {});

    return [
      {
        id: 'credits-totals',
        __footer: true,
        creditCount: safeCredits.length,
        totals
      }
    ];
  }, [balancesByCredit, safeBalanceColumns, safeCredits]);

  return (
    <BaseTable
      dense
      stickyHeader
      loading={!isReady && loading}
      columns={columns}
      rows={safeCredits}
      footerRows={footerRows}
      toolbar={
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
                : `${safeCredits.length} crédito${safeCredits.length === 1 ? '' : 's'} con saldos integrados en una sola tabla.`}
            </Typography>
          </Stack>
        </Stack>
      }
      emptyContent={
        <EmptyState title={emptyTitle} description={emptyDescription} icon={null} dense />
      }
    />
  );
}

const MemoizedCreditsWidget = memo(CreditsWidget);
MemoizedCreditsWidget.displayName = 'CreditsWidget';

export default MemoizedCreditsWidget;
