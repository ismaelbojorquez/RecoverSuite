import { Button, Paper, Stack, Typography } from '@mui/material';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import { buildRoutePath } from '../routes/paths.js';
import useNavigation from '../hooks/useNavigation.js';

export default function NotFound() {
  const { navigate } = useNavigation();

  return (
    <Page>
      <PageHeader
        title="No encontramos lo que buscabas"
        subtitle="La ruta solicitada no existe o fue movida."
        breadcrumbs={[
          { label: 'Inicio', href: buildRoutePath('dashboard') },
          { label: '404' }
        ]}
      />
      <PageContent>
        <Paper variant="page">
          <Stack spacing={2}>
            <Typography variant="h5">404 - Pagina no disponible</Typography>
            <Typography variant="body2" color="text.secondary">
              Asegurate de que la direccion sea correcta o regresa al panel para continuar
              navegando.
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                onClick={() => navigate(buildRoutePath('dashboard'), { replace: true })}
              >
                Ir al dashboard
              </Button>
              <Button variant="outlined" onClick={() => navigate(-1)}>
                Volver atras
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </PageContent>
    </Page>
  );
}
