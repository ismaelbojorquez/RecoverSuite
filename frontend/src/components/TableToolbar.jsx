import {
  Box,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { Search, X } from 'lucide-react';
import IconRenderer from './ui/IconRenderer.jsx';

export default function TableToolbar({
  eyebrow,
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar',
  searchHelperText,
  searchAriaLabel = 'Buscar en tabla',
  onSearchClear,
  searchDisabled = false,
  filters,
  actions,
  meta
}) {
  const showSearch = typeof searchValue === 'string' && typeof onSearchChange === 'function';
  const showHeader = eyebrow || title || subtitle || actions;
  const showControls = showSearch || filters;

  return (
    <Box className="crm-table-toolbar">
      {showHeader ? (
        <Stack className="crm-table-toolbar__top">
          <Stack className="crm-table-toolbar__main">
            {eyebrow ? (
              <Typography variant="overline" className="crm-table-toolbar__eyebrow">
                {eyebrow}
              </Typography>
            ) : null}
            {title ? (
              <Typography variant="subtitle1" className="crm-table-toolbar__title">
                {title}
              </Typography>
            ) : null}
            {subtitle ? (
              <Typography variant="body2" className="crm-table-toolbar__subtitle">
                {subtitle}
              </Typography>
            ) : null}
          </Stack>
          {actions ? (
            <Stack direction="row" className="crm-table-toolbar__actions">
              {actions}
            </Stack>
          ) : null}
        </Stack>
      ) : null}

      {showControls ? (
        <Stack className="crm-table-toolbar__controls">
          {showSearch ? (
            <Box className="crm-table-toolbar__search">
              <TextField
                fullWidth
                size="small"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                helperText={searchHelperText}
                disabled={searchDisabled}
                className="crm-table-toolbar__search-field"
                inputProps={{ 'aria-label': searchAriaLabel }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconRenderer icon={Search} size="sm" />
                    </InputAdornment>
                  ),
                  endAdornment:
                    searchValue && onSearchClear ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={onSearchClear}
                          aria-label="Limpiar búsqueda"
                          edge="end"
                        >
                          <IconRenderer icon={X} size="sm" />
                        </IconButton>
                      </InputAdornment>
                    ) : null
                }}
              />
            </Box>
          ) : null}

          {filters ? (
            <Stack direction="row" className="crm-table-toolbar__filters">
              {filters}
            </Stack>
          ) : null}
        </Stack>
      ) : null}

      {meta ? (
        <Stack direction="row" className="crm-table-toolbar__meta">
          {meta}
        </Stack>
      ) : null}
    </Box>
  );
}
