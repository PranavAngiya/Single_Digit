import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./layouts/AdminLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import TicketsPage from "./pages/TicketsPage";
import TicketDetail from "./pages/TicketDetail";
import CallMonitor from "./pages/CallMonitor";
import KBPage from "./pages/KBPage";
import CallPage from "./pages/CallPage";
import IncidentsPage from "./pages/IncidentsPage";
import PortalPage from "./pages/PortalPage";
import PipelinePage from "./pages/pipeline/PipelinePage";
import OcrPage from "./pages/ocr/OcrPage";
import PlatformLayout from "./layouts/PlatformLayout";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing portal — public */}
          <Route path="/" element={<PortalPage />} />

          {/* Data Pipeline — public (full-screen app, has own sidebar nav) */}
          <Route path="/pipeline" element={<PipelinePage />} />

          {/* Agentic OCR — public, full-screen (has own nav bar) */}
          <Route path="/ocr" element={<OcrPage />} />

          {/* Helpdesk login */}
          <Route path="/helpdesk/login" element={<LoginPage />} />

          {/* Helpdesk admin routes */}
          <Route
            path="/helpdesk"
            element={
              <ProtectedRoute requireRole="admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="tickets/:id" element={<TicketDetail />} />
            <Route path="call-monitor" element={<CallMonitor />} />
            <Route path="kb" element={<KBPage />} />
            <Route path="incidents" element={<IncidentsPage />} />
          </Route>

          {/* Helpdesk customer call */}
          <Route
            path="/helpdesk/call"
            element={
              <ProtectedRoute>
                <CallPage />
              </ProtectedRoute>
            }
          />

          {/* Legacy redirects */}
          <Route path="/login" element={<Navigate to="/helpdesk/login" replace />} />
          <Route path="/dashboard" element={<Navigate to="/helpdesk/dashboard" replace />} />
          <Route path="/tickets" element={<Navigate to="/helpdesk/tickets" replace />} />
          <Route path="/call-monitor" element={<Navigate to="/helpdesk/call-monitor" replace />} />
          <Route path="/kb" element={<Navigate to="/helpdesk/kb" replace />} />
          <Route path="/incidents" element={<Navigate to="/helpdesk/incidents" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
