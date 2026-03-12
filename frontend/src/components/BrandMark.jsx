import { Box, Typography } from '@mui/material';

export default function BrandMark({ collapsed = false }) {
  return (
    <Box className="crm-brand">
      <Box className="crm-brand__mark">
        <Box className="crm-brand__mark-core" />
      </Box>
      {!collapsed && (
        <Box className="crm-brand__copy">
          <Typography variant="subtitle1" className="crm-brand__text">
            RecoverSuite
          </Typography>
          <Typography variant="caption" className="crm-brand__tagline">
            Revenue Operations
          </Typography>
        </Box>
      )}
    </Box>
  );
}
