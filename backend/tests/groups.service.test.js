import { test } from 'node:test';
import assert from 'node:assert/strict';

// Activamos pool mockeado a través de la variable de entorno y un singleton global
process.env.MOCK_DB = 'true';

const defaultQuery = async () => {
  throw new Error('pool.query no mockeado');
};
const defaultConnect = async () => ({
  query: defaultQuery,
  release() {}
});

const poolStub = {
  query: defaultQuery,
  connect: defaultConnect,
  on() {}
};

global.__POOL_MOCK__ = poolStub;

const groupsRepo = await import('../src/modules/groups/groups.repository.js');
const usersRepo = await import('../src/modules/users/users.repository.js');
const groupsService = await import('../src/modules/groups/groups.service.js');
const pool = poolStub;

test('no se puede borrar el último grupo admin', async (t) => {
  pool.query = async (sql) => {
    if (sql.includes('FROM user_groups') && sql.includes('WHERE id = $1')) {
      return { rows: [{ id: 1, name: 'Administradores', is_admin_group: true }] };
    }
    if (sql.includes('COUNT(*) AS count') && sql.includes('is_admin_group')) {
      return { rows: [{ count: 1 }] };
    }
    if (sql.startsWith('DELETE FROM user_groups')) {
      return { rowCount: 1, rows: [] };
    }
    throw new Error(`query no esperada: ${sql}`);
  };

  t.after(() => {
    pool.query = defaultQuery;
  });

  await assert.rejects(
    () => groupsService.deleteGroupService(1),
    (err) => err?.statusCode === 409
  );
});

test('no se puede desmarcar is_admin_group del último grupo admin', async (t) => {
  pool.query = async (sql) => {
    if (sql.includes('FROM user_groups') && sql.includes('WHERE id = $1')) {
      return { rows: [{ id: 2, name: 'Admins', is_admin_group: true }] };
    }
    if (sql.includes('COUNT(*) AS count') && sql.includes('is_admin_group')) {
      return { rows: [{ count: 1 }] };
    }
    if (sql.includes('COUNT(DISTINCT u.id) AS count')) {
      return { rows: [{ count: 0 }] };
    }
    if (sql.startsWith('UPDATE user_groups')) {
      return { rows: [{ id: 2, name: 'Admins', is_admin_group: false }] };
    }
    throw new Error(`query no esperada: ${sql}`);
  };

  t.after(() => {
    pool.query = defaultQuery;
  });

  await assert.rejects(
    () =>
      groupsService.updateGroupService(2, {
        name: 'Admins',
        is_admin_group: false
      }),
    (err) => err?.statusCode === 409
  );
});

test('no se puede remover al último usuario admin de todos los grupos admin', async (t) => {
  const client = {
    queries: [],
    async query(sql) {
      this.queries.push(sql);
      if (sql === 'BEGIN' || sql === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('FROM users') && sql.includes('WHERE id = $1')) {
        return { rows: [{ id: 5, estado: 'activo' }] };
      }
      if (sql.includes('SELECT is_admin_group FROM user_groups')) {
        return { rows: [{ is_admin_group: true }] };
      }
      if (sql.includes('SELECT EXISTS')) {
        return { rows: [{ has_admin: false }] };
      }
      if (sql.includes('COUNT(DISTINCT u.id) AS count')) {
        return { rows: [{ count: 0 }] };
      }
      throw new Error(`client query no esperada: ${sql}`);
    },
    release() {}
  };

  pool.connect = async () => client;
  pool.query = async (sql) => {
    if (sql.includes('FROM user_groups') && sql.includes('WHERE id = $1')) {
      return { rows: [{ id: 1, is_admin_group: true }] };
    }
    // removeUserFromGroup no debería llamarse; si llega, fallamos
    throw new Error(`pool query no esperada: ${sql}`);
  };

  t.after(() => {
    pool.connect = defaultConnect;
    pool.query = defaultQuery;
  });

  await assert.rejects(
    () => groupsService.removeUserFromGroupService(1, 5, 99),
    (err) => err?.statusCode === 409
  );

  assert.ok(client.queries.includes('BEGIN'), 'Debe iniciar transacción');
  assert.ok(client.queries.includes('ROLLBACK'), 'Debe revertir ante error');
  assert.equal(
    client.queries.filter((q) => q.startsWith('DELETE')).length,
    0,
    'No debe ejecutar eliminación'
  );
});

test('reemplazo de permisos usa transacción y normaliza ids', async (t) => {
  const client = {
    queries: [],
    async query(sql) {
      this.queries.push(sql);
      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return { rows: [] };
      }
      if (sql.includes('FROM permissions')) {
        return { rows: [{ count: 2 }] };
      }
      if (sql.startsWith('DELETE FROM group_permissions')) {
        return { rows: [] };
      }
      if (sql.startsWith('INSERT INTO group_permissions')) {
        return { rows: [] };
      }
      throw new Error(`client query no esperada: ${sql}`);
    },
    release() {}
  };

  pool.connect = async () => client;
  pool.query = async (sql) => {
    if (sql.includes('FROM user_groups') && sql.includes('WHERE id = $1')) {
      return { rows: [{ id: 10, is_admin_group: false }] };
    }
    throw new Error(`pool query no esperada: ${sql}`);
  };

  t.after(() => {
    pool.connect = defaultConnect;
    pool.query = defaultQuery;
  });

  const ok = await groupsService.replaceGroupPermissionsService(10, [1, '2']);
  assert.equal(ok, true);
  const beginIndex = client.queries.indexOf('BEGIN');
  const commitIndex = client.queries.lastIndexOf('COMMIT');
  assert.ok(beginIndex !== -1 && commitIndex !== -1 && beginIndex < commitIndex, 'Debe envolver en transacción');
});
