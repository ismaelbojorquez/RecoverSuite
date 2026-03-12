import { Stack } from '@mui/material';

export default function BaseForm({
  children,
  onSubmit,
  spacing = 2,
  autoComplete = 'off',
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
      className="crm-form"
      {...props}
    >
      {children}
    </Stack>
  );
}
