import { Outlet } from 'react-router';

export default function SplitScreenAuthLayout() {
  return (
    // This component's only job is to create the two-column grid.
    // The child routes (login, register) will provide the content for both columns.
    <div className="grid min-h-svh w-full lg:grid-cols-2">
      <Outlet />
    </div>
  );
}
