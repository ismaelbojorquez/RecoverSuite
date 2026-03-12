import { createHttpError } from '../../utils/http-error.js';
import {
  createSaldoField,
  deleteSaldoField,
  getSaldoFieldById,
  getSaldoFieldByKey,
  isSaldoFieldInUse,
  listSaldoFieldsByPortfolio,
  updateSaldoField
} from './saldo-fields.repository.js';
import { invalidateClientDetailCache } from '../../utils/cache.js';
import { Parser } from 'expr-eval';

const allowedFieldTypes = new Set([
  'text',
  'number',
  'currency',
  'date',
  'time',
  'datetime',
  'boolean'
]);

const allowedValueTypes = new Set(['dynamic', 'calculated']);
const exprParser = new Parser({
  operators: {
    logical: true,
    comparison: true,
    additive: true,
    multiplicative: true,
    power: true,
    factorial: false
  }
});

const ensurePositiveId = (id, label) => {
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, `Invalid ${label} id`);
  }
};

const normalizeKey = (value) => {
  if (value === undefined || value === null) {
    throw createHttpError(400, 'key es requerido');
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    throw createHttpError(400, 'key es requerido');
  }
  if (/\s/.test(trimmed)) {
    throw createHttpError(400, 'key no debe contener espacios');
  }
  return trimmed;
};

const normalizeLabel = (value) => {
  if (value === undefined || value === null) {
    throw createHttpError(400, 'label es requerido');
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    throw createHttpError(400, 'label es requerido');
  }
  return trimmed;
};

const normalizeValueType = (value) => {
  if (value === undefined || value === null) {
    throw createHttpError(400, 'value_type es requerido');
  }
  const normalized = String(value).trim().toLowerCase();
  if (!allowedValueTypes.has(normalized)) {
    throw createHttpError(400, 'value_type invalido');
  }
  return normalized;
};

const normalizeFieldType = (value) => {
  if (value === undefined || value === null) {
    return 'text';
  }
  const normalized = String(value).trim().toLowerCase();
  if (!allowedFieldTypes.has(normalized)) {
    throw createHttpError(400, 'field_type invalido');
  }
  return normalized;
};

const normalizeBoolean = (value, defaultValue) => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return Boolean(value);
};

const normalizeOrderIndex = (value) => {
  if (value === undefined || value === null) {
    return 0;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    throw createHttpError(400, 'order_index invalido');
  }
  return parsed;
};

const normalizeCalcExpression = (calcExpression) => {
  if (calcExpression === undefined) {
    return undefined;
  }
  if (calcExpression === null) {
    return null;
  }
  const trimmed = String(calcExpression).trim();
  if (!trimmed) {
    throw createHttpError(400, 'calc_expression no puede ser vacio');
  }
  return trimmed;
};

const extractDependencies = (expression = '') => {
  const deps = new Set();
  const regex = /\{([^}]+)\}/g;
  let match;
  while ((match = regex.exec(expression)) !== null) {
    const refKey = match[1].trim();
    if (refKey) deps.add(refKey);
  }
  return deps;
};

const buildGraph = (calcFields) => {
  const graph = new Map();
  calcFields.forEach((field) => {
    const expr = field.calc_expression || '';
    graph.set(field.key, extractDependencies(expr));
  });
  return graph;
};

const detectCycle = (graph) => {
  const visited = new Set();
  const stack = new Set();

  const visit = (node) => {
    if (stack.has(node)) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    stack.add(node);
    const deps = graph.get(node) || new Set();
    for (const dep of deps) {
      if (graph.has(dep) && visit(dep)) return true;
    }
    stack.delete(node);
    return false;
  };

  for (const node of graph.keys()) {
    if (visit(node)) return true;
  }
  return false;
};

const validateCalculatedField = ({ field, fields }) => {
  if ((field.value_type || '').toLowerCase() !== 'calculated') {
    return;
  }

  const deps = extractDependencies(field.calc_expression || '');
  const keys = new Set(fields.map((f) => f.key));
  const missing = Array.from(deps).filter((dep) => !keys.has(dep));
  if (missing.length) {
    throw createHttpError(
      400,
      `Referencias inexistentes en calc_expression: ${missing.join(', ')}`
    );
  }

  // Syntax validation (replace {key} with safe vars)
  let exprText = field.calc_expression || '';
  let idx = 0;
  deps.forEach((dep) => {
    const safeVar = `v${idx}`;
    const re = new RegExp(`\\{${dep.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\}`, 'g');
    exprText = exprText.replace(re, safeVar);
    idx += 1;
  });

  try {
    exprParser.parse(exprText);
  } catch (err) {
    throw createHttpError(400, `Expresión inválida: ${err.message}`);
  }

  // Cycle detection including this field
  const calcFields = fields.filter(
    (f) => (f.value_type || '').toLowerCase() === 'calculated'
  );
  const graph = buildGraph(calcFields);
  if (detectCycle(graph)) {
    throw createHttpError(400, 'Dependencias circulares en campos calculados');
  }
};

const invalidateCaches = async (portfolioId) => {
  await invalidateClientDetailCache({ portafolioId: portfolioId });
};

export const listSaldoFieldsService = async ({ portfolioId }) => {
  ensurePositiveId(portfolioId, 'portfolio');
  return listSaldoFieldsByPortfolio({ portfolioId });
};

