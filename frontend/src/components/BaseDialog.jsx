import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography
} from '@mui/material';

const SIZE_MAP = {
  sm: 'sm',
  md: 'md',
  lg: 'lg'
};

export default function BaseDialog({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  actions,
  children,
  dividers = true,
  maxWidth,
  ...props
}) {
  const resolvedMaxWidth = maxWidth || SIZE_MAP[size] || 'md';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={resolvedMaxWidth}
      className="crm-dialog"
      {...props}
    >
      {(title || subtitle) && (
        <DialogTitle className="crm-dialog__title">
          <Stack spacing={0.5}>
            {title ? <Typography variant="h6">{title}</Typography> : null}
            {subtitle ? (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            ) : null}
          </Stack>
        </DialogTitle>
      )}
      <DialogContent dividers={dividers} className="crm-dialog__content">
        {children}
      </DialogContent>
      {actions ? (
        <DialogActions className="crm-dialog__actions">{actions}</DialogActions>
      ) : null}
    </Dialog>
  );
}
