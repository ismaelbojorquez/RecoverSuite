import {
  Call,
  DirectionsWalk,
  EmailOutlined,
  EditNote,
  ExpandLess,
  ExpandMore,
  Sms,
  WhatsApp
} from '@mui/icons-material';
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { memo, useMemo, useRef, useState } from 'react';
import BaseTable from '../../../components/BaseTable.jsx';
import EmptyState from '../../../components/EmptyState.jsx';
import GestionForm, { CONTACT_CHANNELS } from '../../../components/GestionForm.jsx';

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'short',
  timeStyle: 'short'
});

const CHANNEL_ICON_MAP = {
  LLAMADA: Call,
  WHATSAPP: WhatsApp,
  SMS: Sms,
  EMAIL: EmailOutlined,
  VISITA: DirectionsWalk
};

const defaultForm = {
  medio_contacto: '',
  dictamen_id: '',
  comentario: ''
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

const formatScore = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed.toFixed(0) : '-';
};

const formatActionLabel = (value) =>
  String(value || '')
    .split('_')
    .filter(Boolean)
    .join(' ')
    .trim() || '-';

const resolveRiskColor = (value) => {
  switch (String(value || '').toUpperCase()) {
    case 'BAJO':
      return 'success';
    case 'MEDIO':
      return 'warning';
    case 'ALTO':
      return 'error';
    default:
      return 'default';
  }
};

