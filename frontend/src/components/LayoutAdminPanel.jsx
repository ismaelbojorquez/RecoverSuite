import { AddOutlined, RefreshOutlined, ViewModuleOutlined } from '@mui/icons-material';
import { Button, Chip, Divider, FormControlLabel, Paper, Stack, Switch, Typography } from '@mui/material';
import { memo, useCallback, useMemo } from 'react';

const normalizeWidgets = (widgets) =>
  (Array.isArray(widgets) ? widgets : [])
    .filter((widget) => widget && widget.id)
    .map((widget) => ({
      id: String(widget.id),
      title: widget.title || String(widget.id),
      description: widget.description || '',
      active: Boolean(widget.active)
    }));

function LayoutAdminPanelComponent({
  widgets = [],
  disabled = false,
  onToggleWidget,
  onAddWidget,
  onResetLayout
}) {
  const safeWidgets = useMemo(() => normalizeWidgets(widgets), [widgets]);
  const inactiveCount = safeWidgets.filter((widget) => !widget.active).length;
  const handleReset = useCallback(() => {
    if (typeof onResetLayout === 'function') {
      onResetLayout();
    }
  }, [onResetLayout]);

  return (
    <Paper variant="panel-sm" className="crm-layout-admin-panel">
      <Stack spacing={2} className="crm-layout-admin-panel__content">
        <Stack className="crm-surface-card__header crm-surface-card__header--split">
          <Stack className="crm-surface-card__header-main">
            <Typography variant="overline" className="crm-surface-card__eyebrow">
              Configuración
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <ViewModuleOutlined fontSize="small" color="primary" />
              <Typography variant="subtitle1" className="crm-surface-card__title">
                Panel de layout
              </Typography>
            </Stack>
            <Typography variant="body2" className="crm-surface-card__subtitle">
              Activa u oculta widgets y ajusta el tablero antes de guardar.
            </Typography>
          </Stack>
          <Stack direction="row" className="crm-surface-card__actions">
            <Chip
              size="small"
              variant="outlined"
              color={inactiveCount > 0 ? 'warning' : 'success'}
              label={
                inactiveCount > 0
                  ? `${inactiveCount} oculto${inactiveCount === 1 ? '' : 's'}`
                  : 'Todos visibles'
              }
            />
          </Stack>
        </Stack>

        <Divider />

        <Stack spacing={1.25} className="crm-layout-admin-panel__list">
          {safeWidgets.map((widget) => (
            <Paper key={widget.id} variant="outlined" className="crm-layout-admin-panel__widget">
              <Stack spacing={1.25}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Stack spacing={0.35}>
                    <Typography variant="subtitle2" className="crm-text-strong">
                      {widget.title}
                    </Typography>
                    {widget.description ? (
                      <Typography variant="caption" color="text.secondary">
                        {widget.description}
                      </Typography>
                    ) : null}
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      size="small"
                      variant="outlined"
                      color={widget.active ? 'success' : 'default'}
                      label={widget.active ? 'Activo' : 'Inactivo'}
                    />
                    <FormControlLabel
                      className="crm-layout-admin-panel__switch"
                      label={null}
                      control={
                        <Switch
                          size="small"
                          checked={widget.active}
                          disabled={disabled}
                          onChange={(event) => {
                            if (typeof onToggleWidget === 'function') {
                              onToggleWidget(widget.id, event.target.checked);
                            }
                          }}
                        />
                      }
                    />
                  </Stack>
                </Stack>

                {!widget.active && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddOutlined />}
                    onClick={() => {
                      if (typeof onAddWidget === 'function') {
                        onAddWidget(widget.id);
                      }
                    }}
                    disabled={disabled}
                  >
                    Agregar al grid
                  </Button>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>

        <Divider />

        <Stack
          spacing={1}
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Typography variant="caption" color="text.secondary">
            {inactiveCount > 0
              ? `${inactiveCount} widget${inactiveCount === 1 ? '' : 's'} oculto${inactiveCount === 1 ? '' : 's'}.`
              : 'Todos los widgets estan visibles.'}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshOutlined />}
            onClick={handleReset}
            disabled={disabled}
          >
            Resetear layout
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

const LayoutAdminPanel = memo(LayoutAdminPanelComponent);
LayoutAdminPanel.displayName = 'LayoutAdminPanel';

export default LayoutAdminPanel;
