import { Box, Chip, Divider, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { memo } from 'react';

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

const buildFullName = (client) => {
  if (!client) {
    return '';
  }

  return [client.nombre, client.apellido_paterno, client.apellido_materno]
    .filter(Boolean)
    .join(' ');
};

const normalizeContacts = (contacts) => ({
  phones: Array.isArray(contacts?.phones) ? contacts.phones : [],
  emails: Array.isArray(contacts?.emails) ? contacts.emails : [],
  addresses: Array.isArray(contacts?.addresses) ? contacts.addresses : []
});

function ClientInfoWidget({
  client = null,
  contacts = { phones: [], emails: [], addresses: [] },
  credits = [],
  loading = false,
  title = 'Cliente'
}) {
  const safeContacts = normalizeContacts(contacts);
  const creditCount = Array.isArray(credits) ? credits.length : 0;

  return (
    <Paper variant="panel">
      {loading ? (
        <Stack spacing={1}>
          <Skeleton width={160} />
          <Skeleton variant="text" width="40%" />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            {Array.from({ length: 5 }).map((_, index) => (
              <Box key={index}>
                <Skeleton width={120} />
                <Skeleton width={80} />
              </Box>
            ))}
          </Stack>
        </Stack>
      ) : client ? (
        <Stack spacing={2}>
          <Stack className="crm-surface-card__header">
            <Stack className="crm-surface-card__header-main">
              <Typography variant="overline" className="crm-surface-card__eyebrow">
                {title}
              </Typography>
              <Typography variant="h5" className="crm-surface-card__title">
                {buildFullName(client)}
              </Typography>
              <Typography variant="body2" className="crm-surface-card__subtitle">
                Datos base de identificación y contexto de contactabilidad del cliente.
              </Typography>
            </Stack>
          </Stack>

          <Box className="crm-surface-card__meta-grid crm-surface-card__meta-grid--wide">
            <Box className="crm-surface-card__meta-item">
              <Typography variant="caption" className="crm-surface-card__meta-label">
                No. cliente
              </Typography>
              <Typography variant="body2" className="crm-surface-card__meta-value">
                {client.numero_cliente || client.id}
              </Typography>
            </Box>

            <Box className="crm-surface-card__meta-item">
              <Typography variant="caption" className="crm-surface-card__meta-label">
                ID publico
              </Typography>
              <Typography variant="body2" className="crm-surface-card__meta-value">
                {client.id}
              </Typography>
            </Box>

            <Box className="crm-surface-card__meta-item">
              <Typography variant="caption" className="crm-surface-card__meta-label">
                RFC
              </Typography>
              <Typography variant="body2" className="crm-surface-card__meta-value">
                {client.rfc || '-'}
              </Typography>
            </Box>

            <Box className="crm-surface-card__meta-item">
              <Typography variant="caption" className="crm-surface-card__meta-label">
                CURP
              </Typography>
              <Typography variant="body2" className="crm-surface-card__meta-value">
                {client.curp || '-'}
              </Typography>
            </Box>

            <Box className="crm-surface-card__meta-item">
              <Typography variant="caption" className="crm-surface-card__meta-label">
                Creado
              </Typography>
              <Typography variant="body2" className="crm-surface-card__meta-value">
                {formatDate(client.created_at)}
              </Typography>
            </Box>
          </Box>

          <Divider />

          <Stack direction="row" className="crm-surface-card__badge-row">
            <Chip label={`Creditos: ${creditCount}`} variant="outlined" />
            <Chip label={`Telefonos: ${safeContacts.phones.length}`} variant="outlined" />
            <Chip label={`Emails: ${safeContacts.emails.length}`} variant="outlined" />
            <Chip label={`Direcciones: ${safeContacts.addresses.length}`} variant="outlined" />
          </Stack>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Sin datos para mostrar.
        </Typography>
      )}
    </Paper>
  );
}

const MemoizedClientInfoWidget = memo(ClientInfoWidget);
MemoizedClientInfoWidget.displayName = 'ClientInfoWidget';

export default MemoizedClientInfoWidget;