const resolveMediumMeta = (value) => {
  const channel = CONTACT_CHANNELS.find((item) => item.value === value);

  return channel
    ? {
        ...channel,
        icon: CHANNEL_ICON_MAP[channel.value] || EditNote
      }
    : {
    value: value || '',
    label: value || 'Sin medio',
    icon: EditNote
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

function ScoringSnapshotCard({ scoring }) {
  const safeScoring = scoring || {};
  const scoreItems = [
    { label: 'Global', value: formatScore(safeScoring.score_global) },
    { label: 'Llamada', value: formatScore(safeScoring.score_llamada) },
    { label: 'WhatsApp', value: formatScore(safeScoring.score_whatsapp) },
    { label: 'SMS', value: formatScore(safeScoring.score_sms) },
    { label: 'Email', value: formatScore(safeScoring.score_email) },
    { label: 'Visita', value: formatScore(safeScoring.score_visita) }
  ];

  const hasScoring = scoreItems.some((item) => item.value !== '-');

  return (
    <Paper variant="panel-sm">
      <Stack spacing={1.5}>
        <Stack className="crm-surface-card__header">
          <Stack className="crm-surface-card__header-main">
            <Typography variant="overline" className="crm-surface-card__eyebrow">
              Decision Engine
            </Typography>
            <Typography variant="subtitle1" className="crm-surface-card__title">
              Scoring actual del cliente
            </Typography>
            <Typography variant="body2" className="crm-surface-card__subtitle">
              Snapshot consolidado a partir de los dictamenes mas recientes.
            </Typography>
          </Stack>
        </Stack>

        {!hasScoring ? (
          <Alert severity="info">Aun no hay scoring consolidado para este cliente.</Alert>
        ) : null}

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {scoreItems.map((item) => (
            <Paper key={item.label} variant="outlined" sx={{ px: 1.5, py: 1, minWidth: 112 }}>
              <Typography variant="caption" color="text.secondary">
                {item.label}
              </Typography>
              <Typography variant="h6">{item.value}</Typography>
            </Paper>
          ))}
        </Stack>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip
            size="small"
            color={resolveRiskColor(safeScoring.scoring_riesgo_nivel)}
            label={safeScoring.scoring_riesgo_nivel || 'Sin riesgo'}
          />
          <Chip
            size="small"
            color={safeScoring.scoring_permitir_contacto ? 'success' : 'default'}
            variant={safeScoring.scoring_permitir_contacto ? 'filled' : 'outlined'}
            label={safeScoring.scoring_permitir_contacto ? 'Contacto permitido' : 'Contacto restringido'}
          />
          <Chip
            size="small"
            color={safeScoring.scoring_bloquear_cliente ? 'error' : 'default'}
            variant={safeScoring.scoring_bloquear_cliente ? 'filled' : 'outlined'}
            label={safeScoring.scoring_bloquear_cliente ? 'Cliente bloqueado' : 'Sin bloqueo'}
          />
          <Chip
            size="small"
            color={safeScoring.scoring_recomendar_reintento ? 'warning' : 'default'}
            variant={safeScoring.scoring_recomendar_reintento ? 'filled' : 'outlined'}
            label={
              safeScoring.scoring_recomendar_reintento
                ? 'Reintento recomendado'
                : 'Sin reintento'
            }
          />
        </Stack>
      </Stack>
    </Paper>
  );
}

function StrategySnapshotCard({ strategy }) {
  const safeStrategy = strategy || {};
  const contactPlan =
    safeStrategy.strategy_contact_plan &&
    typeof safeStrategy.strategy_contact_plan === 'object' &&
    !Array.isArray(safeStrategy.strategy_contact_plan)
      ? safeStrategy.strategy_contact_plan
      : {};
  const rankedChannels = Array.isArray(contactPlan.rankedChannels)
    ? contactPlan.rankedChannels
    : [];
  const reasonCodes = Array.isArray(safeStrategy.strategy_reason_codes)
    ? safeStrategy.strategy_reason_codes
    : [];
  const recommendedChannel = resolveMediumMeta(safeStrategy.strategy_recommended_channel);
  const hasStrategy =
    Boolean(safeStrategy.strategy_next_best_action) ||
    rankedChannels.length > 0 ||
    reasonCodes.length > 0;
  const remoteEffectivenessValue =
    contactPlan.remoteEffectiveness === undefined || contactPlan.remoteEffectiveness === null
      ? '-'
      : `${formatScore(contactPlan.remoteEffectiveness)}%`;

  return (
    <Paper variant="panel-sm">
      <Stack spacing={1.5}>
        <Stack className="crm-surface-card__header">
          <Stack className="crm-surface-card__header-main">
            <Typography variant="overline" className="crm-surface-card__eyebrow">
              Strategy Engine
            </Typography>
            <Typography variant="subtitle1" className="crm-surface-card__title">
              Next Best Action
            </Typography>
            <Typography variant="body2" className="crm-surface-card__subtitle">
              Recomendación omnicanal basada en historial, efectividad y elegibilidad de visita.
            </Typography>
          </Stack>
        </Stack>

        {!hasStrategy ? (
          <Alert severity="info">Aun no hay estrategia consolidada para este cliente.</Alert>
        ) : (
          <>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip
                size="small"
                color={safeStrategy.strategy_should_stop_contact ? 'error' : 'primary'}
                label={formatActionLabel(safeStrategy.strategy_next_best_action)}
              />
              {safeStrategy.strategy_recommended_channel ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Canal ${recommendedChannel.label}`}
                />
              ) : null}
              <Chip
                size="small"
                color={safeStrategy.strategy_should_escalate_visit ? 'warning' : 'default'}
                variant={safeStrategy.strategy_should_escalate_visit ? 'filled' : 'outlined'}
                label={
                  safeStrategy.strategy_should_escalate_visit
                    ? 'Escalar a visita'
                    : 'Sin escalamiento'
                }
              />
              <Chip
                size="small"
                color={safeStrategy.strategy_should_stop_contact ? 'error' : 'default'}
                variant={safeStrategy.strategy_should_stop_contact ? 'filled' : 'outlined'}
                label={
                  safeStrategy.strategy_should_stop_contact
                    ? 'Detener contacto'
                    : 'Contacto activo'
                }
              />
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, minmax(0, 1fr))' },
                gap: 1
              }}
            >
              {[
                {
                  label: 'Paso de secuencia',
                  value: safeStrategy.strategy_sequence_step ?? '-'
                },
                {
                  label: 'Racha remota',
                  value: contactPlan.remoteUnsuccessfulStreak ?? 0
                },
                {
                  label: 'Efectividad remota',
                  value: remoteEffectivenessValue
                },
                {
                  label: 'Visita elegible',
                  value: safeStrategy.strategy_visit_eligible ? 'Si' : 'No'
                }
              ].map((item) => (
                <Paper key={item.label} variant="outlined" sx={{ px: 1.5, py: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {item.label}
                  </Typography>
                  <Typography variant="h6">{item.value}</Typography>
                </Paper>
              ))}
            </Box>

            {rankedChannels.length > 0 ? (
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {rankedChannels.slice(0, 4).map((candidate) => (
                  <Chip
                    key={candidate.channel}
                    size="small"
                    variant="outlined"
                    label={`${resolveMediumMeta(candidate.channel).label} ${formatScore(
                      candidate.priorityScore
                    )}`}
                  />
                ))}
              </Stack>
            ) : null}

            {reasonCodes.length > 0 ? (
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                {reasonCodes.map((reason) => (
                  <Chip
                    key={reason}
                    size="small"
                    variant="outlined"
                    label={formatActionLabel(reason)}
                  />
                ))}
              </Stack>
            ) : null}
          </>
        )}
      </Stack>
    </Paper>
  );
}

function GestionesWidget({
  title = 'Gestiones',
  portafolioId = null,
  canLog = false,
  canViewGestiones = false,
  canConfigureDictamenes = false,
  form,
  setForm,
  onFormChange,
  formError = '',
  onFormErrorClear,
  savingGestion = false,
  onSubmit,
  gestiones = [],
  gestionesLoading = false,
  gestionesError = '',
  onGestionesErrorClear,
  gestionesHasNext = false,
  onLoadMore,
  onOpenDictamenes,
  clientScoring,
  showForm = true,
  showHistory = true
}) {
  const safeForm = resolveForm(form);
  const safeGestiones = Array.isArray(gestiones) ? gestiones : [];
  const dictamenFieldRef = useRef(null);
  const comentarioFieldRef = useRef(null);
  const [expandedNotes, setExpandedNotes] = useState([]);

  const updateField = (field, value) => {
    if (typeof onFormChange === 'function') {
      onFormChange(field, value);
      return;
    }

    if (typeof setForm === 'function') {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  };

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
        id: 'medio',
        label: 'Medio',
        minWidth: 118,
        render: (row) => {
          const medium = resolveMediumMeta(row.medio_contacto);
          const Icon = medium.icon;

          return (
            <Chip
              size="small"
              icon={<Icon fontSize="small" />}
              variant="outlined"
              label={medium.label}
            />
          );
        }
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
        minWidth: 220,
        render: (row) => (
          <Stack spacing={0.4}>
            <Typography variant="body2" className="crm-text-strong">
              {row.dictamen_nombre || 'Sin dictamen'}
            </Typography>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              <Chip
                size="small"
                color={resolveRiskColor(row.dictamen_nivel_riesgo)}
                label={row.dictamen_nivel_riesgo || 'Sin riesgo'}
              />
              {row.dictamen_tipo_contacto ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={formatActionLabel(row.dictamen_tipo_contacto)}
                />
              ) : null}
              <Chip
                size="small"
                variant="outlined"
                label={`Score ${formatScore(row.dictamen_score_global)}`}
              />
            </Stack>
          </Stack>
        )
      },
      {
        id: 'notas',
        label: 'Comentarios',
        minWidth: 300,
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
      <ScoringSnapshotCard scoring={clientScoring} />
      <StrategySnapshotCard strategy={clientScoring} />

      {showForm ? (
        <Paper variant="panel-sm">
          <Stack spacing={1.5}>
            <Stack className="crm-surface-card__header">
              <Stack className="crm-surface-card__header-main">
                <Typography variant="overline" className="crm-surface-card__eyebrow">
                  Registro operativo
                </Typography>
                <Typography variant="subtitle1" className="crm-surface-card__title">
                  {title}
                </Typography>
                <Typography variant="body2" className="crm-surface-card__subtitle">
                  Documenta el medio de contacto, el dictamen y el contexto de la gestion.
                </Typography>
              </Stack>
            </Stack>

            <Paper variant="outlined" className="crm-gestiones__composer">
              <Stack spacing={1.6}>
                <Stack className="crm-surface-card__header">
                  <Stack className="crm-surface-card__header-main">
                    <Typography variant="overline" className="crm-surface-card__eyebrow">
                      {resolveMediumMeta(safeForm.medio_contacto).label}
                    </Typography>
                    <Typography variant="subtitle1" className="crm-surface-card__title">
                      Nueva gestion
                    </Typography>
                    <Typography variant="body2" className="crm-surface-card__subtitle">
                      Cada gestion registra medio, dictamen y comentario operativo.
                    </Typography>
                  </Stack>
                </Stack>

                <GestionForm
                  portafolioId={portafolioId}
                  form={safeForm}
                  onFieldChange={updateField}
                  formError={formError}
                  onFormErrorClear={onFormErrorClear}
                  saving={savingGestion}
                  onSubmit={onSubmit}
                  onClose={undefined}
                  canConfigureDictamenes={canConfigureDictamenes}
                  onOpenDictamenes={onOpenDictamenes}
                  dictamenFieldRef={dictamenFieldRef}
                  comentarioFieldRef={comentarioFieldRef}
                />
              </Stack>
            </Paper>
          </Stack>
        </Paper>
      ) : null}

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
                  Vista compacta del seguimiento reciente del cliente.
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
