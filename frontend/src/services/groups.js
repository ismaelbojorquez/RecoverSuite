import { apiFetch } from '../utils/api.js';

const normalizeResponse = (payload) => (payload?.data ? payload.data : payload || []);

export const listGroups = async ({ limit = 50, offset = 0, signal } = {}) => {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  });

  const payload = await apiFetch(`/api/groups?${params.toString()}`, {
    method: 'GET',
    signal
  });

  return normalizeResponse(payload);
};

export const createGroup = async ({ name, description, isAdminGroup = false }) => {
  const payload = await apiFetch('/api/groups', {
    method: 'POST',
    body: JSON.stringify({
      name,
      description,
      is_admin_group: isAdminGroup
    })
  });

  return payload?.data || payload;
};

export const updateGroup = async (id, { name, description, isAdminGroup }) => {
  const payload = await apiFetch(`/api/groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name,
      description,
      is_admin_group: isAdminGroup
    })
  });

  return payload?.data || payload;
};

export const deleteGroup = async (id) =>
  apiFetch(`/api/groups/${id}`, {
    method: 'DELETE'
  });

export const listGroupPermissions = async ({ groupId, signal }) => {
  const payload = await apiFetch(`/api/groups/${groupId}/permissions`, {
    method: 'GET',
    signal
  });
  return normalizeResponse(payload);
};

export const replaceGroupPermissions = async ({ groupId, permissionIds }) =>
  apiFetch(`/api/groups/${groupId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissionIds })
  });

export const listGroupMembers = async ({ groupId, signal }) => {
  const payload = await apiFetch(`/api/groups/${groupId}/members`, {
    method: 'GET',
    signal
  });
  return normalizeResponse(payload);
};

export const addGroupMember = async ({ groupId, userId }) =>
  apiFetch(`/api/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId })
  });

export const removeGroupMember = async ({ groupId, userId }) =>
  apiFetch(`/api/groups/${groupId}/members/${userId}`, {
    method: 'DELETE'
  });
