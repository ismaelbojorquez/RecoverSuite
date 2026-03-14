import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Link
} from '@mui/material';
import { useState } from 'react';
import BrandMark from '../components/BrandMark.jsx';
import { buildRoutePath } from '../routes/paths.js';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import useAuth from '../hooks/useAuth.js';
import useNavigation from '../hooks/useNavigation.js';

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
        <Stack spacing={3}>
          <Stack spacing={1.5} className="crm-auth-header">
            <PageHeader
              align="center"
              title="CRM"
            />
          </Stack>

          {error && (
            <Alert severity="error" variant="outlined">
              {error}
            </Alert>
          )}

          <Stack component="form" spacing={2} onSubmit={handleSubmit}>
            <TextField
            label="Correo"
            type="email"
            value={form.username}
            onChange={handleChange('username')}
            placeholder="tu.correo@dominio.com"
            autoComplete="username"
            required
              fullWidth
            />
            <TextField
              label="Contraseña"
              type="password"
              value={form.password}
              onChange={handleChange('password')}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              fullWidth
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
            >
              Iniciar sesion
            </Button>
          </Stack>
        </Stack>
      </PageContent>
    </Page>
  );
}
