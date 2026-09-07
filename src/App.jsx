import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Home from './pages/Home';
import Upload from './pages/Upload';
import Preview from './pages/Preview';
import Workflow from './pages/Workflow';
import Dashboard from './pages/Dashboard';
import MissingValues from './pages/MissingValues';
import Duplicates from './pages/Duplicates';
import CleaningActions from './pages/CleaningActions';
import CleanedPreview from './pages/CleanedPreview';
import Report from './pages/Report';
import { ThemeProvider } from './contexts/ThemeContext';
import { DatasetProvider } from './contexts/DatasetContext';
import { PhaseCProvider } from './phase_c/PhaseCContext';

function App() {
  return (
    <ThemeProvider>
      <DatasetProvider>
        <PhaseCProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/workflow" element={<Workflow />} />
              
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/preview" element={<Preview />} />
                <Route path="/missing-values" element={<MissingValues />} />
                <Route path="/duplicates" element={<Duplicates />} />
                <Route path="/cleaning-actions" element={<CleaningActions />} />
                <Route path="/cleaned-preview" element={<CleanedPreview />} />
                <Route path="/report" element={<Report />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </PhaseCProvider>
      </DatasetProvider>
    </ThemeProvider>
  );
}

export default App;

