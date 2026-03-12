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
          <Stack spacing={0.5}>
            <Typography variant="overline" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h5">{buildFullName(client)}</Typography>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                No. cliente
              </Typography>
              <Typography variant="body1">{client.numero_cliente || client.id}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                ID publico
              </Typography>
              <Typography variant="body1">{client.id}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                RFC
              </Typography>
              <Typography variant="body1">{client.rfc || '-'}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                CURP
              </Typography>
              <Typography variant="body1">{client.curp || '-'}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Creado
              </Typography>
              <Typography variant="body1">{formatDate(client.created_at)}</Typography>
            </Box>
          </Stack>

          <Divider />

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
