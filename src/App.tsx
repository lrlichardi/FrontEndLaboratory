import { Routes, Route, Navigate  } from 'react-router-dom'
import PatientsPage from './pages/PatientsPage'
import PatientAnalysesPage from './pages/PatientAnalysesPage'
import OrderDetailPage from './pages/OrderDetailPage'
import AppNav from './layout/AppNav';
import NomencladorPage from './pages/NomencladorPage';
import ExamItemsPage from './pages/ExamItemsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppNav />}>
        <Route index element={<PatientsPage />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="patients/:patientId/analyses" element={<PatientAnalysesPage />} />
        <Route path="orders/:orderId" element={<OrderDetailPage />} />
        <Route path="nomenclador" element={<NomencladorPage />} />
        <Route path="exam-items" element={<ExamItemsPage />} />
      </Route>
    </Routes>
  );
}