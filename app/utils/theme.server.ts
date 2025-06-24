import { createCookie } from 'react-router';

export type Theme = 'light' | 'dark' | 'system';

const themeCookie = createCookie('theme', {
  maxAge: 31_536_000, // 1 year
  path: '/',
});

export async function getTheme(request: Request): Promise<Theme | null> {
  const cookieHeader = request.headers.get('Cookie');
  const theme = await themeCookie.parse(cookieHeader);
  if (theme === 'light' || theme === 'dark' || theme === 'system') {
    return theme;
  }
  return null;
}

export async function setTheme(theme: Theme) {
  return await themeCookie.serialize(theme);
}
