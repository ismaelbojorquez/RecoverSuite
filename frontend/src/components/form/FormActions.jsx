import { Stack } from '@mui/material';

export default function FormActions({
  children,
  align = 'flex-end',
  spacing = 1.5,
  className = '',
  ...props
}) {
  return (
    <Stack
      direction={{ xs: 'column-reverse', sm: 'row' }}
      spacing={spacing}
      justifyContent={align}
      className={['crm-form__actions', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </Stack>
  );
}
