import { createHttpError } from '../../utils/http-error.js';
import {
  createClient,
  deleteClient,
  getClientByPublicId,
  getClientByPublicIdAndPortfolio,
  listClients,
  updateClient
} from './clients.repository.js';
import { listPhonesByClient } from './phones.repository.js';
import { listEmailsByClient } from './emails.repository.js';
import { listAddressesByClient } from './addresses.repository.js';
import { listCreditsWithBalancesByClient } from '../credits/credits.repository.js';
import {
  buildCacheKey,
  cacheGet,
  cacheKeys,
  cacheSet,
  cacheTtl,
  invalidateClientDetailCache,
  invalidateSearchCache
} from '../../utils/cache.js';

const normalizeText = (value) => String(value ?? '').trim();
const MISSING_LAST_NAME = '';

const parseFullName = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return { nombre: '', apellidoPaterno: '', apellidoMaterno: '' };
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    return { nombre: tokens[0], apellidoPaterno: '', apellidoMaterno: '' };
  }
  if (tokens.length === 2) {
    return { nombre: tokens[0], apellidoPaterno: tokens[1], apellidoMaterno: '' };
  }

  const apellidoMaterno = tokens.pop();
  const apellidoPaterno = tokens.pop();
  return {
    nombre: tokens.join(' '),
    apellidoPaterno,
    apellidoMaterno
  };
};

const resolveClientName = ({
  nombre,
  apellidoPaterno,
  apellidoMaterno,
  nombreCompleto
}) => {
  if (nombreCompleto !== undefined) {
    const normalizedFullName = normalizeText(nombreCompleto);
    if (!normalizedFullName) {
      throw createHttpError(400, 'Nombre del cliente es requerido');
    }

    const parsed = parseFullName(normalizedFullName);
    return {
      nombre: parsed.nombre,
      apellidoPaterno: parsed.apellidoPaterno || MISSING_LAST_NAME,
      apellidoMaterno: parsed.apellidoMaterno || MISSING_LAST_NAME
    };
  }

  const normalizedName = nombre ? normalizeText(nombre) : '';
  if (!normalizedName) {
    throw createHttpError(400, 'Nombre del cliente es requerido');
  }

  return {
    nombre: normalizedName,
    apellidoPaterno: apellidoPaterno ? normalizeText(apellidoPaterno) : MISSING_LAST_NAME,
    apellidoMaterno: apellidoMaterno ? normalizeText(apellidoMaterno) : MISSING_LAST_NAME
  };
};

const ensurePositiveId = (value, label) => {
  const id = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, `ID de ${label} invalido`);
  }

  return id;
};

const ensureUuid = (value, label) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (typeof value !== 'string' || !uuidRegex.test(value)) {
    throw createHttpError(400, `ID de ${label} invalido`);
  }
};

const handleDatabaseError = (err) => {
  if (err?.code === '23505') {
    throw createHttpError(409, 'El cliente ya existe en el portafolio');
  }

  throw err;
};

export const listClientsService = async ({ portafolioId, limit, offset, query }) => {
  ensurePositiveId(portafolioId, 'portafolio');

  let nameLike = null;
  if (query !== undefined && query !== null) {
    const normalizedQuery = normalizeText(query).toLowerCase();
    if (normalizedQuery.length >= 2) {
      nameLike = `${normalizedQuery}%`;
    }
  }

  return listClients({ portafolioId, nameLike, limit, offset });
};

export const getClientByIdService = async ({ id, portafolioId = null }) => {
  ensureUuid(id, 'cliente');

  const client = portafolioId
    ? await getClientByPublicIdAndPortfolio({ publicId: id, portafolioId })
    : await getClientByPublicId(id);
  if (!client) {
    throw createHttpError(404, 'Cliente no encontrado');
  }

  return client;
};

export const createClientService = async ({
  portafolioId,
  numeroCliente,
  nombre,
  nombreCompleto,
  apellidoPaterno,
  apellidoMaterno,
  rfc,
  curp
}) => {
  ensurePositiveId(portafolioId, 'portafolio');

  const normalizedNumero = numeroCliente ? normalizeText(numeroCliente) : '';
  if (!normalizedNumero) {
    throw createHttpError(400, 'Numero de cliente es requerido');
  }

  const resolvedName = resolveClientName({
    nombre,
    apellidoPaterno,
    apellidoMaterno,
    nombreCompleto
  });

  try {
    const created = await createClient({
      portafolioId,
      numeroCliente: normalizedNumero,
      nombre: resolvedName.nombre,
      apellidoPaterno: resolvedName.apellidoPaterno,
      apellidoMaterno: resolvedName.apellidoMaterno,
      rfc: rfc ? normalizeText(rfc) : null,
      curp: curp ? normalizeText(curp) : null
    });

    await invalidateSearchCache(portafolioId);

    return created;
  } catch (err) {
    handleDatabaseError(err);
  }
};