export const createSaldoFieldService = async ({
  portfolioId,
  key,
  label,
  fieldType,
  valueType,
  required,
  visible,
  orderIndex,
  calcExpression
}) => {
  ensurePositiveId(portfolioId, 'portfolio');

  const normalizedKey = normalizeKey(key);
  const normalizedLabel = normalizeLabel(label);
  const normalizedFieldType = normalizeFieldType(fieldType);
  const normalizedValueType = normalizeValueType(valueType);
  const normalizedRequired = normalizeBoolean(required, false);
  const normalizedVisible = normalizeBoolean(visible, true);
  const normalizedOrderIndex = normalizeOrderIndex(orderIndex);
  const normalizedCalcExpression = normalizeCalcExpression(calcExpression);

  if (normalizedValueType === 'calculated' && normalizedCalcExpression === undefined) {
    throw createHttpError(400, 'calc_expression es requerido para campos calculados');
  }

  const existing = await getSaldoFieldByKey({ portfolioId, key: normalizedKey });
  if (existing) {
    throw createHttpError(409, 'key ya existe para este portafolio');
  }

  const allFields = await listSaldoFieldsByPortfolio({ portfolioId });
  const futureField = {
    id: -1,
    portfolio_id: portfolioId,
    key: normalizedKey,
    label: normalizedLabel,
    field_type: normalizedFieldType,
    value_type: normalizedValueType,
    required: normalizedRequired,
    visible: normalizedVisible,
    order_index: normalizedOrderIndex,
    calc_expression: normalizedCalcExpression
  };

  validateCalculatedField({
    field: futureField,
    fields: [...allFields, futureField]
  });

  const created = await createSaldoField({
    portfolioId,
    key: normalizedKey,
    label: normalizedLabel,
    fieldType: normalizedFieldType,
    valueType: normalizedValueType,
    required: normalizedRequired,
    visible: normalizedVisible,
    orderIndex: normalizedOrderIndex,
    calcExpression: normalizedCalcExpression
  });

  await invalidateCaches(portfolioId);

  return created;
};

export const updateSaldoFieldService = async ({
  fieldId,
  key,
  label,
  fieldType,
  valueType,
  required,
  visible,
  orderIndex,
  calcExpression
}) => {
  ensurePositiveId(fieldId, 'field');

  const current = await getSaldoFieldById({ fieldId });
  if (!current) {
    throw createHttpError(404, 'Campo de saldo no encontrado');
  }

  const payload = {};

  if (key !== undefined) {
    const normalizedKey = normalizeKey(key);
    const existing = await getSaldoFieldByKey({
      portfolioId: current.portfolio_id,
      key: normalizedKey
    });
    if (existing && existing.id !== fieldId) {
      throw createHttpError(409, 'key ya existe para este portafolio');
    }
    payload.key = normalizedKey;
  }

  if (label !== undefined) {
    payload.label = normalizeLabel(label);
  }

  if (fieldType !== undefined) {
    payload.fieldType = normalizeFieldType(fieldType);
  }

  if (valueType !== undefined) {
    const normalizedValueType = normalizeValueType(valueType);
    payload.valueType = normalizedValueType;
    if (normalizedValueType === 'calculated' && calcExpression === undefined) {
      throw createHttpError(400, 'calc_expression es requerido para campos calculados');
    }
  }

  if (required !== undefined) {
    payload.required = normalizeBoolean(required, current.required);
  }

  if (visible !== undefined) {
    payload.visible = normalizeBoolean(visible, current.visible);
  }

  if (orderIndex !== undefined) {
    payload.orderIndex = normalizeOrderIndex(orderIndex);
  }

  if (calcExpression !== undefined) {
    payload.calcExpression = normalizeCalcExpression(calcExpression);
  }

  if (Object.keys(payload).length === 0) {
    throw createHttpError(400, 'No hay cambios para aplicar');
  }

  const allFields = await listSaldoFieldsByPortfolio({ portfolioId: current.portfolio_id });
  const futureFields = allFields.map((f) =>
    f.id === fieldId
      ? {
          ...f,
          key: payload.key ?? f.key,
          label: payload.label ?? f.label,
          field_type: payload.fieldType ?? f.field_type,
          value_type: payload.valueType ?? f.value_type,
          required: payload.required ?? f.required,
          visible: payload.visible ?? f.visible,
          order_index: payload.orderIndex ?? f.order_index,
          calc_expression: payload.calcExpression ?? f.calc_expression
        }
      : f
  );

  const updatedField = futureFields.find((f) => f.id === fieldId);
  validateCalculatedField({
    field: updatedField,
    fields: futureFields
  });

  const updated = await updateSaldoField({ fieldId, ...payload });
  if (!updated) {
    throw createHttpError(404, 'Campo de saldo no encontrado');
  }

  await invalidateCaches(current.portfolio_id);

  return updated;
};

export const deleteSaldoFieldService = async ({ fieldId }) => {
  ensurePositiveId(fieldId, 'field');

  const current = await getSaldoFieldById({ fieldId });
  if (!current) {
    throw createHttpError(404, 'Campo de saldo no encontrado');
  }

  const inUse = await isSaldoFieldInUse({ fieldId });
  if (inUse) {
    throw createHttpError(409, 'No se puede eliminar: el campo ya tiene saldos asociados');
  }

  const deleted = await deleteSaldoField({ fieldId });
  if (!deleted) {
    throw createHttpError(404, 'Campo de saldo no encontrado');
  }

  await invalidateCaches(current.portfolio_id);

  return true;
};
