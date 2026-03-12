import { Paper, Stack, Typography } from '@mui/material';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import { buildRoutePath } from '../routes/paths.js';

export default function ComingSoon({ route }) {
  const title = route?.nav?.label || route?.title || 'Modulo';
  const breadcrumbs = [
    { label: 'Inicio', href: buildRoutePath('dashboard') },
    { label: title }
  ];

  return (
    <Page>
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={title}
        subtitle="Este modulo estara disponible pronto."
      />
      <PageContent>
        <Paper variant="page">
          <Stack spacing={1.5}>
            <Typography variant="overline" color="text.secondary">
              Proximamente
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Estamos preparando flujos operativos, permisos y auditoria para
              esta seccion.
            </Typography>
          </Stack>
        </Paper>
      </PageContent>
    </Page>
  );
}
