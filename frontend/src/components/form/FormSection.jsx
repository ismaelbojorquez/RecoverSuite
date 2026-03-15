import { Stack, Typography } from '@mui/material';

export default function FormSection({
  title,
  subtitle,
  children,
  className = '',
  ...props
}) {
  return (
    <Stack
      className={['crm-form__section', className].filter(Boolean).join(' ')}
      {...props}
    >
      {(title || subtitle) && (
        <Stack className="crm-form__section-header">
          {title ? (
            <Typography variant="subtitle1" className="crm-form__section-title">
              {title}
            </Typography>
          ) : null}
          {subtitle ? (
            <Typography variant="body2" className="crm-form__section-subtitle">
              {subtitle}
            </Typography>
          ) : null}
        </Stack>
      )}
      {children}
    </Stack>
  );
}
