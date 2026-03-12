import {
  Box,
  CircularProgress,
  ClickAwayListener,
  Grow,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Popper,
  Stack,
  Typography
} from '@mui/material';
import {
  ChevronRight,
  CreditCard,
  Mail,
  Phone,
  Search as SearchIcon,
  UserRound
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../utils/api.js';
import { buildRoutePath } from '../routes/paths.js';
import useNavigation from '../hooks/useNavigation.js';
import EmptyState from './EmptyState.jsx';
import IconRenderer from './ui/IconRenderer.jsx';

const MIN_QUERY_LENGTH = 2;
const DEFAULT_LIMIT = 8;
const DEBOUNCE_MS = 300;

const typeLabels = {
  client: 'Cliente',
  phone: 'Telefono',
  email: 'Correo',
  credit: 'Credito'
};

const typeIcons = {
  client: UserRound,
  phone: Phone,
  email: Mail,
  credit: CreditCard
};

const buildSecondary = (result) => {
  if (result.type === 'credit') {
    return result.secondary || 'Credito';
  }

  if (result.type === 'phone') {
    return result.secondary || 'Cliente';
  }

  return result.secondary || '';
};

export default function GlobalSearch() {
  const anchorRef = useRef(null);
  const { navigate, pathname } = useNavigation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const portafolioId = useMemo(() => {
    const searchPart = String(pathname || '').split('?')[1] || '';
    const params = new URLSearchParams(searchPart);
    const parsed = Number.parseInt(params.get('portafolio_id'), 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [pathname]);

  const normalizedQuery = useMemo(() => query.trim(), [query]);
  const isQueryValid = normalizedQuery.length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!isQueryValid) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setOpen(true);
    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: normalizedQuery,
          limit: String(DEFAULT_LIMIT)
        });
        if (portafolioId) {
          params.set('portafolio_id', String(portafolioId));
        }
        const payload = await apiFetch(
          `/api/search?${params.toString()}`,
          {
            method: 'GET',
            signal: controller.signal
          },
          { silent: true }
        );
        const data = Array.isArray(payload?.data) ? payload.data : [];

        setResults(data);
        setOpen(true);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        if (err.name !== 'AbortError') {
          setResults([]);
          setOpen(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [normalizedQuery, portafolioId, isQueryValid]);

  const handleSelect = (result) => {
    const clientId = result?.client_id;
    if (!clientId) {
      return;
    }

    const target = buildRoutePath('clientDetail', { id: clientId });
    setOpen(false);
    setIsActive(false);
    navigate(target);
  };

  const handleFocus = () => {
    setIsActive(true);
    if (isQueryValid) {
      setOpen(true);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setIsActive(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      setIsActive(false);
    }
  };

  const hasResults = results.length > 0;
  const showEmptyState = isQueryValid && !loading && !hasResults;
  const popperId = open ? 'crm-global-search-panel' : undefined;

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <Box className="crm-global-search">
        <Paper
          ref={anchorRef}
          variant="outlined"
          className={[
            'crm-global-search__input-shell',
            isActive ? 'crm-global-search__input-shell--active' : ''
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <IconRenderer icon={SearchIcon} size="sm" className="crm-global-search__input-icon" />
          <InputBase
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder="Buscar por nombre, RFC, CURP, telefono, correo, no. cliente, no. credito o id externo"
            inputProps={{
              'aria-label': 'Buscar',
              'aria-controls': popperId,
              'aria-expanded': open
            }}
            className="crm-global-search__input"
          />
          {loading && <CircularProgress size={18} className="crm-global-search__spinner" />}
        </Paper>

        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          disablePortal
          transition
          id={popperId}
          className="crm-global-search__popper"
        >
          {({ TransitionProps }) => (
            <Grow {...TransitionProps} timeout={180}>
              <Paper className="crm-global-search__panel">
                {hasResults ? (
                  <List dense disablePadding className="crm-global-search__list">
                    {results.map((result) => {
                      const ResultIcon = typeIcons[result.type] || SearchIcon;
                      return (
                        <ListItemButton
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleSelect(result)}
                          className="crm-global-search__item"
                        >
                          <ListItemIcon className="crm-global-search__item-icon">
                            <IconRenderer icon={ResultIcon} size="sm" />
                          </ListItemIcon>
                          <ListItemText
                            primary={result.label}
                            secondary={buildSecondary(result)}
                            primaryTypographyProps={{ className: 'crm-text-strong' }}
                            secondaryTypographyProps={{ color: 'text.secondary' }}
                          />
                          <Box className="crm-global-search__item-meta">
                            <Typography
                              variant="caption"
                              className="crm-global-search__type-label"
                            >
                              {typeLabels[result.type] || result.type}
                            </Typography>
                            <IconRenderer icon={ChevronRight} size="sm" />
                          </Box>
                        </ListItemButton>
                      );
                    })}
                  </List>
                ) : showEmptyState ? (
                  <EmptyState
                    dense
                    title="Sin resultados"
                    description="Ajusta tu búsqueda o intenta con más caracteres."
                    icon={SearchIcon}
                  />
                ) : (
                  <Stack className="crm-global-search__state" spacing={0.5}>
                    <Typography variant="body2" className="crm-text-strong">
                      Buscando...
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Consultando datos del portafolio.
                    </Typography>
                  </Stack>
                )}
              </Paper>
            </Grow>
          )}
        </Popper>
      </Box>
    </ClickAwayListener>
  );
}
