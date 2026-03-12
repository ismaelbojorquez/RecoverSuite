import pool from '../../config/db.js';

const selectFields = `
  g.id, g.portafolio_id, g.cliente_id, g.credito_id, g.usuario_id, g.resultado_id,
  g.comentario, g.promesa_monto, g.promesa_fecha, g.fecha_gestion, g.created_at,
  cl.public_id AS cliente_public_id
`;

export const createGestion = async ({
  portafolioId,
  clienteId,
  creditoId,
  usuarioId,
  resultadoId,
  comentario,
  promesaMonto,
  promesaFecha,
  fechaGestion
}) => {
  const result = await pool.query(
    `WITH inserted AS (
       INSERT INTO gestiones
         (portafolio_id, cliente_id, credito_id, usuario_id, resultado_id, comentario, promesa_monto, promesa_fecha, fecha_gestion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *
     )
     SELECT ${selectFields}
     FROM inserted g
     JOIN clients cl ON cl.id = g.cliente_id`,
    [
      portafolioId,
      clienteId,
      creditoId ?? null,
      usuarioId,
      resultadoId ?? null,
      comentario || null,
      promesaMonto ?? null,
      promesaFecha ?? null,
      fechaGestion
    ]
  );

  return result.rows[0];
};

export const listGestiones = async ({
  portafolioId,
  clienteId,
  creditoId,
  usuarioId,
  fechaDesde,
  fechaHasta,
  limit = 20,
  offset = 0
}) => {
  const where = [];
  const values = [];

  const addFilter = (condition, value) => {
    if (value === undefined || value === null) return;
    values.push(value);
    where.push(condition.replace('$', `$${values.length}`));
  };

  addFilter('portafolio_id = $', portafolioId);
  addFilter('cliente_id = $', clienteId);
  addFilter('credito_id = $', creditoId);
  addFilter('usuario_id = $', usuarioId);

  if (fechaDesde) {
    addFilter('fecha_gestion >= $', fechaDesde);
  }

  if (fechaHasta) {
    addFilter('fecha_gestion <= $', fechaHasta);
  }

  values.push(limit);
  values.push(offset);

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT ${selectFields}
     FROM gestiones g
     JOIN clients cl ON cl.id = g.cliente_id
     ${whereClause}
     ORDER BY g.fecha_gestion DESC, g.id DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values
  );

  return result.rows;
};

export const listGestionesByCliente = async ({
  portafolioId,
  clienteId,
  usuarioId,
  limit = 20,
  offset = 0
}) => {
  const values = [portafolioId, clienteId];
  if (usuarioId) values.push(usuarioId);
  values.push(limit, offset);

  const result = await pool.query(
    `SELECT
        g.id,
        g.portafolio_id,
        g.cliente_id,
        g.credito_id,
        g.usuario_id,
        g.resultado_id,
        g.comentario,
        g.promesa_monto,
        g.promesa_fecha,
        g.fecha_gestion,
        g.created_at,
        cl.public_id AS cliente_public_id,
        u.username AS agente_email,
        u.nombre AS agente_nombre,
        r.nombre AS resultado_nombre,
        r.tipo AS resultado_tipo,
        r.requiere_promesa AS resultado_requiere_promesa,
        p.monto AS promesa_monto_detalle,
        p.fecha_promesa AS promesa_fecha_detalle,
        p.estado AS promesa_estado
     FROM gestiones g
     JOIN clients cl ON cl.id = g.cliente_id
     JOIN users u ON u.id = g.usuario_id
     LEFT JOIN resultados_gestion r ON r.id = g.resultado_id
     LEFT JOIN promesas_pago p ON p.gestion_id = g.id
     WHERE g.portafolio_id = $1 AND g.cliente_id = $2
     ${usuarioId ? `AND g.usuario_id = $3` : ''}
     ORDER BY g.fecha_gestion DESC, g.id DESC
     LIMIT $${usuarioId ? 4 : 3} OFFSET $${usuarioId ? 5 : 4}`,
    values
  );

  return result.rows;
};
