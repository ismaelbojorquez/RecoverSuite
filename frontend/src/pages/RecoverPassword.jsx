import {
  Alert,
  Box,
  Button,
  Link,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import BrandMark from '../components/BrandMark.jsx';
import { buildRoutePath } from '../routes/paths.js';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import useNavigation from '../hooks/useNavigation.js';
import BaseForm from '../components/form/BaseForm.jsx';
import FormActions from '../components/form/FormActions.jsx';
import FormField from '../components/form/FormField.jsx';

export default function RecoverPassword() {
  const { navigate } = useNavigation();

  const handleSubmit = (event) => {
    event.preventDefault();
  };

  return (
    <Page>
      <PageContent>
        <Paper variant="auth" className="crm-auth-card">
          <Stack spacing={3}>
            <Stack spacing={1.5} className="crm-auth-header">
              <Box className="crm-auth-logo">
                <BrandMark />
              </Box>
              <PageHeader
                align="center"
                breadcrumbs={[{ label: 'Recuperar acceso' }]}
                title="Recuperar acceso"
                subtitle="Ingresa tu correo corporativo para recibir un enlace seguro."
              />
            </Stack>

            <Alert severity="info" variant="outlined">
              Funcionalidad en construccion. Este es un placeholder visual.
            </Alert>

            <BaseForm onSubmit={handleSubmit} className="crm-auth-form">
              <Typography variant="caption" className="crm-auth-form__section-title">
                Recuperación segura
              </Typography>
              <FormField
                label="Correo corporativo"
                type="email"
                placeholder="tu.nombre@empresa.com"
                autoComplete="username"
                required
              />
              <FormActions className="crm-auth-form__actions">
                <Button type="submit" variant="contained" size="large" fullWidth disabled>
                  Enviar enlace
                </Button>
              </FormActions>
            </BaseForm>

            <Stack spacing={1} className="crm-auth-footer">
              <Typography variant="caption" color="text.secondary">
                Si recuerdas tu contrasena, vuelve al inicio de sesion.
              </Typography>
              <Link
                href={buildRoutePath('login')}
                underline="hover"
                className="crm-auth-link"
                onClick={(event) => {
                  event.preventDefault();
                  navigate(buildRoutePath('login'));
                }}
              >
                Volver a iniciar sesion
              </Link>
            </Stack>
          </Stack>
        </Paper>
      </PageContent>
    </Page>
  );
}
