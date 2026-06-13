import { Outlet } from 'react-router-dom';

export function StandaloneLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  );
}
