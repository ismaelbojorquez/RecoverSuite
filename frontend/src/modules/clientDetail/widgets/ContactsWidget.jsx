import { Paper, Skeleton, Stack, Typography } from '@mui/material';
import { memo } from 'react';
import EmptyState from '../../../components/EmptyState.jsx';
import { PageGrid } from '../../../components/layout/Page.jsx';

const normalizeContacts = (contacts) => ({
  phones: Array.isArray(contacts?.phones) ? contacts.phones : [],
  emails: Array.isArray(contacts?.emails) ? contacts.emails : [],
  addresses: Array.isArray(contacts?.addresses) ? contacts.addresses : []
});

const buildAddress = (address) => {
  if (!address) {
    return '';
  }

  const line = [address.linea1, address.linea2].filter(Boolean).join(' ');
  const cityLine = [address.ciudad, address.estado, address.codigo_postal]
    .filter(Boolean)
    .join(', ');
  const country = address.pais ? address.pais : '';

  return [line, cityLine, country].filter(Boolean).join(' · ');
};

const renderContactList = (items, emptyLabel, renderItem) => {
  if (!items || items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {emptyLabel}
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {items.map((item) => (
        <Typography key={item.id} variant="body2">
          {renderItem(item)}
        </Typography>
      ))}
    </Stack>
  );
};

function ContactsWidget({
  title = 'Contactos',
  contacts = { phones: [], emails: [], addresses: [] },
  loading = false,
  isReady = true
}) {
  const safeContacts = normalizeContacts(contacts);
  const contactsEmpty =
    safeContacts.phones.length === 0 &&
    safeContacts.emails.length === 0 &&
    safeContacts.addresses.length === 0;

  return (
    <Paper variant="panel-sm">
      <Stack spacing={2}>
        <Stack className="crm-surface-card__header">
          <Stack className="crm-surface-card__header-main">
            <Typography variant="overline" className="crm-surface-card__eyebrow">
              Contactabilidad
            </Typography>
            <Typography variant="subtitle1" className="crm-surface-card__title">
              {title}
            </Typography>
            <Typography variant="body2" className="crm-surface-card__subtitle">
              Telefonos, correos y direcciones agrupados para lectura rápida.
            </Typography>
          </Stack>
        </Stack>

        {!isReady && loading ? (
          <Stack spacing={1.5}>
            {Array.from({ length: 3 }).map((_, index) => (
              <Paper key={index} variant="outlined" className="crm-card-outline">
                <Stack spacing={1}>
                  <Skeleton width={120} />
                  <Skeleton width="70%" />
                  <Skeleton width="50%" />
                </Stack>
              </Paper>
            ))}
          </Stack>
        ) : contactsEmpty ? (
          <EmptyState
            title="Sin contactos"
            description="Aun no hay telefonos, emails o direcciones para este cliente."
            icon={null}
            dense
          />
        ) : (
          <PageGrid>
            <Paper variant="outlined" className="crm-card-outline">
              <Stack spacing={1.1}>
                <Stack spacing={0.25}>
                  <Typography variant="subtitle2" className="crm-text-strong">
                    Telefonos
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Numeros disponibles para contacto directo.
                  </Typography>
                </Stack>
                {renderContactList(safeContacts.phones, 'Sin telefonos.', (item) => item.telefono)}
              </Stack>
            </Paper>

            <Paper variant="outlined" className="crm-card-outline">
              <Stack spacing={1.1}>
                <Stack spacing={0.25}>
                  <Typography variant="subtitle2" className="crm-text-strong">
                    Emails
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Correos registrados para notificación o seguimiento.
                  </Typography>
                </Stack>
                {renderContactList(safeContacts.emails, 'Sin emails.', (item) => item.email)}
              </Stack>
            </Paper>

            <Paper variant="outlined" className="crm-card-outline">
              <Stack spacing={1.1}>
                <Stack spacing={0.25}>
                  <Typography variant="subtitle2" className="crm-text-strong">
                    Direcciones
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ubicaciones consolidadas del cliente.
                  </Typography>
                </Stack>
                {renderContactList(
                  safeContacts.addresses,
                  'Sin direcciones.',
                  (item) => buildAddress(item) || 'Direccion sin datos'
                )}
              </Stack>
            </Paper>
          </PageGrid>
        )}
      </Stack>
    </Paper>
  );
}

const MemoizedContactsWidget = memo(ContactsWidget);
MemoizedContactsWidget.displayName = 'ContactsWidget';

export default MemoizedContactsWidget;
