import {
  FolderKanban,
  History,
  LayoutDashboard,
  Percent,
  ShieldCheck,
  ShieldUser,
  Users
} from 'lucide-react';
import Home from '../pages/Home.jsx';
import Portfolios from '../pages/Portfolios.jsx';
import Clients from '../pages/Clients.jsx';
import ClientDetail from '../pages/ClientDetail.jsx';
import ComingSoon from '../pages/ComingSoon.jsx';
import Credits from '../pages/Credits.jsx';
import CreditImport from '../pages/CreditImport.jsx';
import UsersPage from '../pages/Users.jsx';
import Groups from '../pages/Groups.jsx';
import NegotiationSettings from '../pages/NegotiationSettings.jsx';
import Dictamenes from '../pages/Dictamenes.jsx';
import Profile from '../pages/Profile.jsx';
import Forbidden from '../pages/Forbidden.jsx';
import NotFound from '../pages/NotFound.jsx';
import { ROUTE_PATHS } from './paths.js';

export const navSections = [
  { id: 'operacion', label: 'Operacion', order: 1 },
  { id: 'administracion', label: 'Administracion', order: 2 },
  { id: 'configuracion', label: 'Configuracion', order: 3 }
];

export const privateRoutes = [
  {
    id: 'dashboard',
    path: ROUTE_PATHS.dashboard,
    component: Home,
    permission: 'dashboard.read',
    nav: {
      section: 'operacion',
      label: 'Panel',
      icon: LayoutDashboard,
      order: 1
    }
  },
  {
    id: 'portfolios',
    path: ROUTE_PATHS.portfolios,
    component: Portfolios,
    permission: 'portfolios.read',
    nav: {
      section: 'operacion',
      label: 'Portafolios',
      icon: FolderKanban,
      order: 2
    }
  },
  {
    id: 'clients',
    path: ROUTE_PATHS.clients,
    component: Clients,
    permission: 'clients.read'
  },
  {
    id: 'clientDetail',
    path: ROUTE_PATHS.clientDetail,
    component: ClientDetail,
    permission: 'clients.read'
  },
  {
    id: 'credits',
    path: ROUTE_PATHS.credits,
    component: Credits,
    permission: 'credits.read'
  },
  {
    id: 'balances',
    path: ROUTE_PATHS.balances,
    component: ComingSoon,
    permission: 'balance_values.read'
  },
  {
    id: 'profile',
    path: ROUTE_PATHS.profile,
    component: Profile,
    permission: null,
    nav: {
      hidden: true
    }
  },
  {
    id: 'creditImport',
    path: ROUTE_PATHS.creditImport,
    component: CreditImport,
    permission: 'imports.write',
    nav: {
      section: 'administracion',
      label: 'Importación de información',
      icon: History,
      order: 1
    }
  },
  {
    id: 'users',
    path: ROUTE_PATHS.users,
    component: UsersPage,
    permission: 'users.read',
    nav: {
      section: 'administracion',
      label: 'Usuarios',
      icon: ShieldUser,
      order: 2
    }
  },
  {
    id: 'audit',
    path: ROUTE_PATHS.audit,
    component: ComingSoon,
    permission: 'audit.read'
  },
  {
    id: 'groups',
    path: ROUTE_PATHS.groups,
    component: Groups,
    permission: 'groups.read',
    nav: {
      section: 'configuracion',
      label: 'Grupos',
      icon: Users,
      order: 1
    }
  },
  {
    id: 'negotiationSettings',
    path: ROUTE_PATHS.negotiationSettings,
    component: NegotiationSettings,
    permission: 'negotiations.config.read',
    nav: {
      section: 'configuracion',
      label: 'Negociaciones',
      icon: Percent,
      order: 2
    }
  },
  {
    id: 'dictamenes',
    path: ROUTE_PATHS.dictamenes,
    component: Dictamenes,
    permission: 'dictamenes.read',
    nav: {
      section: 'configuracion',
      label: 'Dictamenes',
      icon: ShieldCheck,
      order: 3
    }
  },
  {
    id: 'permissions',
    path: ROUTE_PATHS.permissions,
    component: ComingSoon,
    permission: 'permissions.read'
  },
  {
    id: 'balanceFields',
    path: ROUTE_PATHS.balanceFields,
    component: ComingSoon,
    permission: 'balance_fields.read'
  },
  {
    id: 'forbidden',
    path: ROUTE_PATHS.forbidden,
    component: Forbidden,
    permission: null,
    nav: {
      hidden: true
    }
  },
  {
    id: 'notFound',
    path: ROUTE_PATHS.notFound,
    component: NotFound,
    permission: null,
    nav: {
      hidden: true
    }
  }
];
