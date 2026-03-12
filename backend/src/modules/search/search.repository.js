import pool from '../../config/db.js';

export const searchGlobal = async ({
  portafolioId,
  nameLike,
  phoneLike,
  creditLike,
  emailLike,
  query,
  limit
}) => {
  const result = await pool.query(
    `SELECT * FROM (
       SELECT 'client' AS type,
              c.public_id::text AS id,
              c.portafolio_id,
              c.public_id AS client_id,
              NULL::BIGINT AS credit_id,
              COALESCE(NULLIF(c.numero_cliente, ''), c.public_id::text) AS label,
              (c.nombre || ' ' || c.apellido_paterno || ' ' || c.apellido_materno) AS secondary
       FROM clients c
       WHERE ($1::BIGINT IS NULL OR c.portafolio_id = $1)
         AND (
           lower(c.nombre || ' ' || c.apellido_paterno || ' ' || c.apellido_materno) LIKE $2::TEXT
           OR lower(c.public_id::text) LIKE $6::TEXT
           OR lower(c.numero_cliente) LIKE $6::TEXT
           OR lower(COALESCE(c.rfc, '')) LIKE $6::TEXT
           OR lower(COALESCE(c.curp, '')) LIKE $6::TEXT
         )
       ORDER BY c.id
       LIMIT $7
     ) AS client_results
     UNION ALL
     SELECT * FROM (
       SELECT 'phone' AS type,
              p.id::text AS id,
              c.portafolio_id,
              c.public_id AS client_id,
              NULL::BIGINT AS credit_id,
              p.telefono AS label,
              (c.nombre || ' ' || c.apellido_paterno || ' ' || c.apellido_materno) AS secondary
       FROM client_phones p
       JOIN clients c ON c.id = p.client_id
       WHERE ($1::BIGINT IS NULL OR c.portafolio_id = $1)
         AND $3::TEXT IS NOT NULL
         AND p.telefono LIKE $3::TEXT
       ORDER BY p.id
       LIMIT $7
     ) AS phone_results
     UNION ALL
     SELECT * FROM (
       SELECT 'email' AS type,
              e.id::text AS id,
              c.portafolio_id,
              c.public_id AS client_id,
              NULL::BIGINT AS credit_id,
              e.email AS label,
              (c.nombre || ' ' || c.apellido_paterno || ' ' || c.apellido_materno) AS secondary
       FROM client_emails e
       JOIN clients c ON c.id = e.client_id
       WHERE ($1::BIGINT IS NULL OR c.portafolio_id = $1)
         AND $5::TEXT IS NOT NULL
         AND lower(e.email) LIKE $5::TEXT
       ORDER BY e.id
       LIMIT $7
     ) AS email_results
     UNION ALL
     SELECT * FROM (
       SELECT 'credit' AS type,
              cr.id::text AS id,
              cr.portafolio_id,
              cl.public_id AS client_id,
              cr.id AS credit_id,
              COALESCE(NULLIF(cr.numero_credito_externo, ''), cr.numero_credito) AS label,
              cr.numero_credito AS secondary
       FROM credits cr
       JOIN clients cl ON cl.id = cr.cliente_id
       WHERE ($1::BIGINT IS NULL OR cr.portafolio_id = $1)
         AND (
           lower(cr.numero_credito) LIKE $4::TEXT
           OR lower(cr.numero_credito_externo) LIKE $4::TEXT
         )
       ORDER BY cr.id
       LIMIT $7
     ) AS credit_results
     LIMIT $7;`,
    [
      portafolioId,
      nameLike,
      phoneLike,
      creditLike,
      emailLike,
      `%${query}%`,
      limit
    ]
  );

  return result.rows;
};
