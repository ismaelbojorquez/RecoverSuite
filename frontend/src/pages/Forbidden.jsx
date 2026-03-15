import { Button, Stack } from '@mui/material';
import { ShieldAlert } from 'lucide-react';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import EmptyState from '../components/EmptyState.jsx';
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
        <EmptyState
          eyebrow="403"
          title="Sin permiso para continuar"
          description="Verifica tus roles con un administrador o vuelve al panel principal para seguir trabajando."
          icon={ShieldAlert}
          action={
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
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
          }
        />
      </PageContent>
    </Page>
  );
}
