import { Box, Container, Paper } from '@mui/material';

export default function AuthLayout({ children }) {
  return (
    <Box className="crm-auth-screen">
      <Container maxWidth="sm">
        <Paper variant="auth" className="crm-auth-card">
          {children}
        </Paper>
      </Container>
    </Box>
  );
}
