import {
  type RouteConfig,
  index,
  layout,
  route,
  prefix,
} from '@react-router/dev/routes';

export default [
  layout('routes/layouts/public-layout.tsx', [
    index('routes/landingPage.tsx'),
    route('/about', 'routes/about.tsx'),
    route('/pricing', 'routes/pricing.tsx'),
    route('/disclaimer', 'routes/legal/disclaimer.tsx'),
    route('/privacy-policy', 'routes/legal/privacy-policy.tsx'),
    route('/terms-of-service', 'routes/legal/terms-of-service.tsx'),
  ]),

  //--------------Resources Routes-----------------------
  ...prefix('resources', [
    route('/images/:id', 'routes/resources/imagesResource.tsx'),
    route('/chat-images/:id', 'routes/resources/chatImageResource.tsx'),
    route('/theme-switch', 'routes/resources/theme-switch.tsx'),
    route('/userlist-toggle', 'routes/resources/userlist-toggle.tsx'),
    route('/user-status', 'routes/resources/user-status.tsx'),
    route('/create-dm', 'routes/resources/create-dm.tsx'),
    route('/hide-dm', 'routes/resources/hide-dm.tsx'),
  ]),

  //--------------App Routes-----------------------
  layout('routes/layouts/app-layout.tsx', [
    route('/home', 'routes/app/home.tsx'),

    //-----Room Routes------
    route('/chat/:roomId', 'routes/app/chat/chat-room.tsx'),
    //-----User Routes------
    route('/user/:id', 'routes/user/user.tsx', [
      index('routes/user/user-index.tsx'),
      route('edit', 'routes/user/user-edit.tsx'),
    ]),
    route('/bookmarks', 'routes/app/bookmarks.tsx'),
  ]),

  //--------------Auth Routes-----------------------

  layout('routes/layouts/split-screen-auth-layout.tsx', [
    route('/login', 'routes/auth/login.tsx'),
    route('/register', 'routes/auth/register.tsx'),
  ]),

  layout('routes/layouts/auth-layout.tsx', [
    route('/logout', 'routes/auth/logout.tsx'),
    route('/forgot-password', 'routes/auth/forgot-password.tsx'),
    route('/reset-password', 'routes/auth/reset-password.tsx'),
    route('/verify', 'routes/auth/verify.tsx'),
  ]),
] satisfies RouteConfig;
