import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu as MenuIcon,
  MenuItem,
  Stack,
  Tooltip,
  Toolbar,
  Typography,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  MoonStar,
  Plus,
  Rocket,
  Sparkles,
  Sun,
  Upload,
  UserRound
} from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import BrandMark from '../components/BrandMark.jsx';
import Can from '../components/Can.jsx';
import GlobalSearch from '../components/GlobalSearch.jsx';
import IconRenderer from '../components/ui/IconRenderer.jsx';
import usePermissions from '../hooks/usePermissions.js';
import { LAYOUTS, navSections, routes } from '../routes/router.js';
import { buildRoutePath } from '../routes/paths.js';
import useAuth from '../hooks/useAuth.js';
import useNavigation from '../hooks/useNavigation.js';
import { useThemeMode } from '../theme.js';

const quickActionCatalog = [
  {
    id: 'dashboard',
    label: 'Abrir dashboard',
    description: 'Vista ejecutiva principal',
    routeId: 'dashboard',
    permission: 'dashboard.read',
    icon: Rocket
  },
  {
    id: 'portfolios',
    label: 'Gestionar portafolios',
    description: 'Administrar portafolios activos',
    routeId: 'portfolios',
    permission: 'portfolios.read',
    icon: Sparkles
  },
  {
    id: 'creditImport',
    label: 'Importar información',
    description: 'Cargar datos masivos',
    routeId: 'creditImport',
    permission: 'imports.write',
    icon: Upload
  }
];

const notificationFeed = [
  {
    id: 'jobs-01',
    title: 'Importación finalizada',
    detail: 'Se procesaron 1,284 registros correctamente.',
    unread: true
  },
  {
    id: 'audit-01',
    title: 'Nuevo evento de auditoría',
    detail: 'Actualización de permisos en grupo Administradores.',
    unread: true
  },
  {
    id: 'system-01',
    title: 'Sincronización diaria completada',
    detail: 'Todos los catálogos quedaron actualizados.',
    unread: false
  }
];

const buildInitials = (name) =>
  (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';

const buildNavSections = (routeList) => {
  const sectionMap = new Map(
    navSections.map((section) => [section.id, { ...section, items: [] }])
  );

  routeList.forEach((route) => {
    if (!route.nav || route.nav.hidden) {
      return;
    }

    const section = sectionMap.get(route.nav.section);
    if (!section) {
      return;
    }

    section.items.push({
      ...route.nav,
      id: route.id,
      path: route.path,
      permission: route.permission
    });
  });

  return Array.from(sectionMap.values())
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((section) => ({
      ...section,
      items: section.items.sort((a, b) => (a.order || 0) - (b.order || 0))
    }))
    .filter((section) => section.items.length > 0);
};

const NAV_COLLAPSE_KEY = 'crm-nav-collapsed';

const readCollapsePref = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  const stored = window.localStorage.getItem(NAV_COLLAPSE_KEY);
  return stored === 'true';
};

