import Login from '../pages/Login.jsx';
import RecoverPassword from '../pages/RecoverPassword.jsx';
import { ROUTE_PATHS } from './paths.js';

export const publicRoutes = [
  {
    id: 'login',
    path: ROUTE_PATHS.login,
    component: Login
  },
  {
    id: 'recover',
    path: ROUTE_PATHS.recover,
    component: RecoverPassword
  }
];
