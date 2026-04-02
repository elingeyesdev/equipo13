import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Scale, Layers, UploadCloud, ArrowLeftRight, Box, ChevronRight, UserCircle2 } from 'lucide-react';

const navigation = [
  {
    name: 'Unidades de Medida',
    href: '/units',
    icon: Scale,
    subtitle: 'Unidades estándar y personalizadas para producción e inventario',
  },
  {
    name: 'Insumos y Materia Prima',
    href: '/materials',
    icon: Layers,
    subtitle: 'Seguimiento de insumos, precios y categorías activas',
  },
  {
    name: 'Carga Masiva',
    href: '/upload',
    icon: UploadCloud,
    subtitle: 'Importación masiva de inventario industrial y lotes biológicos',
  },
  {
    name: 'Equivalencias y Conversiones',
    href: '/conversions',
    icon: ArrowLeftRight,
    subtitle: 'Factores de conversión para costeo preciso',
  },
];

export const DashboardLayout = () => {
  const location = useLocation();

  const currentPage = navigation.find((n) => location.pathname.startsWith(n.href));

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans bg-gray-50">
      {/* ── Sidebar ───────────────────────────────────── */}
      <aside className="w-72 bg-[#1F2937] text-white flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-professionalBlue to-agroGreen flex items-center justify-center shadow-lg shrink-0">
            <Box size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none">
              UPC System
            </h1>
            <p className="text-[10px] text-gray-400 mt-0.5 tracking-wider uppercase">
              Costeo Universal Productivo
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
          <p className="px-3 mb-3 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
            Módulos
          </p>
          {navigation.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-professionalBlue text-white shadow-sm'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={18}
                    className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}
                  />
                  <span className="font-medium text-sm flex-1">{item.name}</span>
                  {isActive && <ChevronRight size={14} className="opacity-60 shrink-0" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-white/10 mx-3 mb-3">
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-xs font-bold ring-2 ring-gray-600 shrink-0">
              AD
            </div>
            <div>
              <p className="text-sm font-medium text-gray-200">Admin User</p>
              <p className="text-xs text-gray-500">Gestor de Planta</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="h-[72px] bg-white border-b border-gray-200 flex items-center px-8 shrink-0 shadow-sm">
          {currentPage ? (
            <div>
              <h2 className="text-xl font-bold text-charcoal leading-tight">
                {currentPage.name === 'Unidades de Medida'
                  ? 'Administración de Unidades de Medida'
                  : currentPage.name === 'Insumos y Materia Prima'
                  ? 'Gestión de Insumos y Materia Prima'
                  : currentPage.name === 'Carga Masiva'
                  ? 'Carga Masiva de Inventario Inicial'
                  : 'Equivalencias y Conversiones'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">{currentPage.subtitle}</p>
            </div>
          ) : (
            <h2 className="text-xl font-bold text-charcoal">Dashboard</h2>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-8 bg-gray-50/80">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
