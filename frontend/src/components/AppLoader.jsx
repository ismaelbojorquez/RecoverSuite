import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import BrandMark from './BrandMark.jsx';

export default function AppLoader({ message = 'Validando sesion segura...' }) {
  return (
    <Box className="crm-app-loader">
      <Stack className="crm-app-loader__panel">
        <BrandMark />
        <Box className="crm-app-loader__spinner-shell">
          <CircularProgress size={24} />
        </Box>
        <Typography variant="overline" className="crm-app-loader__eyebrow">
          RecoverSuite
        </Typography>
        <Typography variant="body2" align="center" className="crm-app-loader__message">
          {message}
        </Typography>
      </Stack>
    </Box>
  );
}
