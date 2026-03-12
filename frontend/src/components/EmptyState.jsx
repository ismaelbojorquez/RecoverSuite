import { Box, Stack, Typography } from '@mui/material';
import { Inbox } from 'lucide-react';
import IconRenderer from './ui/IconRenderer.jsx';

export default function EmptyState({
  title = 'Sin datos',
  description = 'No hay informacion disponible.',
  icon: Icon = Inbox,
  action,
  dense = false
}) {
  return (
    <Box className="crm-empty-state">
      <Stack spacing={dense ? 1 : 1.5} alignItems="center">
        {Icon ? <IconRenderer icon={Icon} size={dense ? 'md' : 'lg'} className="crm-empty-state__icon" /> : null}
        <Typography variant="h6">{title}</Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary" align="center">
            {description}
          </Typography>
        ) : null}
        {action ? <Box>{action}</Box> : null}
      </Stack>
    </Box>
  );
}
