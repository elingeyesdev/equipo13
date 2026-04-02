import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { UnitManagementPage } from './features/units/pages/UnitManagementPage';
import { MaterialManagementPage } from './features/materials/pages/MaterialManagementPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/units" replace />} />
          <Route path="units" element={<UnitManagementPage />} />
          
          {/* Rutas simuladas para que el Dashboard no se rompa al navegar */}
          <Route path="materials" element={<MaterialManagementPage />} />
          <Route path="upload" element={<div className="p-8">Módulo Carga Masiva (En desarrollo...)</div>} />
          <Route path="conversions" element={<div className="p-8">Módulo de Conversiones (En desarrollo...)</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
