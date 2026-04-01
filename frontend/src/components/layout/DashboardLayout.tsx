import React from 'react';
import { NavLink, Outlet } from 'react-router';
import { LayoutDashboard, Scale, Layers, UploadCloud } from 'lucide-react';

export const DashboardLayout = () => {
  return (
    <div className="flex h-screen w-full bg-lightGray overflow-hidden">
      {/* Sidebar V2 from Professional Dashboard Design Mockup */}
      <aside className="w-64 bg-white border-r border-borderGray flex flex-col hide-scrollbar">
        <div className="p-6 border-b border-borderGray">
          <h1 className="text-xl font-bold text-charcoal flex items-center gap-2">
            <span className="text-professionalBlue">UPC</span> System
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Sprint 0</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <SidebarItem to="/units" icon={<Scale className="w-5 h-5" />} label="Unidades de Medida" />
          <SidebarItem to="/materials" icon={<Layers className="w-5 h-5" />} label="Insumos y Materia" />
          <SidebarItem to="/upload" icon={<UploadCloud className="w-5 h-5" />} label="Carga Masiva" />
          <SidebarItem to="/conversions" icon={<LayoutDashboard className="w-5 h-5" />} label="Conversiones" />
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto w-full relative">
        <Outlet />
      </main>
    </div>
  );
};

const SidebarItem = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-md transition-colors font-medium border-l-4 ${
          isActive
            ? "border-professionalBlue bg-blue-50 text-professionalBlue"
            : "border-transparent text-gray-600 hover:bg-gray-100 hover:text-charcoal"
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
};
