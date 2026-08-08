import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 md:ml-[242px] flex flex-col">
        <Topbar onMenuClick={() => setSidebarOpen((v) => !v)} />
        <div className="p-4 md:p-7 pb-14 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
