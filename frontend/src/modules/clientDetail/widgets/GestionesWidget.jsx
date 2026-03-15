import {
  AddTask,
  ExpandLess,
  ExpandMore,
  PaymentsOutlined,
  Send,
  WhatsApp
} from '@mui/icons-material';
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
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import BaseTable from '../../../components/BaseTable.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import FormActions from '../../../components/form/FormActions.jsx';
import FormField from '../../../components/form/FormField.jsx';
import FormSection from '../../../components/form/FormSection.jsx';

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'short',
  timeStyle: 'short'
});
const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN'
});

const defaultForm = {
  resultado_id: '',
  comentario: '',
  promesa_monto: '',
  promesa_fecha: ''
};

const resolveForm = (value) => ({ ...defaultForm, ...(value || {}) });

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

const formatAmount = (value) => {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return String(value);
  }

  return currencyFormatter.format(numeric);
};

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const resolveQuickPromiseResult = (results) =>
  (Array.isArray(results) ? results : []).find((item) => Boolean(item?.requiere_promesa)) || null;

const resolveGestionDictamen = (gestion) => {
  const hayPromesa = Boolean(gestion?.promesa_monto_detalle || gestion?.promesa_fecha_detalle);
  const text = [gestion?.resultado_tipo, gestion?.resultado_nombre].map(normalizeText).join(' ');

  if (hayPromesa || text.includes('promesa')) {
    return { label: 'Promesa', tone: 'warning' };
  }

  if (
    text.includes('pago') ||
    text.includes('abono') ||
    text.includes('liquidacion') ||
    text.includes('liquidacion')
  ) {
    return { label: 'Pago', tone: 'success' };
  }

  if (
    text.includes('sin contacto') ||
    text.includes('no contacto') ||
    text.includes('no contesta') ||
    text.includes('no responde') ||
    text.includes('sin respuesta') ||
    text.includes('no localizado')
  ) {
    return { label: 'Sin contacto', tone: 'danger' };
  }

  if (text.includes('buzon') || text.includes('voicemail') || text.includes('casilla')) {
    return { label: 'Buzon', tone: 'neutral' };
  }

  return {
    label: gestion?.resultado_tipo || 'Gestion',
    tone: 'default'
  };
};

