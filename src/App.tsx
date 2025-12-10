import { Routes, Route, Navigate  } from 'react-router-dom'
import PatientsPage from './pages/PatientsPage'
import PatientAnalysesPage from './pages/PatientAnalysesPage'
import OrderDetailPage from './pages/OrderDetailPage'
import AppNav from './layout/AppNav';
import NomencladorPage from './pages/NomencladorPage';
import ExamItemsPage from './pages/ExamItemsPage';
import ReportPage from './pages/ReportPage';
import DoctorsPage from './pages/DoctorsPage';
import SocialWorksPage from './pages/SocialWorksPage';
import PatientAccountPage from './pages/PatientAccountPage';
import PrintGuidePage from './pages/PrintGuidePage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import DashboardPage  from './pages/DashboardPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppNav />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="patients/:patientId/analyses" element={<PatientAnalysesPage />} />
        <Route path="orders/:orderId" element={<OrderDetailPage />} />
        <Route path="nomenclador" element={<NomencladorPage />} />
        <Route path="exam-items" element={<ExamItemsPage />} />
        <Route path="/orders/:orderId/report" element={<ReportPage />} />
        <Route path="doctors" element={<DoctorsPage />} />
        <Route path="social-works" element={<SocialWorksPage />} />
        <Route path="/patients/:id/account" element={<PatientAccountPage />} />
        <Route path="/orders/:orderId/guide" element={<PrintGuidePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}