import {
  type RouteConfig,
  index,
  layout,
  route,
} from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),

  layout('routes/layouts/auth-layout.tsx', [
    route('/login', 'routes/auth/login.tsx'),
    route('/register', 'routes/auth/register.tsx'),
    route('/logout', 'routes/auth/logout.tsx'),
  ]),
] satisfies RouteConfig;
