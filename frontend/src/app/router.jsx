import { Routes, Route } from 'react-router-dom';

import MarketingLayout from './layouts/MarketingLayout.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';
import AuthorityLayout from './layouts/AuthorityLayout.jsx';
import ClinicLayout from './layouts/ClinicLayout.jsx';

import ProtectedRoute from '../components/auth/ProtectedRoute.jsx';
import PublicOnlyRoute from '../components/auth/PublicOnlyRoute.jsx';
import { ROLES } from '../services/auth.service.js';

// Marketing
import Landing from '../pages/marketing/Landing.jsx';

// Auth
import Login from '../pages/auth/Login.jsx';
import Register from '../pages/auth/Register.jsx';

// Authority
import AuthorityDashboard from '../pages/authority/Dashboard.jsx';
import Areas from '../pages/authority/Areas.jsx';
import Reports from '../pages/authority/Reports.jsx';
import RiskZones from '../pages/authority/RiskZones.jsx';
import Hotspots from '../pages/authority/Hotspots.jsx';
import Forecasting from '../pages/authority/Forecasting.jsx';
import Alerts from '../pages/authority/Alerts.jsx';
import Settings from '../pages/authority/Settings.jsx';

// Clinic
import ClinicDashboard from '../pages/clinic/Dashboard.jsx';
import SubmitCaseReport from '../pages/clinic/SubmitCaseReport.jsx';
import SubmitDeathReport from '../pages/clinic/SubmitDeathReport.jsx';
import History from '../pages/clinic/History.jsx';
import Profile from '../pages/clinic/Profile.jsx';

import NotFound from '../pages/NotFound.jsx';

export default function AppRouter() {
  return (
    <Routes>
        {/* Marketing (public) */}
        <Route element={<MarketingLayout />}>
          <Route index element={<Landing />} />
        </Route>

        {/* Auth (public — but signed-in users are bounced to their portal) */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />
        </Route>

        {/* Authority Portal — protected */}
        <Route
          path="/authority"
          element={
            <ProtectedRoute role={ROLES.AUTHORITY}>
              <AuthorityLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AuthorityDashboard />} />
          <Route path="dashboard" element={<AuthorityDashboard />} />
          <Route path="areas" element={<Areas />} />
          <Route path="reports" element={<Reports />} />
          <Route path="risk-zones" element={<RiskZones />} />
          <Route path="hotspots" element={<Hotspots />} />
          <Route path="forecasting" element={<Forecasting />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Clinic Portal — protected */}
        <Route
          path="/clinic"
          element={
            <ProtectedRoute role={ROLES.CLINIC}>
              <ClinicLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ClinicDashboard />} />
          <Route path="dashboard" element={<ClinicDashboard />} />
          <Route path="submit-case" element={<SubmitCaseReport />} />
          <Route path="submit-death" element={<SubmitDeathReport />} />
          <Route path="history" element={<History />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
  );
}
