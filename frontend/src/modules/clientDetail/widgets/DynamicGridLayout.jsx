import { DragIndicator } from '@mui/icons-material';
import { Box, Paper, Skeleton, Stack, Typography, useTheme } from '@mui/material';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import EmptyState from '../../../components/EmptyState.jsx';
import WidgetRegistry from './WidgetRegistry.js';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const BREAKPOINTS = {
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480,
  xxs: 0
};

const COLS = {
  lg: 12,
  md: 10,
  sm: 6,
  xs: 4,
  xxs: 2
};

const normalizeWidgets = (widgets) =>
  (Array.isArray(widgets) ? widgets : [])
    .filter((widget) => widget && widget.id && widget.widgetKey)
    .map((widget) => ({
      id: String(widget.id),
      widgetKey: String(widget.widgetKey),
      title: widget.title || String(widget.id),
      props: widget.props || {}
    }));

const spacingToPixels = (theme, units) => {
  const value = theme.spacing(units);
  const numeric = Number.parseFloat(String(value).replace('px', ''));
  return Number.isFinite(numeric) ? numeric : units * 8;
};

const LayoutLoadingSkeleton = () => (
  <Stack spacing={2} className="crm-dynamic-grid__skeleton">
    <Paper variant="panel-sm">
      <Stack spacing={1.5}>
        <Skeleton variant="text" width="28%" height={34} animation="wave" />
        <Skeleton variant="text" width="54%" animation="wave" />
      </Stack>
    </Paper>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <Paper variant="panel-sm" className="crm-dynamic-grid__skeleton-card crm-dynamic-grid__skeleton-card--large">
        <Stack spacing={1.25}>
          <Skeleton variant="text" width="42%" animation="wave" />
          <Skeleton variant="rounded" height={128} animation="wave" />
          <Skeleton variant="text" width="80%" animation="wave" />
        </Stack>
      </Paper>
      <Stack spacing={2} className="crm-dynamic-grid__skeleton-col">
        <Paper variant="panel-sm" className="crm-dynamic-grid__skeleton-card">
          <Stack spacing={1}>
            <Skeleton variant="text" width="50%" animation="wave" />
            <Skeleton variant="text" width="90%" animation="wave" />
            <Skeleton variant="text" width="70%" animation="wave" />
          </Stack>
        </Paper>
        <Paper variant="panel-sm" className="crm-dynamic-grid__skeleton-card">
          <Stack spacing={1}>
            <Skeleton variant="text" width="44%" animation="wave" />
            <Skeleton variant="rounded" height={92} animation="wave" />
          </Stack>
        </Paper>
      </Stack>
    </Stack>
  </Stack>
);

function DynamicGridLayoutComponent({
  widgets = [],
  layouts = {},
  onLayoutsChange,
  isEditable = false,
  loading = false
}) {
  const theme = useTheme();
  const safeWidgets = useMemo(() => normalizeWidgets(widgets), [widgets]);
  const rafRef = useRef(null);
  const queuedLayoutsRef = useRef(null);

  const emitLayoutsChange = useCallback(
    (nextLayouts) => {
      if (typeof onLayoutsChange === 'function') {
        onLayoutsChange(nextLayouts || {});
      }
    },
    [onLayoutsChange]
  );

  const flushQueuedLayouts = useCallback(() => {
    if (!queuedLayoutsRef.current) {
      return;
    }

    const queued = queuedLayoutsRef.current;
    queuedLayoutsRef.current = null;
    emitLayoutsChange(queued);
  }, [emitLayoutsChange]);

  const queueLayouts = useCallback(
    (nextLayouts) => {
      queuedLayoutsRef.current = nextLayouts || {};
      if (rafRef.current) {
        return;
      }

      if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
        flushQueuedLayouts();
        return;
      }

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        flushQueuedLayouts();
      });
    },
    [flushQueuedLayouts]
  );

  useEffect(
    () => () => {
      if (typeof window !== 'undefined' && rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
    },
    []
  );

  if (loading) {
    return <LayoutLoadingSkeleton />;
  }

  if (safeWidgets.length === 0) {
    return (
      <Paper variant="panel-sm">
        <EmptyState
          dense
          eyebrow="Layout"
          title="Sin widgets"
          description="No hay widgets registrados para este dashboard."
          icon={null}
        />
      </Paper>
    );
  }

  const margin = spacingToPixels(theme, 2);
  const rowHeight = spacingToPixels(theme, 3.5);

  return (
    <Box className="crm-dynamic-grid">
      <ResponsiveGridLayout
        className="crm-dynamic-grid__layout"
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        margin={[margin, margin]}
        containerPadding={[0, 0]}
        rowHeight={rowHeight}
        isDraggable={isEditable}
        isResizable={isEditable}
        useCSSTransforms
        isBounded
        draggableHandle={isEditable ? '.crm-dynamic-grid__drag-handle' : undefined}
        draggableCancel={
          '.MuiButtonBase-root, .MuiInputBase-root, .MuiFormControl-root, input, textarea, select, button, a'
        }
        compactType="vertical"
        preventCollision={false}
        resizeHandles={['se']}
        onLayoutChange={(_, allLayouts) => {
          queueLayouts(allLayouts || {});
        }}
      >
        {safeWidgets.map((widget) => {
          const WidgetComponent = WidgetRegistry[widget.widgetKey];

          if (!WidgetComponent) {
            return (
              <Box key={widget.id} className="crm-dynamic-grid__item">
                <Paper variant="panel-sm">
                  <EmptyState
                    dense
                    eyebrow="Widget"
                    title="Widget no registrado"
                    description={widget.widgetKey}
                    icon={null}
                  />
                </Paper>
              </Box>
            );
          }

          return (
            <Box key={widget.id} className="crm-dynamic-grid__item">
              {isEditable && (
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="space-between"
                  className="crm-dynamic-grid__drag-handle"
                >
                  <Typography variant="caption" color="text.secondary" className="crm-label--subdued">
                    {widget.title}
                  </Typography>
                  <DragIndicator fontSize="small" />
                </Stack>
              )}
              <WidgetComponent {...widget.props} />
            </Box>
          );
        })}
      </ResponsiveGridLayout>
    </Box>
  );
}

const DynamicGridLayout = memo(DynamicGridLayoutComponent);
DynamicGridLayout.displayName = 'DynamicGridLayout';

export default DynamicGridLayout;
