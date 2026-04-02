import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { UnitManagementPage } from './features/units/pages/UnitManagementPage';
import { MaterialManagementPage } from './features/materials/pages/MaterialManagementPage';
import { BulkUploadPage } from './features/bulkUpload/pages/BulkUploadPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/units" replace />} />
          <Route path="units" element={<UnitManagementPage />} />
          <Route path="materials" element={<MaterialManagementPage />} />
          <Route path="upload" element={<BulkUploadPage />} />
          <Route
            path="conversions"
            element={
              <div className="p-8 bg-white rounded-xl shadow-sm border border-gray-200 text-gray-500 text-sm">
                Módulo de Equivalencias y Conversiones — En desarrollo...
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
