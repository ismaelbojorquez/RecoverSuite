import pool from '../../config/db.js';

export const createAuditLog = async ({
  usuarioId,
  accion,
  entidad,
  entidadId,
  fecha,
  ip,
  usuarioGrupos,
  permisos
}) => {
  await pool.query(
    `INSERT INTO audit_logs (usuario_id, accion, entidad, entidad_id, fecha, ip, usuario_grupos, permisos)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [usuarioId, accion, entidad, entidadId, fecha, ip, usuarioGrupos || null, permisos || null]
  );
};
