import { cn } from '#/lib/utils';
import { Outlet } from 'react-router';

export default function AuthLayout() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className={cn('flex flex-col gap-6')}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
