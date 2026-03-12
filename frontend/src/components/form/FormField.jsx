import { FormControl, FormHelperText, TextField } from '@mui/material';

export default function FormField({
  component: Component = TextField,
  label,
  error,
  helperText,
  required,
  fullWidth = true,
  className = '',
  ...props
}) {
  const hasError = Boolean(error);
  const resolvedHelper = hasError ? String(error) : helperText;

  const isTextField = Component === TextField || Component.muiName === 'TextField';

  return (
    <FormControl
      fullWidth={fullWidth}
      error={hasError}
      className={['crm-form__field', className].filter(Boolean).join(' ')}
    >
      <Component
        label={label}
        required={required}
        error={hasError}
        helperText={isTextField ? resolvedHelper : undefined}
        fullWidth={fullWidth}
        {...props}
      />
      {!isTextField && resolvedHelper ? (
        <FormHelperText>{resolvedHelper}</FormHelperText>
      ) : null}
    </FormControl>
  );
}
