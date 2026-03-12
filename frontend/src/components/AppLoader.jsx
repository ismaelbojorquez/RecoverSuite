import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import BrandMark from './BrandMark.jsx';

export default function AppLoader({ message = 'Validando sesion segura...' }) {
  return (
    <Box className="crm-app-loader">
      <Stack spacing={2} alignItems="center">
        <BrandMark />
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" align="center">
          {message}
        </Typography>
      </Stack>
    </Box>
  );
}
