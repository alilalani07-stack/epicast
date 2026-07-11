import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar.jsx';
import Navbar from '../../components/layout/Navbar.jsx';
import { CLINIC_NAV } from '../../components/layout/navConfig.jsx';

export default function ClinicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas text-ink flex">
      <Sidebar
        groups={CLINIC_NAV}
        portalLabel="Clinic"
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-[272px]">
        <Navbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-6 sm:px-10 lg:px-14 py-12 lg:py-16 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
