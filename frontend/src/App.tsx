import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { UnitManagementPage } from './features/units/pages/UnitManagementPage';
import { MaterialManagementPage } from './features/materials/pages/MaterialManagementPage';
import { BulkUploadPage } from './features/bulkUpload/pages/BulkUploadPage';
import CategoryManagementPage from './features/categories/pages/CategoryManagementPage';

import { ConversionManagementPage } from './features/conversions/pages/ConversionManagementPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/units" replace />} />
          <Route path="units" element={<UnitManagementPage />} />
          <Route path="materials" element={<MaterialManagementPage />} />
          <Route path="categories" element={<CategoryManagementPage />} />
          <Route path="upload" element={<BulkUploadPage />} />
          <Route path="conversions" element={<ConversionManagementPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
