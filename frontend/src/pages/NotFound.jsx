import { Button, Stack } from '@mui/material';
import { SearchX } from 'lucide-react';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import EmptyState from '../components/EmptyState.jsx';
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
        <EmptyState
          eyebrow="404"
          title="Página no disponible"
          description="La ruta no existe o fue movida. Puedes volver al dashboard o regresar a la vista anterior."
          icon={SearchX}
          action={
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="contained"
                onClick={() => navigate(buildRoutePath('dashboard'), { replace: true })}
              >
                Ir al dashboard
              </Button>
              <Button variant="outlined" onClick={() => navigate(-1)}>
                Volver atrás
              </Button>
            </Stack>
          }
        />
      </PageContent>
    </Page>
  );
}
