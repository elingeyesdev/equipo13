import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Box, Calculator, ChevronRight, CloudUpload, Layers, LayoutDashboard, Scale, FolderTree, Package } from 'lucide-react';

const navigationGroups = [
  {
    title: 'Catálogos Base',
    items: [
      {
        name: 'Unidades de Medida',
        href: '/units',
        icon: Scale,
        subtitle: 'Unidades estándar y personalizadas para producción e inventario',
      },
      {
        name: 'Categorías y Agrupaciones',
        href: '/categories',
        icon: FolderTree,
        subtitle: 'Gestión dinámica de tipos y familias de insumos/unidades',
      },
      {
        name: 'Equivalencias y Conversiones',
        href: '/conversions',
        icon: LayoutDashboard,
        subtitle: 'Factores de conversión para costeo preciso',
      },
    ],
  },
  {
    title: 'Inventario y Materiales',
    items: [
      {
        name: 'Insumos y Materia Prima',
        href: '/materials',
        icon: Layers,
        subtitle: 'Seguimiento de insumos, precios y categorías activas',
      },
      {
        name: 'Control de Lotes / Inventario',
        href: '/inventory',
        icon: Package,
        subtitle: 'Visualización y gestión de existencias de lotes',
      },
      {
        name: 'Carga Masiva',
        href: '/upload',
        icon: CloudUpload,
        subtitle: 'Importación masiva de inventario industrial y lotes biológicos',
      },
    ],
  },
  {
    title: 'Ingeniería de Producto',
    items: [
      {
        name: 'Fases de Transformación',
        href: '/production-stages',
        icon: Layers,
        subtitle: 'Configuración y secuencia de etapas de producción',
      },
      {
        name: 'Calculadora BOM',
        href: '/bom',
        icon: Calculator,
        subtitle: 'Insumos y cantidades por etapa para cada producto terminado',
      },
    ],
  },
];

const allNavigation = navigationGroups.flatMap((g) => g.items);

export const DashboardLayout = () => {
  const location = useLocation();
  const currentPage = allNavigation.find((n) => location.pathname.startsWith(n.href));

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 font-sans antialiased">
      <aside className="w-72 shrink-0 bg-charcoal text-white flex flex-col border-r border-gray-800">
        <div className="p-6 flex items-center gap-3 border-b border-gray-700/80">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-professionalBlue to-agroGreen flex items-center justify-center shadow-lg">
            <Box className="w-[18px] h-[18px] text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none">UPC System</h1>
            <p className="text-[10px] text-gray-400 mt-0.5 tracking-wider uppercase font-semibold">
              Costeo Universal Productivo
            </p>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-6 overflow-y-auto hide-scrollbar">
          {navigationGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{group.title}</p>
              <div className="space-y-1">
                {group.items.map((item) => (
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
                          className={`w-[18px] h-[18px] shrink-0 ${
                            isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'
                          }`}
                        />
                        <span className="font-medium text-sm flex-1 leading-snug">{item.name}</span>
                        {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-700/50 mx-3 mb-3">
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-xs font-bold ring-2 ring-gray-600 text-white">
              AD
            </div>
            <div>
              <p className="text-sm font-medium text-gray-200">Admin User</p>
              <p className="text-xs text-gray-500">Gestor de Planta</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-[72px] shrink-0 bg-white border-b border-gray-200 flex items-center px-8 shadow-sm">
          {currentPage ? (
            <div>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">{currentPage.name}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{currentPage.subtitle}</p>
            </div>
          ) : (
            <h2 className="text-xl font-bold text-gray-900 leading-tight">Dashboard</h2>
          )}
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50/80">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
