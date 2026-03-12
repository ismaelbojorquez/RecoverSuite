import { createHttpError } from '../../utils/http-error.js';
import { getPortfolioById } from '../portfolios/portfolios.repository.js';
import { listSaldoFieldsByPortfolio } from '../saldo-fields/saldo-fields.repository.js';
import { listBalanceFieldsByPortfolio } from '../balance-fields/balance-fields.repository.js';
import { logWarn } from '../../utils/structured-logger.js';

const normalizeType = (fieldType) => {
  const normalized = (fieldType || '').toLowerCase();
  if (['number', 'currency'].includes(normalized)) return 'number';
  if (['date', 'time', 'datetime'].includes(normalized)) return 'date';
  if (normalized === 'boolean') return 'boolean';
  return 'string';
};

const baseCoreTargets = {
  client: [
    {
      key: 'client.numero_cliente',
      label: 'Cliente - Número de cliente',
      path: 'client.numero_cliente',
      type: 'string',
      required: true,
      rules: ['Obligatorio en layout', 'No usar id interno']
    },
    {
      key: 'client.nombre_completo',
      label: 'Cliente - Nombre completo',
      path: 'client.nombre_completo',
      type: 'string',
      required: false,
      rules: ['Obligatorio para clientes nuevos']
    },
    {
      key: 'client.rfc',
      label: 'Cliente - RFC',
      path: 'client.rfc',
      type: 'string',
      required: false
    },
    {
      key: 'client.curp',
      label: 'Cliente - CURP',
      path: 'client.curp',
      type: 'string',
      required: false
    }
  ],
  credit: [
    {
      key: 'credit.portafolio_id',
      label: 'Crédito - Portafolio ID',
      path: 'credit.portafolio_id',
      type: 'number',
      required: true,
      rules: ['Debe coincidir con el portfolioId de la sesión']
    },
    {
      key: 'credit.numero_credito',
      label: 'Crédito - Número de crédito',
      path: 'credit.numero_credito',
      type: 'string',
      required: true,
      rules: ['Único por portafolio (numero_credito + portafolio_id)']
    },
    {
      key: 'credit.producto',
      label: 'Crédito - Producto',
      path: 'credit.producto',
      type: 'string',
      required: false
    },
    {
      key: 'credit.cliente_id',
      label: 'Crédito - Cliente ID',
      path: 'credit.cliente_id',
      type: 'string',
      required: false,
      rules: ['UUID de cliente existente (opcional si se crea cliente)']
    }
  ],
  contacts: [
    {
      key: 'contact.phone',
      label: 'Contacto - Teléfono',
      path: 'client.phones[].telefono',
      type: 'string',
      required: false,
      rules: ['Único por cliente']
    },
    {
      key: 'contact.email',
      label: 'Contacto - Email',
      path: 'client.emails[].email',
      type: 'string',
      required: false,
      rules: ['Único por cliente']
    }
  ],
  addresses: [
    {
      key: 'address.linea1',
      label: 'Dirección - Línea 1',
      path: 'client.addresses[].linea1',
      type: 'string',
      required: false
    },
    {
      key: 'address.linea2',
      label: 'Dirección - Línea 2',
      path: 'client.addresses[].linea2',
      type: 'string',
      required: false
    },
    {
      key: 'address.ciudad',
      label: 'Dirección - Ciudad',
      path: 'client.addresses[].ciudad',
      type: 'string',
      required: false
    },
    {
      key: 'address.estado',
      label: 'Dirección - Estado',
      path: 'client.addresses[].estado',
      type: 'string',
      required: false
    },
    {
      key: 'address.codigo_postal',
      label: 'Dirección - Código postal',
      path: 'client.addresses[].codigo_postal',
      type: 'string',
      required: false
    },
    {
      key: 'address.pais',
      label: 'Dirección - País',
      path: 'client.addresses[].pais',
      type: 'string',
      required: false
    }
  ],
  ignore: {
    key: 'ignore',
    label: 'Ignorar columna',
    path: null,
    type: 'ignore',
    required: false
  }
};

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const getImportTargetsService = async ({ portfolioId }) => {
  const resolvedPortfolioId = parseInteger(portfolioId);
  if (!resolvedPortfolioId || resolvedPortfolioId <= 0) {
    throw createHttpError(400, 'portfolioId es requerido');
  }

  const portfolio = await getPortfolioById(resolvedPortfolioId);
  if (!portfolio) {
    throw createHttpError(404, 'Portafolio no encontrado');
  }

  let saldoFields = [];
  try {
    saldoFields = await listSaldoFieldsByPortfolio({ portfolioId: resolvedPortfolioId });
  } catch (err) {
    // Gracefully degrade when optional saldo_fields table is missing (or other non-critical errors)
    logWarn('bulk_imports.targets.saldo_fields_unavailable', {
      portfolioId: resolvedPortfolioId,
      error: err?.message,
      code: err?.code
    });
    saldoFields = [];
  }
  const dynamicSaldoFields = (saldoFields || []).filter(
    (field) => field.value_type === 'dynamic'
  );

  const saldoTargets = dynamicSaldoFields.map((field) => ({
    key: `saldo.dynamic.${field.id}`,
    saldoFieldId: field.id,
    label: field.label,
    type: normalizeType(field.field_type),
    required: !!field.required,
    path: `credit.saldo_fields.${field.key}`,
    valueType: field.value_type
  }));

  let balanceFields = [];
  try {
    balanceFields = await listBalanceFieldsByPortfolio({
      portafolioId: resolvedPortfolioId
    });
  } catch (err) {
    logWarn('bulk_imports.targets.balance_fields_unavailable', {
      portfolioId: resolvedPortfolioId,
      error: err?.message,
      code: err?.code
    });
    balanceFields = [];
  }

  const balanceTargets = (balanceFields || []).map((field, index) => ({
    key: `balance.${field.id}`,
    balanceFieldId: field.id,
    label: field.etiqueta_visual,
    type: normalizeType(field.tipo_dato),
    required: false,
    path: `credit.balance_fields.${field.nombre_campo}`,
    isPrincipal: !!field.es_principal,
    order: field.orden ?? index
  }));

  const primaryBalanceIndex = balanceTargets.findIndex((t) => t.isPrincipal);

  return {
    portfolioId: resolvedPortfolioId,
    core: baseCoreTargets,
    dynamicSaldo: {
      saldoFields: saldoTargets,
      balanceFields: balanceTargets,
      primaryBalanceIndex: primaryBalanceIndex >= 0 ? primaryBalanceIndex : null
    },
    ignore: baseCoreTargets.ignore
  };
};
