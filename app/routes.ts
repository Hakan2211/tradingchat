import {
  type RouteConfig,
  index,
  layout,
  route,
  prefix,
} from '@react-router/dev/routes';

export default [
  index('routes/landingPage.tsx'),

  //--------------Resources Routes-----------------------
  ...prefix('resources', [
    route('/images/:id', 'routes/resources/imagesResource.tsx'),
    route('/theme-switch', 'routes/resources/theme-switch.tsx'),
  ]),

  //--------------App Routes-----------------------
  layout('routes/layouts/app-layout.tsx', [
    route('/home', 'routes/app/home.tsx'),
  ]),

  //--------------User Routes-----------------------
  route('/user/:id', 'routes/user/user.tsx', [
    index('routes/user/user-index.tsx'),
    route('edit', 'routes/user/user-edit.tsx'),
  ]),

  //--------------Auth Routes-----------------------

  layout('routes/layouts/auth-layout.tsx', [
    route('/login', 'routes/auth/login.tsx'),
    route('/register', 'routes/auth/register.tsx'),
    route('/logout', 'routes/auth/logout.tsx'),
    route('/forgot-password', 'routes/auth/forgot-password.tsx'),
    route('/reset-password', 'routes/auth/reset-password.tsx'),
    route('/verify', 'routes/auth/verify.tsx'),
  ]),
] satisfies RouteConfig;
