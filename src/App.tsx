import { Container, CssBaseline } from '@mui/material'
import { Routes, Route, Navigate } from 'react-router-dom'
import PatientsPage from './pages/PatientsPage'
import PatientAnalysesPage from './pages/PatientAnalysesPage'
import AppNav from './layout/AppNav';
import NomencladorPage from './pages/NomencladorPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppNav />}>
        <Route index path="patients" element={<PatientsPage />} />
        <Route path="patients/:patientId/analyses" element={<PatientAnalysesPage />} />
        <Route path="nomenclador" element={<NomencladorPage />} />
      </Route>
    </Routes>
  );
}