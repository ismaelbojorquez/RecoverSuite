import { useEffect, useState, useMemo } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import BaseDialog from './BaseDialog.jsx';
import FormActions from './form/FormActions.jsx';
import FormSection from './form/FormSection.jsx';
import {
  addGroupMember,
  listGroupMembers,
  removeGroupMember
} from '../services/groups.js';
import { listUsers } from '../services/users.js';
import useNotify from '../hooks/useNotify.jsx';

export default function GroupMembersDialog({ open, groupId, onClose }) {
  const { notify } = useNotify();
  const [members, setMembers] = useState([]);
  const [options, setOptions] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadMembers = async (signal) => {
    if (!groupId) return;
    setLoading(true);
    setError('');
    try {
      const data = await listGroupMembers({ groupId, signal });
      setMembers(data);
    } catch (err) {
      if (!signal?.aborted) {
        setError(err.message || 'No fue posible cargar miembros.');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const searchUsers = async (query, signal) => {
    try {
      const data = await listUsers({
        limit: 50,
        offset: 0,
        search: query,
        signal
      });
      setOptions(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    loadMembers(controller.signal);
    searchUsers('', controller.signal);
    return () => controller.abort();
  }, [open, groupId]);

  const handleAdd = async () => {
    if (!selectedUser || !groupId) return;
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      await addGroupMember({ groupId, userId: selectedUser.id });
      notify.success('Usuario agregado al grupo.');
      setSelectedUser(null);
      await loadMembers();
      setSuccessMsg('Usuario agregado.');
    } catch (err) {
      setError(err.message || 'No fue posible agregar el usuario.');
      notify.error(err.message || 'No fue posible agregar el usuario.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (userId) => {
    const confirm = window.confirm('¿Remover al usuario de este grupo?');
    if (!confirm) return;
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      await removeGroupMember({ groupId, userId });
      notify.info('Usuario removido.');
      await loadMembers();
      setSuccessMsg('Usuario removido.');
    } catch (err) {
      setError(
        err.message ||
          'No fue posible remover el usuario. Verifica reglas de administrador.'
      );
      notify.error(
        err.message ||
          'No fue posible remover el usuario. Revisa si es el último admin o tu propio usuario.'
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (u) =>
        u.email?.toLowerCase().includes(term) ||
        u.username?.toLowerCase().includes(term) ||
        u.name?.toLowerCase().includes(term) ||
        u.nombre?.toLowerCase().includes(term)
    );
  }, [options, search]);

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title="Miembros del grupo"
      subtitle="Agrega o remueve usuarios"
      maxWidth="sm"
      actions={
        <FormActions spacing={1}>
          <Button onClick={onClose} disabled={saving}>
            Cerrar
          </Button>
        </FormActions>
      }
    >
      <Stack className="crm-form">
        {error ? <Alert severity="error">{error}</Alert> : null}
        {successMsg ? <Alert severity="success">{successMsg}</Alert> : null}

        <FormSection
          title="Agregar miembro"
          subtitle="Busca usuarios disponibles y asignalos al grupo sin salir del flujo."
        >
          <Stack className="crm-form__stack">
            <Autocomplete
              options={filteredOptions}
              getOptionLabel={(option) =>
                option.email || option.username || option.name || option.nombre || ''
              }
              value={selectedUser}
              onChange={(_, value) => setSelectedUser(value)}
              inputValue={search}
              onInputChange={(_, value) => setSearch(value)}
              loading={loading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Buscar usuario"
                  placeholder="Correo, username o nombre"
                />
              )}
            />
            <Stack className="crm-form__compact-actions">
              <Button
                variant="contained"
                size="small"
                onClick={handleAdd}
                disabled={!selectedUser || saving}
              >
                Agregar
              </Button>
            </Stack>
          </Stack>
        </FormSection>

        <FormSection
          title="Miembros actuales"
          subtitle="Consulta el roster actual y remueve usuarios cuando sea necesario."
        >
          <Box className="crm-form__scroll crm-group-members__scroll">
            {members.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {loading ? 'Cargando miembros...' : 'Sin miembros.'}
              </Typography>
            ) : (
              <Stack className="crm-form__selection-list">
                {members.map((member) => (
                  <Box
                    key={member.id}
                    className="crm-form__selection-item crm-group-members__item"
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Box>
                        <Typography variant="body2" className="crm-text-strong">
                          {member.email || member.username || `Usuario ${member.id}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {member.name || member.nombre || 'Sin nombre asignado'}
                        </Typography>
                      </Box>
                      <Tooltip title="Remover">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemove(member.id)}
                          disabled={saving}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </FormSection>
      </Stack>
    </BaseDialog>
  );
}
