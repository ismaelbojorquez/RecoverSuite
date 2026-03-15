import { Send } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { memo } from 'react';
import EmptyState from '../../../components/EmptyState.jsx';
import FormActions from '../../../components/form/FormActions.jsx';
import FormField from '../../../components/form/FormField.jsx';
import FormSection from '../../../components/form/FormSection.jsx';

const dateFormatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' });

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return dateFormatter.format(date);
};

const defaultForm = {
  resultado_id: '',
  comentario: '',
  promesa_monto: '',
  promesa_fecha: ''
};

const resolveForm = (value) => ({ ...defaultForm, ...(value || {}) });

const buildPromesaLabel = (gestion) => {
  if (!gestion?.promesa_monto_detalle) {
    return '';
  }

  return `Promesa $${gestion.promesa_monto_detalle} - ${formatDate(gestion.promesa_fecha_detalle)}`;
};

function GestionesWidget({
  title = 'Gestiones',
  canLog = false,
  canViewGestiones = false,
  form,
  setForm,
  onFormChange,
  formError = '',
  onFormErrorClear,
  resultados = [],
  resultadosLoading = false,
  requierePromesa = false,
  savingGestion = false,
  onSubmit,
  gestiones = [],
  gestionesLoading = false,
  gestionesError = '',
  onGestionesErrorClear,
  gestionesHasNext = false,
  onLoadMore,
  showForm = true,
  showHistory = true
}) {
  const safeForm = resolveForm(form);
  const safeResultados = Array.isArray(resultados) ? resultados : [];
  const safeGestiones = Array.isArray(gestiones) ? gestiones : [];

  const updateField = (field, value) => {
    if (typeof onFormChange === 'function') {
      onFormChange(field, value);
      return;
    }

    if (typeof setForm === 'function') {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = () => {
    if (typeof onSubmit === 'function') {
      onSubmit();
    }
  };

  if (!canLog && !canViewGestiones) {
    return (
      <Paper variant="panel-sm">
        <Stack spacing={1}>
          <Typography variant="subtitle1" className="crm-surface-card__title">
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No tienes permisos para ver o registrar gestiones.
          </Typography>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      {showForm && canLog && (
        <Paper variant="panel-sm">
          <Stack spacing={2}>
            <Stack className="crm-surface-card__header">
              <Stack className="crm-surface-card__header-main">
                <Typography variant="overline" className="crm-surface-card__eyebrow">
                  Operación
                </Typography>
                <Typography variant="subtitle1" className="crm-surface-card__title">
                  Registrar gestion
                </Typography>
                <Typography variant="body2" className="crm-surface-card__subtitle">
                  Documenta el resultado del contacto y, cuando aplique, registra la promesa de pago.
                </Typography>
              </Stack>
            </Stack>

            {formError && (
              <Alert severity="error" onClose={() => onFormErrorClear && onFormErrorClear()}>
                {formError}
              </Alert>
            )}

            <FormSection
              title="Detalle de la gestion"
              subtitle="Selecciona el resultado y documenta el contexto del contacto."
            >
              <Box className="crm-form__grid">
                <FormField
                  component={TextField}
                  select
                  label="Resultado"
                  value={safeForm.resultado_id}
                  onChange={(event) => updateField('resultado_id', event.target.value)}
                  required
                  SelectProps={{ native: true }}
                  disabled={resultadosLoading}
                >
                  <option value="">Selecciona un resultado</option>
                  {safeResultados.map((resultado) => (
                    <option key={resultado.id} value={resultado.id}>
                      {resultado.nombre} ({resultado.tipo})
                    </option>
                  ))}
                </FormField>

                <FormField
                  label="Comentario"
                  value={safeForm.comentario}
                  onChange={(event) => updateField('comentario', event.target.value)}
                  required
                  multiline
                  minRows={3}
                  placeholder="Detalle breve de la gestion"
                />
              </Box>
            </FormSection>

            {requierePromesa && (
              <FormSection
                title="Promesa de pago"
                subtitle="Captura monto y fecha compromiso cuando el resultado lo requiera."
              >
                <Box className="crm-form__grid">
                  <FormField
                    label="Monto de promesa"
                    type="number"
                    value={safeForm.promesa_monto}
                    onChange={(event) => updateField('promesa_monto', event.target.value)}
                    required
                    inputProps={{ min: 0, step: '0.01' }}
                  />

                  <FormField
                    component={TextField}
                    label="Fecha promesa"
                    type="datetime-local"
                    value={safeForm.promesa_fecha}
                    onChange={(event) => updateField('promesa_fecha', event.target.value)}
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              </FormSection>
            )}

            <FormActions spacing={1.5} className="crm-surface-card__action-row">
              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={handleSubmit}
                disabled={savingGestion}
              >
                Registrar
              </Button>
            </FormActions>
          </Stack>
        </Paper>
      )}

      {showHistory && (
        <Paper variant="panel-sm">
          <Stack spacing={2}>
            <Stack className="crm-surface-card__header">
              <Stack className="crm-surface-card__header-main">
                <Typography variant="overline" className="crm-surface-card__eyebrow">
                  Seguimiento
                </Typography>
                <Typography variant="subtitle1" className="crm-surface-card__title">
                  Historial
                </Typography>
                <Typography variant="body2" className="crm-surface-card__subtitle">
                  Secuencia cronológica de gestiones y resultado de cada interacción.
                </Typography>
              </Stack>
            </Stack>

            {!canViewGestiones ? (
              <Typography variant="body2" color="text.secondary">
                No tienes permisos para ver el historial de gestiones.
              </Typography>
            ) : gestionesLoading ? (
              <Stack spacing={1}>
                <Skeleton width={180} />
                <Skeleton width="60%" />
                <Skeleton width="40%" />
              </Stack>
            ) : gestionesError ? (
              <Alert
                severity="error"
                onClose={() => onGestionesErrorClear && onGestionesErrorClear()}
              >
                {gestionesError}
              </Alert>
            ) : safeGestiones.length === 0 ? (
              <EmptyState
                title="Sin gestiones"
                description="Aun no hay gestiones registradas para este cliente."
                icon={null}
                dense
              />
            ) : (
              <Stack spacing={2} className="crm-surface-card__list">
                {safeGestiones.map((gestion) => (
                  <Paper key={gestion.id} variant="outlined" className="crm-surface-card__list-item">
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="subtitle2" className="crm-text-strong">
                          {gestion.resultado_nombre || 'Gestion'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(gestion.fecha_gestion)}
                        </Typography>
                      </Stack>

                      <Typography variant="body2">{gestion.comentario}</Typography>

                      <Stack direction="row" spacing={2} className="crm-surface-card__badge-row">
                        <Chip
                          label={gestion.resultado_tipo || 'resultado'}
                          size="small"
                          variant="outlined"
                        />

                        {gestion.agente_email && (
                          <Typography variant="caption" color="text.secondary">
                            Agente: {gestion.agente_email}
                          </Typography>
                        )}

                        {gestion.promesa_monto_detalle && (
                          <Chip
                            label={buildPromesaLabel(gestion)}
                            color="warning"
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    </Stack>
                  </Paper>
                ))}

                {gestionesHasNext && (
                  <Button variant="outlined" onClick={() => onLoadMore && onLoadMore()}>
                    Cargar mas
                  </Button>
                )}
              </Stack>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

const MemoizedGestionesWidget = memo(GestionesWidget);
MemoizedGestionesWidget.displayName = 'GestionesWidget';

export default MemoizedGestionesWidget;
