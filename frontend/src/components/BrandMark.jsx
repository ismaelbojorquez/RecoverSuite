import { Box, Typography } from '@mui/material';

export default function BrandMark({ collapsed = false }) {
  return (
    <Box className="crm-brand">
      {!collapsed && (
        <Box className="crm-brand__copy">
          <Typography variant="subtitle1" className="crm-brand__text">
            CRM
          </Typography>
        </Box>
      )}
    </Box>
  );
}
