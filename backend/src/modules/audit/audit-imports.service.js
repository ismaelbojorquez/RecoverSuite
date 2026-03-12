import { createHttpError } from '../../utils/http-error.js';
import { listBulkImportAudits } from './audit-imports.repository.js';

const ensurePositiveInteger = (value, label) => {
  if (value === null || value === undefined) {
    return;
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw createHttpError(400, `${label} invalido`);
  }
};

const ensureValidDate = (value, label) => {
  if (!value) {
    return;
  }

  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw createHttpError(400, `${label} invalida`);
  }
};

export const listBulkImportAuditsService = async ({
  usuarioId,
  from,
  to,
  limit,
  offset
}) => {
  ensurePositiveInteger(usuarioId, 'usuario_id');
  ensureValidDate(from, 'fecha_inicio');
  ensureValidDate(to, 'fecha_fin');

  if (from && to && from > to) {
    throw createHttpError(400, 'fecha_inicio debe ser menor o igual a fecha_fin');
  }

  return listBulkImportAudits({ usuarioId, from, to, limit, offset });
};