export default function AppLayout({ children }) {
  const theme = useTheme();
  const { isDarkMode, toggleThemeMode } = useThemeMode();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [isCollapsed, setIsCollapsed] = useState(readCollapsePref);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [quickMenuAnchor, setQuickMenuAnchor] = useState(null);
  const [notificationMenuAnchor, setNotificationMenuAnchor] = useState(null);
  const { user, logout } = useAuth();
  const { pathname, navigate } = useNavigation();
  const currentPath = pathname.split('?')[0];
  const { hasPermission } = usePermissions();

  const appRoutes = useMemo(
    () => routes.filter((route) => route.layout === LAYOUTS.app),
    []
  );
  const navStructure = useMemo(() => buildNavSections(appRoutes), [appRoutes]);

  const displayUser = useMemo(() => {
    const name = user?.name || user?.nombre || user?.username || user?.email;
    const email = user?.email || user?.username;
    const role = (user?.roles && user.roles[0]) || 'Usuario';

    return {
      name: name || 'Usuario activo',
      email: email || '',
      role
    };
  }, [user]);

  const visibleSections = useMemo(
    () =>
      navStructure
        .map((section) => ({
          ...section,
          items: section.items.filter(
            (item) => !item.permission || hasPermission(item.permission)
          )
        }))
        .filter((section) => section.items.length > 0),
    [hasPermission, navStructure]
  );

  const visibleQuickActions = useMemo(
    () =>
      quickActionCatalog.filter(
        (action) => !action.permission || hasPermission(action.permission)
      ),
    [hasPermission]
  );

  const unreadNotificationCount = useMemo(
    () => notificationFeed.filter((entry) => entry.unread).length,
    []
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(NAV_COLLAPSE_KEY, String(isCollapsed));
    }
  }, [isCollapsed]);

  const toggleCollapse = () => setIsCollapsed((prev) => !prev);
  const toggleMobile = () => setMobileOpen((prev) => !prev);

  const handleOpenUserMenu = (event) => setUserMenuAnchor(event.currentTarget);
  const handleCloseUserMenu = () => setUserMenuAnchor(null);

  const handleOpenQuickMenu = (event) => setQuickMenuAnchor(event.currentTarget);
  const handleCloseQuickMenu = () => setQuickMenuAnchor(null);

  const handleOpenNotificationMenu = (event) =>
    setNotificationMenuAnchor(event.currentTarget);
  const handleCloseNotificationMenu = () => setNotificationMenuAnchor(null);

  const handleOpenProfile = () => {
    handleCloseUserMenu();
    navigate(buildRoutePath('profile'));
  };

  const handleLogout = () => {
    handleCloseUserMenu();
    logout();
  };

  const handleQuickAction = (routeId) => {
    handleCloseQuickMenu();
    navigate(buildRoutePath(routeId));
  };

  const isUserMenuOpen = Boolean(userMenuAnchor);
  const isQuickMenuOpen = Boolean(quickMenuAnchor);
  const isNotificationMenuOpen = Boolean(notificationMenuAnchor);

  const drawerContent = (
    <Box className="crm-app-shell__drawer-content">
      <Box
        className={[
          'crm-app-shell__drawer-header',
          isCollapsed ? 'crm-app-shell__drawer-header--collapsed' : ''
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <BrandMark collapsed={isCollapsed} />
        {isDesktop && (
          <IconButton
            onClick={toggleCollapse}
            size="small"
            aria-label="Colapsar sidebar"
          >
            <IconRenderer icon={isCollapsed ? ChevronRight : ChevronLeft} size="sm" />
          </IconButton>
        )}
      </Box>
      <Divider className="crm-app-shell__drawer-divider" />
      <List
        className={[
          'crm-app-shell__nav-list',
          isCollapsed ? 'crm-app-shell__nav-list--collapsed' : ''
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {visibleSections.map((section, sectionIndex) => (
          <Fragment key={section.id}>
            {!isCollapsed && (
              <ListSubheader disableSticky className="crm-app-shell__section-title">
                {section.label}
              </ListSubheader>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path &&
                (currentPath === item.path || currentPath.startsWith(`${item.path}/`));

              return (
                <Tooltip
                  key={`${section.id}-${item.label}`}
                  title={isCollapsed ? item.label : ''}
                  placement="right"
                  arrow
                >
                  <ListItemButton
                    className={[
                      'crm-app-shell__nav-item',
                      isCollapsed ? 'crm-app-shell__nav-item--collapsed' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    data-permission={item.permission}
                    selected={isActive}
                    disabled={Boolean(item.disabled)}
                    onClick={() => {
                      if (item.path && !item.disabled) {
                        navigate(item.path);
                        if (!isDesktop) {
                          setMobileOpen(false);
                        }
                      }
                    }}
                  >
                    <ListItemIcon
                      className={[
                        'crm-app-shell__nav-icon',
                        isCollapsed ? 'crm-app-shell__nav-icon--collapsed' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <Box className="crm-app-shell__nav-icon-shell">
                        <IconRenderer icon={Icon} size="sm" />
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      className={[
                        'crm-app-shell__nav-copy',
                        isCollapsed ? 'crm-app-shell__nav-copy--collapsed' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      primary={item.label}
                      secondary={item.secondary}
                      primaryTypographyProps={{ className: 'crm-text-medium' }}
                      secondaryTypographyProps={{ className: 'crm-nav-item__secondary' }}
                    />
                  </ListItemButton>
                </Tooltip>
              );
            })}
            {sectionIndex < visibleSections.length - 1 && (
              <Divider className="crm-app-shell__section-divider" />
            )}
          </Fragment>
        ))}
      </List>
    </Box>
  );

  return (
    <Box className="crm-app-shell">
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        className={[
          'crm-app-bar',
          isDesktop
            ? isCollapsed
              ? 'crm-app-bar--collapsed'
              : 'crm-app-bar--expanded'
            : 'crm-app-bar--mobile'
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Toolbar className="crm-app-bar__toolbar" disableGutters>
          <Container maxWidth="lg" className="crm-app-bar__inner">
            <Stack direction="row" spacing={1.5} alignItems="center" className="crm-app-bar__left">
              {!isDesktop && (
                <IconButton
                  edge="start"
                  color="inherit"
                  onClick={toggleMobile}
                  aria-label="Abrir navegación"
                >
                  <IconRenderer icon={MenuIcon} size="sm" />
                </IconButton>
              )}
              <Box className="crm-app-bar__search">
                <Can permission="search.read">
                  <GlobalSearch />
                </Can>
              </Box>
            </Stack>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              className="crm-app-bar__user-area"
            >
              <Button
                color="inherit"
                variant="outlined"
                startIcon={<IconRenderer icon={Plus} size="sm" />}
                onClick={handleOpenQuickMenu}
                className="crm-app-bar__quick-trigger"
              >
                Acciones
              </Button>
              <Menu
                id="crm-quick-actions-menu"
                anchorEl={quickMenuAnchor}
                open={isQuickMenuOpen}
                onClose={handleCloseQuickMenu}
                PaperProps={{ className: 'crm-app-bar__menu crm-app-bar__quick-menu' }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                {visibleQuickActions.length === 0 ? (
                  <MenuItem disabled>No hay acciones disponibles</MenuItem>
                ) : (
                  visibleQuickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <MenuItem
                        key={action.id}
                        className="crm-app-bar__menu-item"
                        onClick={() => handleQuickAction(action.routeId)}
                      >
                        <ListItemIcon>
                          <IconRenderer icon={Icon} size="sm" />
                        </ListItemIcon>
                        <ListItemText primary={action.label} secondary={action.description} />
                      </MenuItem>
                    );
                  })
                )}
              </Menu>

              <Tooltip title="Notificaciones" arrow>
                <IconButton
                  color="inherit"
                  onClick={handleOpenNotificationMenu}
                  className="crm-app-bar__notification"
                  aria-label="Notificaciones"
                >
                  <Badge
                    badgeContent={unreadNotificationCount}
                    color="primary"
                    className="crm-app-bar__notification-badge"
                  >
                    <IconRenderer icon={Bell} size="sm" />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Menu
                id="crm-notification-menu"
                anchorEl={notificationMenuAnchor}
                open={isNotificationMenuOpen}
                onClose={handleCloseNotificationMenu}
                PaperProps={{ className: 'crm-app-bar__menu crm-app-bar__notification-menu' }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                {notificationFeed.map((entry) => (
                  <MenuItem
                    key={entry.id}
                    className="crm-app-bar__menu-item"
                    onClick={handleCloseNotificationMenu}
                  >
                    <ListItemText
                      primary={entry.title}
                      secondary={entry.detail}
                      primaryTypographyProps={{
                        className: entry.unread ? 'crm-text-strong' : undefined
                      }}
                    />
                  </MenuItem>
                ))}
              </Menu>

              <Tooltip
                title={isDarkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
                arrow
              >
                <IconButton
                  color="inherit"
                  onClick={toggleThemeMode}
                  className="crm-app-bar__theme-toggle"
                  aria-label="Cambiar tema"
                >
                  <IconRenderer icon={isDarkMode ? Sun : MoonStar} size="sm" />
                </IconButton>
              </Tooltip>

              <Button
                color="inherit"
                onClick={handleOpenUserMenu}
                endIcon={<IconRenderer icon={ChevronDown} size="sm" />}
                className="crm-app-bar__user-trigger"
                aria-controls={isUserMenuOpen ? 'crm-user-menu' : undefined}
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen ? 'true' : undefined}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar className="crm-avatar--sm">{buildInitials(displayUser.name)}</Avatar>
                  <Box className="crm-app-bar__user-info">
                    <Typography variant="body2" className="crm-text-strong">
                      {displayUser.name}
                    </Typography>
                    {displayUser.email ? (
                      <Typography variant="caption" color="text.secondary">
                        {displayUser.email}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        {displayUser.role}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              </Button>

              <Menu
                id="crm-user-menu"
                anchorEl={userMenuAnchor}
                open={isUserMenuOpen}
                onClose={handleCloseUserMenu}
                onClick={handleCloseUserMenu}
                PaperProps={{ className: 'crm-app-bar__menu' }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem className="crm-app-bar__menu-item" onClick={handleOpenProfile}>
                  <ListItemIcon>
                    <IconRenderer icon={UserRound} size="sm" />
                  </ListItemIcon>
                  <ListItemText primary="Mi perfil" />
                </MenuItem>
                <Divider />
                <MenuItem className="crm-app-bar__menu-item" onClick={handleLogout}>
                  <ListItemIcon>
                    <IconRenderer icon={LogOut} size="sm" />
                  </ListItemIcon>
                  <ListItemText primary="Cerrar sesión" />
                </MenuItem>
              </Menu>
            </Stack>
          </Container>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop ? true : mobileOpen}
        onClose={toggleMobile}
        ModalProps={{ keepMounted: true }}
        className={[
          'crm-app-drawer',
          isDesktop
            ? isCollapsed
              ? 'crm-app-drawer--collapsed'
              : 'crm-app-drawer--expanded'
            : 'crm-app-drawer--mobile'
        ]
          .filter(Boolean)
          .join(' ')}
        PaperProps={{
          className: [
            'crm-app-drawer__paper',
            isDesktop
              ? isCollapsed
                ? 'crm-app-drawer__paper--collapsed'
                : 'crm-app-drawer__paper--expanded'
              : 'crm-app-drawer__paper--mobile'
          ]
            .filter(Boolean)
            .join(' ')
        }}
      >
        {drawerContent}
      </Drawer>

      <Box component="main" className="crm-app-shell__main">
        <Toolbar className="crm-app-shell__offset" />
        <Container maxWidth="lg" className="crm-page-container">
          <Box className="crm-app-shell__content">{children}</Box>
        </Container>
      </Box>
    </Box>
  );
}
