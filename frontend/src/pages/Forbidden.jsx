import { Paper, Stack, Typography, Button } from '@mui/material';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import { buildRoutePath } from '../routes/paths.js';
import useNavigation from '../hooks/useNavigation.js';

export default function Forbidden() {
  const { navigate } = useNavigation();

  return (
    <Page>
      <PageHeader
        title="Acceso restringido"
        subtitle="No tienes permisos para acceder a este recurso."
        breadcrumbs={[
          { label: 'Inicio', href: buildRoutePath('dashboard') },
          { label: '403' }
        ]}
      />
      <PageContent>
        <Paper variant="page">
          <Stack spacing={2}>
            <Typography variant="h5">403 - Sin permiso</Typography>
            <Typography variant="body2" color="text.secondary">
              Verifica tus roles y permisos con un administrador o regresa al panel.
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                onClick={() => navigate(buildRoutePath('dashboard'), { replace: true })}
              >
                Ir al panel
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate(buildRoutePath('login'), { replace: true })}
              >
                Cambiar de usuario
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </PageContent>
    </Page>
  );
}