function NotesCell({ gestionId, note, expanded, onToggle }) {
  const trimmed = String(note || '').trim();
  const isLong = trimmed.length > 88;

  if (!trimmed) {
    return (
      <Typography variant="body2" color="text.secondary">
        -
      </Typography>
    );
  }

  return (
    <Stack className="crm-gestiones__note-stack">
      <Typography
        variant="body2"
        className={[
          'crm-gestiones__note-text',
          expanded ? 'crm-gestiones__note-text--expanded' : ''
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {trimmed}
      </Typography>
      {isLong ? (
        <Button
          size="small"
          variant="ghost"
          onClick={() => onToggle(gestionId)}
          endIcon={expanded ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
          className="crm-gestiones__note-toggle"
        >
          {expanded ? 'Menos' : 'Ver mas'}
        </Button>
      ) : null}
    </Stack>
  );
}

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
  onQuickWhatsapp,
  quickActionRequest,
  focusReturnToken,
  showForm = true,
  showHistory = true
}) {
  const safeForm = resolveForm(form);
  const safeResultados = Array.isArray(resultados) ? resultados : [];
  const safeGestiones = Array.isArray(gestiones) ? gestiones : [];
  const promiseResult = useMemo(
    () => resolveQuickPromiseResult(safeResultados),
    [safeResultados]
  );
  const composerRef = useRef(null);
  const quickActionsRef = useRef(null);
  const resultadoFieldRef = useRef(null);
  const comentarioFieldRef = useRef(null);
  const latestQuickActionRef = useRef(null);
  const [composerMode, setComposerMode] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState([]);

  const paymentResult = useMemo(
    () =>
      safeResultados.find((item) => {
        const resultText = normalizeText(
          `${item?.nombre || ''} ${item?.tipo || ''} ${item?.descripcion || ''}`
        );

        return (
          resultText.includes('pago') ||
          resultText.includes('abono') ||
          resultText.includes('liquidacion') ||
          resultText.includes('deposito')
        );
      }) || null,
    [safeResultados]
  );

  useEffect(() => {
    if (!showForm) {
      setComposerMode(null);
    }
  }, [showForm]);

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

  const showComposer = showForm && canLog && Boolean(composerMode);
  const showPromiseFields = Boolean(requierePromesa || composerMode === 'promesa');

  const focusComposerTarget = (focusTarget = 'resultado') => {
    const preferredField =
      focusTarget === 'comentario' ? comentarioFieldRef.current : resultadoFieldRef.current;
    const fallbackField =
      focusTarget === 'comentario' ? resultadoFieldRef.current : comentarioFieldRef.current;

    preferredField?.focus?.();
    if (document.activeElement !== preferredField) {
      fallbackField?.focus?.();
    }
  };

  const revealComposer = (nextMode, { focusTarget = 'resultado' } = {}) => {
    if (!showForm || !canLog) {
      return;
    }

    setComposerMode(nextMode);

    window.requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      focusComposerTarget(focusTarget);
    });
  };

  const handleQuickGestion = () => {
    revealComposer('gestion');
  };

  const handleQuickPromesa = () => {
    if (promiseResult && String(safeForm.resultado_id || '') !== String(promiseResult.id)) {
      updateField('resultado_id', String(promiseResult.id));
    }

    revealComposer('promesa', {
      focusTarget: promiseResult ? 'comentario' : 'resultado'
    });
  };

  const handleQuickPago = () => {
    if (paymentResult && String(safeForm.resultado_id || '') !== String(paymentResult.id)) {
      updateField('resultado_id', String(paymentResult.id));
    }

    revealComposer('pago', {
      focusTarget: paymentResult ? 'comentario' : 'resultado'
    });
  };

  useEffect(() => {
    const token = quickActionRequest?.token;
    const mode = quickActionRequest?.mode;

    if (!token || token === latestQuickActionRef.current || !showForm || !canLog) {
      return;
    }

    latestQuickActionRef.current = token;

    if (mode === 'promesa') {
      if (promiseResult && String(safeForm.resultado_id || '') !== String(promiseResult.id)) {
        updateField('resultado_id', String(promiseResult.id));
      }
      revealComposer('promesa', {
        focusTarget: promiseResult ? 'comentario' : 'resultado'
      });
      return;
    }

    if (mode === 'pago') {
      if (paymentResult && String(safeForm.resultado_id || '') !== String(paymentResult.id)) {
        updateField('resultado_id', String(paymentResult.id));
      }
      revealComposer('pago', {
        focusTarget: paymentResult ? 'comentario' : 'resultado'
      });
      return;
    }

    revealComposer('gestion');
  }, [
    canLog,
    paymentResult,
    promiseResult,
    quickActionRequest,
    safeForm.resultado_id,
    showForm
  ]);

  useEffect(() => {
    if (!focusReturnToken) {
      return;
    }

    window.requestAnimationFrame(() => {
      if (showComposer) {
        composerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        focusComposerTarget(composerMode === 'gestion' ? 'resultado' : 'comentario');
        return;
      }

      quickActionsRef.current?.focus?.();
    });
  }, [composerMode, focusReturnToken, showComposer]);

  const toggleExpandedNote = (gestionId) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(gestionId)) {
        next.delete(gestionId);
      } else {
        next.add(gestionId);
      }
      return Array.from(next);
    });
  };

  const historyColumns = useMemo(
    () => [
      {
        id: 'fecha',
        label: 'Fecha',
        minWidth: 118,
        render: (row) => formatDate(row.fecha_gestion)
      },
      {
        id: 'agente',
        label: 'Agente',
        minWidth: 140,
        render: (row) => row.agente_email || row.agente_nombre || '-'
      },
      {
        id: 'dictamen',
        label: 'Dictamen',
        minWidth: 128,
        render: (row) => {
          const dictamen = resolveGestionDictamen(row);
          return (
            <Chip
              size="small"
              label={dictamen.label}
              className={[
                'crm-gestiones__badge',
                `crm-gestiones__badge--${dictamen.tone}`
              ].join(' ')}
            />
          );
        }
      },
      {
        id: 'resultado',
        label: 'Resultado',
        minWidth: 170,
        render: (row) => (
          <Stack spacing={0.2}>
            <Typography variant="body2" className="crm-text-strong">
              {row.resultado_nombre || 'Gestion'}
            </Typography>
            {row.resultado_tipo ? (
              <Typography variant="caption" color="text.secondary">
                {row.resultado_tipo}
              </Typography>
            ) : null}
          </Stack>
        )
      },
      {
        id: 'monto',
        label: 'Monto',
        align: 'right',
        minWidth: 118,
        render: (row) => formatAmount(row.promesa_monto_detalle || row.monto || row.monto_detalle)
      },
      {
        id: 'notas',
        label: 'Notas',
        minWidth: 280,
        render: (row) => (
          <NotesCell
            gestionId={row.id}
            note={row.comentario}
            expanded={expandedNotes.includes(row.id)}
            onToggle={toggleExpandedNote}
          />
        )
      }
    ],
    [expandedNotes]
  );

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
    <Stack spacing={1.5}>
      {showForm && (
        <Paper variant="panel-sm">
          <Stack spacing={1.5}>
            <Stack className="crm-surface-card__header">
              <Stack className="crm-surface-card__header-main">
                <Typography variant="overline" className="crm-surface-card__eyebrow">
                  Operación rápida
                </Typography>
                <Typography variant="subtitle1" className="crm-surface-card__title">
                  {title}
                </Typography>
                <Typography variant="body2" className="crm-surface-card__subtitle">
                  Acciones de alta frecuencia para agentes de cobranza.
                </Typography>
              </Stack>
            </Stack>

            <Stack
              direction="row"
              useFlexGap
              flexWrap="wrap"
              spacing={1}
              className="crm-gestiones__quick-actions"
              ref={quickActionsRef}
              tabIndex={-1}
            >
              <Button
                variant="contained"
                size="small"
                startIcon={<AddTask />}
                onClick={handleQuickGestion}
                disabled={!canLog}
              >
                Nueva Gestión
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Send />}
                onClick={handleQuickPromesa}
                disabled={!canLog || !promiseResult}
              >
                Registrar Promesa
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<PaymentsOutlined />}
                onClick={handleQuickPago}
                disabled={!canLog}
              >
                Registrar Pago
              </Button>
              <Button
                variant="ghost"
                size="small"
                startIcon={<WhatsApp />}
                onClick={() => onQuickWhatsapp && onQuickWhatsapp()}
                disabled={typeof onQuickWhatsapp !== 'function'}
              >
                Enviar WhatsApp
              </Button>
            </Stack>

            {showComposer ? (
              <Paper ref={composerRef} variant="outlined" className="crm-gestiones__composer">
                <Stack spacing={1.6}>
                  <Stack className="crm-surface-card__header">
                    <Stack className="crm-surface-card__header-main">
                      <Typography variant="overline" className="crm-surface-card__eyebrow">
                        {composerMode === 'promesa' ? 'Promesa' : 'Gestion'}
                      </Typography>
                      <Typography variant="subtitle1" className="crm-surface-card__title">
                        {composerMode === 'promesa' ? 'Registrar promesa' : 'Nueva gestion'}
                      </Typography>
                      <Typography variant="body2" className="crm-surface-card__subtitle">
                        {composerMode === 'promesa'
                          ? 'Captura el compromiso de pago y deja contexto operativo.'
                          : 'Documenta el contacto y su resultado en pocos campos.'}
                      </Typography>
                    </Stack>
                  </Stack>

                  {formError ? (
                    <Alert severity="error" onClose={() => onFormErrorClear && onFormErrorClear()}>
                      {formError}
                    </Alert>
                  ) : null}

                  {composerMode === 'promesa' && !promiseResult ? (
                    <Alert severity="warning">
                      No existe un resultado configurado para promesa en este portafolio.
                    </Alert>
                  ) : null}

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
                        inputRef={resultadoFieldRef}
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
                        inputRef={comentarioFieldRef}
                      />
                    </Box>
                  </FormSection>

                  {showPromiseFields ? (
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
                          required={requierePromesa}
                          inputProps={{ min: 0, step: '0.01' }}
                        />

                        <FormField
                          component={TextField}
                          label="Fecha promesa"
                          type="datetime-local"
                          value={safeForm.promesa_fecha}
                          onChange={(event) => updateField('promesa_fecha', event.target.value)}
                          required={requierePromesa}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Box>
                    </FormSection>
                  ) : null}

                  {composerMode === 'pago' && !paymentResult ? (
                    <Alert severity="info">
                      No existe un resultado preconfigurado para pago. Selecciona manualmente el
                      resultado correcto antes de registrar la gestión.
                    </Alert>
                  ) : null}

                  <FormActions spacing={1.2} className="crm-surface-card__action-row">
                    <Button variant="ghost" onClick={() => setComposerMode(null)}>
                      Cerrar
                    </Button>
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
            ) : (
              <Typography variant="body2" color="text.secondary">
                Usa una acción rápida para registrar una gestion, levantar promesa o enviar contacto.
              </Typography>
            )}
          </Stack>
        </Paper>
      )}

      {showHistory ? (
        <Paper variant="panel-sm">
          <Stack spacing={1.5}>
            <Stack className="crm-surface-card__header">
              <Stack className="crm-surface-card__header-main">
                <Typography variant="overline" className="crm-surface-card__eyebrow">
                  Bitácora
                </Typography>
                <Typography variant="subtitle1" className="crm-surface-card__title">
                  Historial operativo
                </Typography>
                <Typography variant="body2" className="crm-surface-card__subtitle">
                  Vista compacta para escaneo rápido por agente.
                </Typography>
              </Stack>
            </Stack>

            {!canViewGestiones ? (
              <Typography variant="body2" color="text.secondary">
                No tienes permisos para ver el historial de gestiones.
              </Typography>
            ) : gestionesError ? (
              <Alert
                severity="error"
                onClose={() => onGestionesErrorClear && onGestionesErrorClear()}
              >
                {gestionesError}
              </Alert>
            ) : safeGestiones.length === 0 && !gestionesLoading ? (
              <EmptyState
                title="Sin gestiones"
                description="Aun no hay gestiones registradas para este cliente."
                icon={null}
                dense
              />
            ) : (
              <Stack spacing={1}>
                <BaseTable
                  dense
                  columns={historyColumns}
                  rows={safeGestiones}
                  loading={gestionesLoading}
                />

                {gestionesHasNext ? (
                  <Box className="crm-gestiones__table-actions">
                    <Button variant="outlined" size="small" onClick={() => onLoadMore && onLoadMore()}>
                      Cargar mas
                    </Button>
                  </Box>
                ) : null}
              </Stack>
            )}
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}

const MemoizedGestionesWidget = memo(GestionesWidget);
MemoizedGestionesWidget.displayName = 'GestionesWidget';

export default MemoizedGestionesWidget;
