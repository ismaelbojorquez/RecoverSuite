import { createHttpError } from '../../utils/http-error.js';
import {
  createSaldoFieldService,
  deleteSaldoFieldService,
  listSaldoFieldsService,
  updateSaldoFieldService
} from './saldo-fields.service.js';

const parseId = (value, label) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(400, `Invalid ${label} id`);
  }
  return parsed;
};

export const listSaldoFieldsHandler = async (req, res, next) => {
  try {
    const portfolioId = parseId(req.params.portfolioId, 'portfolio');
    const fields = await listSaldoFieldsService({ portfolioId });
    res.status(200).json({ data: fields });
  } catch (err) {
    next(err);
  }
};

export const createSaldoFieldHandler = async (req, res, next) => {
  try {
    const portfolioId = parseId(req.params.portfolioId, 'portfolio');
    const {
      key,
      label,
      field_type: fieldType,
      value_type: valueType,
      required,
      visible,
      order_index: orderIndex,
      calc_expression: calcExpression
    } = req.body || {};

    const created = await createSaldoFieldService({
      portfolioId,
      key,
      label,
      fieldType,
      valueType,
      required,
      visible,
      orderIndex,
      calcExpression
    });

    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
};

export const updateSaldoFieldHandler = async (req, res, next) => {
  try {
    const fieldId = parseId(req.params.fieldId, 'field');
    const {
      key,
      label,
      field_type: fieldType,
      value_type: valueType,
      required,
      visible,
      order_index: orderIndex,
      calc_expression: calcExpression
    } = req.body || {};

    const updated = await updateSaldoFieldService({
      fieldId,
      key,
      label,
      fieldType,
      valueType,
      required,
      visible,
      orderIndex,
      calcExpression
    });

    res.status(200).json({ data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteSaldoFieldHandler = async (req, res, next) => {
  try {
    const fieldId = parseId(req.params.fieldId, 'field');
    await deleteSaldoFieldService({ fieldId });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
