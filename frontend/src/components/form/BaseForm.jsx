import { Stack } from '@mui/material';

export default function BaseForm({
  children,
  onSubmit,
  spacing = 2,
  autoComplete = 'off',
  className = '',
  ...props
}) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.(event);
  };

  return (
    <Stack
      component="form"
      onSubmit={handleSubmit}
      spacing={spacing}
      autoComplete={autoComplete}
      className={['crm-form', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </Stack>
  );
}
