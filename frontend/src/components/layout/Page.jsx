import { Box, Breadcrumbs, Link, Stack, Typography } from '@mui/material';
import useNavigation from '../../hooks/useNavigation.js';

export const Page = ({ children }) => (
  <Box className="crm-page">{children}</Box>
);

export const PageContent = ({ children }) => (
  <Box className="crm-page__content">{children}</Box>
);

export const PageSection = ({ children, dense = false }) => (
  <Box
    className={[
      'crm-page__section',
      dense ? 'crm-page__section--dense' : ''
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </Box>
);

const renderBreadcrumbs = (items, onNavigate) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <Box className="crm-page__breadcrumbs-shell">
      <Breadcrumbs
        separator="›"
        className="crm-page__breadcrumbs"
        aria-label="breadcrumb"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          if (isLast || !item.href) {
            return (
              <Typography
                key={`${item.label}-${index}`}
                variant="caption"
                color="text.secondary"
                className="crm-page__breadcrumb-current"
              >
                {item.label}
              </Typography>
            );
          }

          return (
            <Link
              key={`${item.label}-${index}`}
              href={item.href}
              underline="hover"
              className="crm-page__breadcrumb-link"
              variant="caption"
              onClick={(event) => {
                if (!onNavigate) return;
                const isModified =
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey ||
                  (typeof event.button === 'number' && event.button !== 0);
                if (isModified) {
                  return;
                }
                event.preventDefault();
                onNavigate(item.href);
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};

export const PageHeader = ({
  eyebrow,
  title,
  subtitle,
  actions,
  breadcrumbs,
  align = 'left'
}) => {
  const { navigate } = useNavigation();

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', md: 'flex-start' }}
      className={[
        'crm-page__header',
        align === 'center' ? 'crm-page__header--center' : ''
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Stack className="crm-page__header-copy">
        {breadcrumbs ? renderBreadcrumbs(breadcrumbs, navigate) : null}
        {eyebrow && (
          <Typography
            variant="overline"
            color="text.secondary"
            className="crm-page__eyebrow"
          >
            {eyebrow}
          </Typography>
        )}
        {title && (
          <Typography variant="h4" className="crm-page-title">
            {title}
          </Typography>
        )}
        {subtitle && (
          <Typography variant="body2" color="text.secondary" className="crm-page-subtitle">
            {subtitle}
          </Typography>
        )}
      </Stack>
      {actions && (
        <Stack
          direction="row"
          alignItems="center"
          className="crm-page__header-actions"
        >
          {actions}
        </Stack>
      )}
    </Stack>
  );
};

export const PageGrid = ({ children }) => (
  <Box className="crm-page-grid">{children}</Box>
);

export const PageFooter = ({ children }) => (
  <Box className="crm-page__footer">{children}</Box>
);
