import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import { useState } from 'react';
import BrandMark from '../components/BrandMark.jsx';
import { buildRoutePath } from '../routes/paths.js';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import useAuth from '../hooks/useAuth.js';
import useNavigation from '../hooks/useNavigation.js';
import BaseForm from '../components/form/BaseForm.jsx';
import FormActions from '../components/form/FormActions.jsx';
import FormField from '../components/form/FormField.jsx';

export default function Login() {
  const { login } = useAuth();
  const { navigate } = useNavigation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: '', password: '' });

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    const username = form.username.trim();
    const password = form.password;

    if (!username || !password) {
      setError('Ingresa tus credenciales.');
      return;
    }

    setLoading(true);
    login({ username, password })
      .then(() => {
        navigate(buildRoutePath('dashboard'), { replace: true });
      })
      .catch((err) => {
        setError(err.message || 'No fue posible iniciar sesión.');
      })
      .finally(() => setLoading(false));
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
                title="Acceso seguro"
                subtitle="Ingresa con tus credenciales corporativas para continuar en RecoverSuite."
              />
            </Stack>

            {error && (
              <Alert severity="error" variant="outlined">
                {error}
              </Alert>
            )}

            <BaseForm onSubmit={handleSubmit} className="crm-auth-form">
              <Typography variant="caption" className="crm-auth-form__section-title">
                Credenciales corporativas
              </Typography>
              <FormField
                label="Correo"
                type="email"
                value={form.username}
                onChange={handleChange('username')}
                placeholder="tu.correo@dominio.com"
                autoComplete="username"
                required
              />
              <FormField
                label="Contraseña"
                type="password"
                value={form.password}
                onChange={handleChange('password')}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <FormActions className="crm-auth-form__actions">
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                >
                  Iniciar sesion
                </Button>
              </FormActions>
            </BaseForm>
          </Stack>
        </Paper>
      </PageContent>
    </Page>
  );
}
