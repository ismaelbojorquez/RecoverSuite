import { Alert, Box, Button, MenuItem, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import FormActions from './form/FormActions.jsx';
import FormField from './form/FormField.jsx';
import FormSection from './form/FormSection.jsx';
import { listDictamenes } from '../services/dictamenes.js';

export const CONTACT_CHANNELS = [
  { value: 'LLAMADA', label: 'Llamada' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'SMS', label: 'SMS' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'VISITA', label: 'Visita' }
];

const formatScore = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed.toFixed(0) : '-';
};

const normalizeDictamen = (dictamen) => ({
  id: String(dictamen?.id || dictamen?._id || ''),
  nombre: String(dictamen?.nombre || '').trim(),
  tipoContacto: String(dictamen?.tipoContacto || dictamen?.tipo_contacto || '')
    .trim()
    .toUpperCase(),
  riesgo: String(dictamen?.riesgo || dictamen?.nivel_riesgo || '').trim().toUpperCase(),
  score: dictamen?.score ?? dictamen?.score_global ?? null
});

export default function GestionForm({
  portafolioId,
  form,
  onFieldChange,
  formError = '',
  onFormErrorClear,
  saving = false,
  onSubmit,
  onClose,
  canConfigureDictamenes = false,
  onOpenDictamenes,
  dictamenFieldRef,
  comentarioFieldRef
}) {
  const [dictamenes, setDictamenes] = useState([]);
  const [dictamenesLoading, setDictamenesLoading] = useState(false);
  const [dictamenesError, setDictamenesError] = useState('');

  const safeForm = form || {};
  const safeDictamenes = useMemo(
    () => (Array.isArray(dictamenes) ? dictamenes.map(normalizeDictamen).filter((item) => item.id) : []),
    [dictamenes]
  );

  const selectedDictamen = useMemo(
    () => safeDictamenes.find((item) => item.id === String(safeForm.dictamen_id || '')) || null,
    [safeDictamenes, safeForm.dictamen_id]
  );

  useEffect(() => {
    if (!portafolioId) {
      setDictamenes([]);
      setDictamenesLoading(false);
      setDictamenesError('');
      return undefined;
    }

    const controller = new AbortController();
    setDictamenesLoading(true);
    setDictamenesError('');

    listDictamenes({ portafolioId, activo: true, signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setDictamenes(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setDictamenes([]);
          setDictamenesError(err.message || 'No fue posible cargar los dictamenes.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setDictamenesLoading(false);
        }
      });

    return () => controller.abort();
  }, [portafolioId]);

  useEffect(() => {
    if (!safeForm.dictamen_id) {
      return;
    }

    if (!safeDictamenes.some((item) => item.id === String(safeForm.dictamen_id))) {
      onFieldChange?.('dictamen_id', '');
    }
  }, [onFieldChange, safeDictamenes, safeForm.dictamen_id]);

  const requiredFieldError = formError ? 'Este campo es obligatorio.' : '';
  const dictamenHelperText = selectedDictamen
    ? `Score ${formatScore(selectedDictamen.score)}${
        selectedDictamen.riesgo ? ` · Riesgo ${selectedDictamen.riesgo}` : ''
      }${selectedDictamen.tipoContacto ? ` · ${selectedDictamen.tipoContacto}` : ''}`
    : '';

  return (
    <Stack spacing={1.6}>
      {formError ? (
        <Alert severity="error" onClose={() => onFormErrorClear && onFormErrorClear()}>
          {formError}
        </Alert>
      ) : null}

      {dictamenesError ? (
        <Alert severity="error" onClose={() => setDictamenesError('')}>
          {dictamenesError}
        </Alert>
      ) : null}

      {safeDictamenes.length === 0 && !dictamenesLoading && !dictamenesError ? (
        <Alert
          severity="warning"
          action={
            canConfigureDictamenes && typeof onOpenDictamenes === 'function' ? (
              <Button color="inherit" size="small" onClick={onOpenDictamenes}>
                Configurar
              </Button>
            ) : null
          }
        >
          No hay dictamenes activos disponibles para este portafolio.
        </Alert>
      ) : null}

      <FormSection
        title="Detalle de la gestion"
        subtitle="Selecciona el canal utilizado y clasifica el resultado con un dictamen."
      >
        <Box className="crm-form__grid">
          <FormField
            select
            label="Medio de contacto"
            value={safeForm.medio_contacto || ''}
            onChange={(event) => onFieldChange && onFieldChange('medio_contacto', event.target.value)}
            required
            error={!safeForm.medio_contacto && formError ? requiredFieldError : ''}
          >
            <MenuItem value="">Selecciona un medio</MenuItem>
            {CONTACT_CHANNELS.map((channel) => (
              <MenuItem key={channel.value} value={channel.value}>
                {channel.label}
              </MenuItem>
            ))}
          </FormField>

          <FormField
            select
            label="Dictamen"
            value={safeForm.dictamen_id || ''}
            onChange={(event) => onFieldChange && onFieldChange('dictamen_id', event.target.value)}
            required
            disabled={dictamenesLoading || safeDictamenes.length === 0}
            inputRef={dictamenFieldRef}
            error={!safeForm.dictamen_id && formError ? 'Selecciona un dictamen.' : ''}
            helperText={dictamenHelperText}
          >
            <MenuItem value="">Selecciona un dictamen</MenuItem>
            {safeDictamenes.map((dictamen) => (
              <MenuItem key={dictamen.id} value={dictamen.id}>
                {`${dictamen.nombre} · Score ${formatScore(dictamen.score)}${
                  dictamen.tipoContacto ? ` · ${dictamen.tipoContacto}` : ''
                }`}
              </MenuItem>
            ))}
          </FormField>

          <FormField
            label="Comentario"
            value={safeForm.comentario || ''}
            onChange={(event) => onFieldChange && onFieldChange('comentario', event.target.value)}
            required
            multiline
            minRows={3}
            placeholder="Detalle breve de la gestion"
            inputRef={comentarioFieldRef}
            error={!String(safeForm.comentario || '').trim() && formError ? requiredFieldError : ''}
          />
        </Box>
      </FormSection>

      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
        <Typography variant="body2" color="text.secondary">
          El dictamen es obligatorio para registrar la gestion.
        </Typography>

        <FormActions spacing={1.2} className="crm-surface-card__action-row">
          {typeof onClose === 'function' ? (
            <Button variant="ghost" onClick={() => onClose()}>
              Cerrar
            </Button>
          ) : null}
          <Button
            variant="contained"
            onClick={() => onSubmit && onSubmit()}
            disabled={saving || dictamenesLoading || safeDictamenes.length === 0}
          >
            Registrar
          </Button>
        </FormActions>
      </Stack>
    </Stack>
  );
}
