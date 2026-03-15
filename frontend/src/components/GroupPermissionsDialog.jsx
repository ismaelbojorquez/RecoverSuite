import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import BaseDialog from './BaseDialog.jsx';
import FormActions from './form/FormActions.jsx';
import FormSection from './form/FormSection.jsx';
import { listPermissions } from '../services/permissions.js';
import { listGroupPermissions, replaceGroupPermissions } from '../services/groups.js';
import useNotify from '../hooks/useNotify.jsx';

/**
 * Modal para gestionar permisos de un grupo.
 *
 * Props:
 * - open: boolean
 * - groupId: number
 * - onClose: function
 */
export default function GroupPermissionsDialog({ open, groupId, onClose }) {
  const { notify } = useNotify();
  const [catalog, setCatalog] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async (signal) => {
    setLoading(true);
    setError('');
    try {
      const [allPerms, groupPerms] = await Promise.all([
        listPermissions({ limit: 1000, offset: 0, signal }),
        listGroupPermissions({ groupId, signal })
      ]);
      setCatalog(allPerms);
      setSelectedIds(groupPerms.map((p) => String(p.id)));
    } catch (err) {
      if (!signal?.aborted) {
        setError(err.message || 'No fue posible cargar los permisos.');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!open || !groupId) return undefined;
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [open, groupId]);

  const filteredCatalog = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return catalog;
    return catalog.filter(
      (p) =>
        p.key?.toLowerCase().includes(term) ||
        p.label?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term)
    );
  }, [catalog, search]);

  const togglePermission = (id) => {
    setSelectedIds((prev) => {
      const strId = String(id);
      if (prev.includes(strId)) {
        return prev.filter((v) => v !== strId);
      }
      return [...prev, strId];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    setError('');
    try {
      await replaceGroupPermissions({
        groupId,
        permissionIds: selectedIds.map((v) => Number(v))
      });
      setSuccessMsg('Permisos actualizados correctamente.');
      notify.success('Permisos del grupo guardados.');
    } catch (err) {
      setError(err.message || 'No fue posible guardar los permisos.');
      notify.error(err.message || 'No fue posible guardar los permisos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title="Permisos del grupo"
      subtitle="Selecciona los permisos que tendrá el grupo"
      maxWidth="sm"
      actions={
        <FormActions spacing={1}>
          <Button onClick={onClose} disabled={saving}>
            Cerrar
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || loading}>
            Guardar
          </Button>
        </FormActions>
      }
    >
      <Stack className="crm-form">
        {error ? <Alert severity="error">{error}</Alert> : null}
        {successMsg ? <Alert severity="success">{successMsg}</Alert> : null}
        <FormSection
          title="Buscar permisos"
          subtitle="Filtra rapidamente por clave, etiqueta o descripcion."
        >
          <TextField
            label="Buscar permiso"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            disabled={loading}
            placeholder="permissions.read, grupos, reportes..."
            helperText={`${selectedIds.length} permiso${selectedIds.length === 1 ? '' : 's'} seleccionado${selectedIds.length === 1 ? '' : 's'}.`}
          />
        </FormSection>

        <FormSection
          title="Catalogo"
          subtitle="Activa o desactiva permisos individuales sin perder contexto."
        >
          <Box className="crm-form__scroll crm-group-permissions__scroll">
            {filteredCatalog.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {loading ? 'Cargando permisos...' : 'Sin resultados.'}
              </Typography>
            ) : (
              <Stack className="crm-form__selection-list">
                {filteredCatalog.map((perm) => {
                  const isSelected = selectedIds.includes(String(perm.id));

                  return (
                    <Box
                      key={perm.id}
                      className={[
                        'crm-form__selection-item',
                        isSelected ? 'crm-form__selection-item--selected' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isSelected}
                            onChange={() => togglePermission(perm.id)}
                          />
                        }
                        label={
                          <Stack spacing={0.2}>
                            <Typography variant="body2" className="crm-text-strong">
                              {perm.key}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {perm.label || perm.description || 'Sin descripcion'}
                            </Typography>
                          </Stack>
                        }
                      />
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        </FormSection>
      </Stack>
    </BaseDialog>
  );
}
