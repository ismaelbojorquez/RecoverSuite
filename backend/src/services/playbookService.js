import mongoose from 'mongoose';
import { connectMongo } from '../config/mongo.js';
import ContactHistory from '../models/ContactHistory.js';

const PLAYBOOK_LOOKBACK_DAYS = 14;
const PLAYBOOK_HISTORY_QUERY_LIMIT = 64;

export const PLAYBOOK_BASE = Object.freeze([
  { paso: 1, dia: 1, canal: 'WHATSAPP', accion: 'CONTACTAR', descripcion: 'Día 1: WhatsApp' },
  { paso: 2, dia: 2, canal: 'SMS', accion: 'CONTACTAR', descripcion: 'Día 2: SMS' },
  { paso: 3, dia: 3, canal: 'LLAMADA', accion: 'CONTACTAR', descripcion: 'Día 3: Llamada' },
  { paso: 4, dia: 5, canal: 'EMAIL', accion: 'CONTACTAR', descripcion: 'Día 5: Email' },
  { paso: 5, dia: 7, canal: 'LLAMADA', accion: 'CONTACTAR', descripcion: 'Día 7: Llamada' },
  {
    paso: 6,
    dia: 10,
    canal: 'VISITA',
    accion: 'EVALUAR_VISITA',
    descripcion: 'Día 10: Evaluar visita'
  }
]);

const normalizeText = (value) => String(value || '').trim().toUpperCase();

const toObjectIdOrThrow = (value, label) => {
  if (!mongoose.isValidObjectId(value)) {
    throw new Error(`${label} es invalido.`);
  }

  return new mongoose.Types.ObjectId(value);
};

const startOfUtcDay = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const diffCalendarDays = (from, to) => {
  const fromDate = startOfUtcDay(from);
  const toDate = startOfUtcDay(to);
  return Math.floor((toDate.getTime() - fromDate.getTime()) / 86400000);
};

const buildDateDaysAgo = (value, days) => {
  const date = value instanceof Date ? new Date(value) : new Date(value || Date.now());
  date.setDate(date.getDate() - days);
  return date;
};

const sortHistoryAscending = (rows = []) =>
  [...(Array.isArray(rows) ? rows : [])].sort((left, right) => {
    const leftTime = new Date(left?.fecha || 0).getTime();
    const rightTime = new Date(right?.fecha || 0).getTime();
    return leftTime - rightTime;
  });

export const resolverSiguientePasoPlaybook = ({
  contactHistory = [],
  now = new Date()
} = {}) => {
  const lookbackSince = buildDateDaysAgo(now, PLAYBOOK_LOOKBACK_DAYS);
  const orderedHistory = sortHistoryAscending(contactHistory).filter((row) => {
    const rowDate = new Date(row?.fecha || 0);
    return !Number.isNaN(rowDate.getTime()) && rowDate >= lookbackSince;
  });
  const historyStart = orderedHistory[0]?.fecha ? startOfUtcDay(orderedHistory[0].fecha) : startOfUtcDay(now);
  const diasTranscurridos = diffCalendarDays(historyStart, now) + 1;

  let currentStepIndex = 0;
  for (const row of orderedHistory) {
    if (currentStepIndex >= PLAYBOOK_BASE.length) {
      break;
    }

    const currentStep = PLAYBOOK_BASE[currentStepIndex];
    const dayOffset = diffCalendarDays(historyStart, row.fecha) + 1;
    if (dayOffset >= currentStep.dia && normalizeText(row?.canal) === currentStep.canal) {
      currentStepIndex += 1;
    }
  }

  const nextStep = PLAYBOOK_BASE[currentStepIndex] || null;
  if (!nextStep) {
    return {
      paso: null,
      dia: null,
      accion: 'DETENER',
      canal: null,
      descripcion: 'Playbook completado',
      razon: 'Secuencia base completada',
      due: false,
      diasTranscurridos
    };
  }

  return {
    ...nextStep,
    razon: `Playbook base día ${nextStep.dia}`,
    due: diasTranscurridos >= nextStep.dia,
    diasTranscurridos
  };
};

export const obtenerSiguientePaso = async (clienteId, options = {}) => {
  const clientObjectId = toObjectIdOrThrow(clienteId, 'clienteId');
  await connectMongo();
  const referenceDate = options.now || new Date();
  const lookbackSince = buildDateDaysAgo(referenceDate, PLAYBOOK_LOOKBACK_DAYS);

  const contactHistory = await ContactHistory.find({
    clienteId: clientObjectId,
    fecha: { $gte: lookbackSince }
  })
    .select({
      canal: 1,
      fecha: 1
    })
    .sort({ fecha: 1, _id: 1 })
    .limit(PLAYBOOK_HISTORY_QUERY_LIMIT)
    .lean();

  return resolverSiguientePasoPlaybook({
    contactHistory,
    now: referenceDate
  });
};

export default {
  PLAYBOOK_BASE,
  resolverSiguientePasoPlaybook,
  obtenerSiguientePaso
};
