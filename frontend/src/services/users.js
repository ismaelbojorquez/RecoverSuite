import { apiFetch } from '../utils/api.js';

const normalizeResponse = (payload) => (payload?.data ? payload.data : payload || []);

export const listUsers = async ({ limit = 50, offset = 0, search, signal } = {}) => {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  });
  if (search) {
    params.set('search', search);
  }

  const payload = await apiFetch(`/api/users?${params.toString()}`, {
    method: 'GET',
    signal
  });

  return normalizeResponse(payload);
};

export const createUser = async ({ email, name, password, isActive = true, groupId }) => {
  const payload = await apiFetch('/api/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      name,
      password,
      is_active: isActive,
      group_id: groupId
    })
  });

  return payload?.data || payload;
};

export const updateUser = async (id, { email, name, password, isActive, groupId }) => {
  const payload = await apiFetch(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      email,
      name,
      password,
      is_active: isActive,
      group_id: groupId
    })
  });

  return payload?.data || payload;
};

export const deleteUser = async (id) =>
  apiFetch(`/api/users/${id}`, {
    method: 'DELETE'
  });

export const activateUser = async (id) => {
  const payload = await apiFetch(`/api/users/${id}/activate`, {
    method: 'PUT'
  });
  return payload?.data || payload;
};

export const deactivateUser = async (id) => {
  const payload = await apiFetch(`/api/users/${id}/deactivate`, {
    method: 'PUT'
  });
  return payload?.data || payload;
};

export const resetUserPassword = async (id) => {
  const payload = await apiFetch(`/api/users/${id}/reset-password`, {
    method: 'POST'
  });
  return payload?.data || payload;
};

export const changeMyPassword = async ({ currentPassword, newPassword }) => {
  const payload = await apiFetch(
    '/api/users/change-password',
    {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      })
    },
    { silent: true }
  );

  return payload?.data || payload;
};
