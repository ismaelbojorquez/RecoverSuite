import { Stack } from '@mui/material';

export default function FormActions({
  children,
  align = 'flex-end',
  spacing = 1.5,
  ...props
}) {
  return (
    <Stack
      direction="row"
      spacing={spacing}
      justifyContent={align}
      className="crm-form__actions"
      {...props}
    >
      {children}
    </Stack>
  );
}
