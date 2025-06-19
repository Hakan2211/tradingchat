import { Outlet } from 'react-router';

export default function AppLayout() {
  return (
    <div>
      <h1>App Layout</h1>
      <hr />
      <Outlet />
    </div>
  );
}
