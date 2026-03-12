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
        <Typography variant="subtitle1">{title}</Typography>

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
              <Stack spacing={1}>
                <Typography variant="subtitle1">Telefonos</Typography>
                {renderContactList(safeContacts.phones, 'Sin telefonos.', (item) => item.telefono)}
              </Stack>
            </Paper>

            <Paper variant="outlined" className="crm-card-outline">
              <Stack spacing={1}>
                <Typography variant="subtitle1">Emails</Typography>
                {renderContactList(safeContacts.emails, 'Sin emails.', (item) => item.email)}
              </Stack>
            </Paper>

            <Paper variant="outlined" className="crm-card-outline">
              <Stack spacing={1}>
                <Typography variant="subtitle1">Direcciones</Typography>
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
