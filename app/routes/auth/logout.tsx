import type { ActionFunctionArgs } from 'react-router';
import { logout } from '#/utils/auth.server';

export async function action({ request }: ActionFunctionArgs) {
  return logout(request);
}

export default function Logout() {
  return null;
}
