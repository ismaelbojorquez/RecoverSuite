import {
  createResultado,
  getResultadoById,
  listResultados,
  updateResultado
} from './resultados.repository.js';

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const createResultadoHandler = async (req, res, next) => {
  try {
    const { portafolio_id, nombre, tipo, requiere_promesa, activo } = req.body || {};
    const portafolioId = parseInteger(portafolio_id);
    const requierePromesa = Boolean(requiere_promesa);
    const isActive = activo === undefined ? true : Boolean(activo);

    if (!portafolioId || !nombre || !tipo) {
      return res.status(400).json({ error: 'Datos de resultado incompletos.' });
    }

    const resultado = await createResultado({
      portafolioId,
      nombre: String(nombre).trim(),
      tipo: String(tipo).trim(),
      requierePromesa,
      activo: isActive
    });

    res.status(201).json({ data: resultado });
  } catch (err) {
    next(err);
  }
};

export const listResultadosHandler = async (req, res, next) => {
  try {
    const { portafolio_id, activo, tipo } = req.query || {};
    const data = await listResultados({
      portafolioId: parseInteger(portafolio_id),
      activo: activo === undefined ? undefined : activo === 'true' || activo === true,
      tipo: tipo ? String(tipo).trim() : undefined
    });

    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
};

export const updateResultadoHandler = async (req, res, next) => {
  try {
    const id = parseInteger(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'ID invalido.' });
    }

    const { nombre, tipo, requiere_promesa, activo } = req.body || {};

    const resultado = await updateResultado(id, {
      nombre: nombre !== undefined ? String(nombre).trim() : undefined,
      tipo: tipo !== undefined ? String(tipo).trim() : undefined,
      requierePromesa:
        requiere_promesa === undefined ? undefined : requiere_promesa === true || requiere_promesa === 'true',
      activo: activo === undefined ? undefined : activo === true || activo === 'true'
    });

    res.status(200).json({ data: resultado });
  } catch (err) {
    next(err);
  }
};

export const getResultadoHandler = async (req, res, next) => {
  try {
    const id = parseInteger(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'ID invalido.' });
    }

    const resultado = await getResultadoById(id);
    if (!resultado) {
      return res.status(404).json({ error: 'Resultado no encontrado.' });
    }

    res.status(200).json({ data: resultado });
  } catch (err) {
    next(err);
  }
};
