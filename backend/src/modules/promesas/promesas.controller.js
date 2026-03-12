import { createPromesa, getPromesaByGestion, listPromesas, updatePromesaEstado } from './promesas.repository.js';
import pool from '../../config/db.js';

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const validEstados = ['pendiente', 'cumplida', 'incumplida'];

const ensureGestionRelacion = async ({ gestionId, creditoId }) => {
  const gestionResult = await pool.query(
    'SELECT id, credito_id FROM gestiones WHERE id = $1',
    [gestionId]
  );
  const gestion = gestionResult.rows[0];
  if (!gestion) {
    throw new Error('Gestion no encontrada.');
  }

  if (creditoId && gestion.credito_id && gestion.credito_id !== creditoId) {
    throw new Error('El credito no coincide con la gestion.');
  }

  return gestion;
};

export const createPromesaHandler = async (req, res, next) => {
  try {
    const { gestion_id, credito_id, monto, fecha_promesa, estado } = req.body || {};

    const gestionId = parseInteger(gestion_id);
    const creditoId = credito_id === undefined ? null : parseInteger(credito_id);
    const montoNum = Number.parseFloat(monto);
    const fechaPromesa = parseDate(fecha_promesa);
    const estadoVal = estado ? String(estado).toLowerCase() : 'pendiente';

    if (!gestionId || Number.isNaN(montoNum) || montoNum <= 0 || !fechaPromesa) {
      return res.status(400).json({ error: 'Datos de promesa incompletos o invalidos.' });
    }

    if (!validEstados.includes(estadoVal)) {
      return res.status(400).json({ error: 'Estado de promesa invalido.' });
    }

    const existing = await getPromesaByGestion(gestionId);
    if (existing) {
      return res.status(409).json({ error: 'La gestion ya tiene una promesa asociada.' });
    }

    await ensureGestionRelacion({ gestionId, creditoId });

    const promesa = await createPromesa({
      gestionId,
      creditoId,
      monto: montoNum,
      fechaPromesa,
      estado: estadoVal
    });

    res.status(201).json({ data: promesa });
  } catch (err) {
    next(err);
  }
};

export const listPromesasHandler = async (req, res, next) => {
  try {
    const { estado, credito_id, fecha_desde, fecha_hasta, limit, offset } = req.query || {};
    const estadoVal = estado ? String(estado).toLowerCase() : undefined;
    if (estadoVal && !validEstados.includes(estadoVal)) {
      return res.status(400).json({ error: 'Estado de promesa invalido.' });
    }

    const data = await listPromesas({
      estado: estadoVal,
      creditoId: credito_id ? parseInteger(credito_id) : undefined,
      fechaDesde: parseDate(fecha_desde),
      fechaHasta: parseDate(fecha_hasta),
      limit: parseInteger(limit) || 20,
      offset: parseInteger(offset) || 0
    });

    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
};

export const updatePromesaEstadoHandler = async (req, res, next) => {
  try {
    const gestionId = parseInteger(req.params.gestionId);
    const { estado } = req.body || {};
    const estadoVal = estado ? String(estado).toLowerCase() : null;

    if (!gestionId || !estadoVal || !validEstados.includes(estadoVal)) {
      return res.status(400).json({ error: 'Datos invalidos.' });
    }

    const promesa = await updatePromesaEstado({ gestionId, estado: estadoVal });
    if (!promesa) {
      return res.status(404).json({ error: 'Promesa no encontrada.' });
    }

    res.status(200).json({ data: promesa });
  } catch (err) {
    next(err);
  }
};