export const updateClientService = async (id, updates) => {
  ensureUuid(id, 'cliente');

  const payload = {};
  const existing = await getClientByPublicId(id);

  if (!existing) {
    throw createHttpError(404, 'Cliente no encontrado');
  }

  if (updates.portafolioId !== undefined) {
    ensurePositiveId(updates.portafolioId, 'portafolio');
    payload.portafolioId = updates.portafolioId;
  }

  const hasFullNameUpdate = updates.nombreCompleto !== undefined;
  if (hasFullNameUpdate) {
    const resolvedName = resolveClientName({
      nombreCompleto: updates.nombreCompleto
    });
    payload.nombre = resolvedName.nombre;
    payload.apellidoPaterno = resolvedName.apellidoPaterno;
    payload.apellidoMaterno = resolvedName.apellidoMaterno;
  } else {
    if (updates.nombre !== undefined) {
      if (!updates.nombre) {
        throw createHttpError(400, 'Nombre es requerido');
      }
      payload.nombre = normalizeText(updates.nombre);
    }

    if (updates.apellidoPaterno !== undefined) {
      if (!updates.apellidoPaterno) {
        throw createHttpError(400, 'Apellido paterno es requerido');
      }
      payload.apellidoPaterno = normalizeText(updates.apellidoPaterno);
    }

    if (updates.apellidoMaterno !== undefined) {
      if (!updates.apellidoMaterno) {
        throw createHttpError(400, 'Apellido materno es requerido');
      }
      payload.apellidoMaterno = normalizeText(updates.apellidoMaterno);
    }
  }

  if (updates.numeroCliente !== undefined) {
    if (!updates.numeroCliente) {
      throw createHttpError(400, 'Numero de cliente es requerido');
    }
    payload.numeroCliente = normalizeText(updates.numeroCliente);
  }

  if (updates.rfc !== undefined) {
    payload.rfc = updates.rfc ? normalizeText(updates.rfc) : null;
  }

  if (updates.curp !== undefined) {
    payload.curp = updates.curp ? normalizeText(updates.curp) : null;
  }

  if (Object.keys(payload).length === 0) {
    throw createHttpError(400, 'No se proporcionaron cambios');
  }

  try {
    const updated = await updateClient(id, payload);

    if (!updated) {
      throw createHttpError(404, 'Cliente no encontrado');
    }

    await invalidateSearchCache(existing.portafolio_id);
    if (updated.portafolio_id !== existing.portafolio_id) {
      await invalidateSearchCache(updated.portafolio_id);
    }

    await invalidateClientDetailCache({
      portafolioId: existing.portafolio_id,
      clientId: existing.id
    });
    if (updated.portafolio_id !== existing.portafolio_id) {
      await invalidateClientDetailCache({
        portafolioId: updated.portafolio_id,
        clientId: updated.id
      });
    }

    return updated;
  } catch (err) {
    handleDatabaseError(err);
  }
};

export const deleteClientService = async (id) => {
  ensureUuid(id, 'cliente');

  const existing = await getClientByPublicId(id);
  if (!existing) {
    throw createHttpError(404, 'Cliente no encontrado');
  }

  const deleted = await deleteClient(id);
  if (!deleted) {
    throw createHttpError(404, 'Cliente no encontrado');
  }

  await invalidateSearchCache(existing.portafolio_id);
  await invalidateClientDetailCache({
    portafolioId: existing.portafolio_id,
    clientId: existing.id
  });

  return true;
};

export const getClientDetailService = async ({ clientId, portafolioId }) => {
  ensureUuid(clientId, 'cliente');

  const client = await getClientByPublicId(clientId);
  if (!client) {
    throw createHttpError(404, 'Cliente no encontrado');
  }

  if (portafolioId !== undefined && portafolioId !== null) {
    ensurePositiveId(portafolioId, 'portafolio');
    if (client.portafolio_id !== portafolioId) {
      throw createHttpError(400, 'El cliente no pertenece al portafolio indicado');
    }
  }

  const resolvedPortafolioId = ensurePositiveId(client.portafolio_id, 'portafolio');

  const cacheKey = buildCacheKey(cacheKeys.clientDetail, resolvedPortafolioId, clientId);
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  const internalId = ensurePositiveId(client.internal_id, 'cliente');

  const [phones, emails, addresses, creditRows] = await Promise.all([
    listPhonesByClient({ clientId: internalId }),
    listEmailsByClient({ clientId: internalId }),
    listAddressesByClient({ clientId: internalId }),
    listCreditsWithBalancesByClient({
      clienteId: internalId,
      portafolioId: resolvedPortafolioId
    })
  ]);

  const credits = [];
  const creditMap = new Map();

  for (const row of creditRows) {
    let credit = creditMap.get(row.credit_id);

    if (!credit) {
      credit = {
        id: row.credit_id,
        cliente_id: row.cliente_public_id,
        portafolio_id: row.portafolio_id,
        numero_credito: row.numero_credito,
        numero_credito_externo: row.numero_credito_externo,
        producto: row.producto,
        estado: row.estado,
        created_at: row.created_at,
        updated_at: row.updated_at,
        balances: []
      };

      creditMap.set(row.credit_id, credit);
      credits.push(credit);
    }

    if (row.saldo_id) {
      credit.balances.push({
        id: row.saldo_id,
        credito_id: row.credit_id,
        campo_saldo_id: row.campo_saldo_id,
        valor: row.valor,
        fecha_actualizacion: row.fecha_actualizacion,
        campo_saldo: row.campo_saldo_id
          ? {
              id: row.campo_saldo_id,
              nombre_campo: row.nombre_campo,
              etiqueta_visual: row.etiqueta_visual,
              tipo_dato: row.tipo_dato,
              orden: row.orden,
              es_principal: row.es_principal,
              activo: row.activo
            }
          : null
      });
    }
  }

  const { internal_id, ...clientPublic } = client;

  const detail = {
    client: clientPublic,
    contacts: {
      phones,
      emails,
      addresses
    },
    credits
  };

  await cacheSet(cacheKey, detail, cacheTtl.clientDetail);

  return detail;
};
