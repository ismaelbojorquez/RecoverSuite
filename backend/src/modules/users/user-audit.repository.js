import pool from '../../config/db.js';

export const logUserAuditEvent = async ({
  actorUserId,
  targetUserId,
  action,
  ip,
  metadata
}) => {
  await pool.query(
    `INSERT INTO user_audit_logs (actor_user_id, target_user_id, action, ip, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      actorUserId ?? null,
      targetUserId ?? null,
      action,
      ip || null,
      metadata ?? null
    ]
  );
};
