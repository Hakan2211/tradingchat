import { createCookie } from 'react-router';

const userListVisibilityCookie = createCookie('userlist-visible', {
  maxAge: 31_536_000, // 1 year
  path: '/',
});

export async function getUserListVisibility(
  request: Request
): Promise<boolean> {
  const cookieHeader = request.headers.get('Cookie');
  const visibility = await userListVisibilityCookie.parse(cookieHeader);
  return visibility === 'true';
}

export async function setUserListVisibility(visible: boolean) {
  return await userListVisibilityCookie.serialize(visible.toString());
}
