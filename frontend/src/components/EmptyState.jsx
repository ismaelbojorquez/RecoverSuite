import { Box, Paper, Stack, Typography } from '@mui/material';
import { Inbox } from 'lucide-react';
import IconRenderer from './ui/IconRenderer.jsx';

export default function EmptyState({
  title = 'Sin datos',
  description = 'No hay informacion disponible.',
  icon: Icon = Inbox,
  action,
  dense = false,
  eyebrow,
  className = ''
}) {
  return (
    <Box className={['crm-empty-state', className].filter(Boolean).join(' ')}>
      <Paper variant="outlined" className="crm-empty-state__panel">
        <Stack spacing={dense ? 1.25 : 1.6} alignItems="center">
          {Icon ? (
            <Box className="crm-empty-state__icon-shell" aria-hidden="true">
              <IconRenderer
                icon={Icon}
                size={dense ? 'md' : 'lg'}
                className="crm-empty-state__icon"
              />
            </Box>
          ) : null}
          <Stack alignItems="center" className="crm-empty-state__copy">
            {eyebrow ? (
              <Typography variant="overline" className="crm-empty-state__eyebrow">
                {eyebrow}
              </Typography>
            ) : null}
            <Typography variant="h6" className="crm-empty-state__title">
              {title}
            </Typography>
            {description ? (
              <Typography
                variant="body2"
                align="center"
                className="crm-empty-state__description"
              >
                {description}
              </Typography>
            ) : null}
          </Stack>
          {action ? <Box className="crm-empty-state__action">{action}</Box> : null}
        </Stack>
      </Paper>
    </Box>
  );
}
