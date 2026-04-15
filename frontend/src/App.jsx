import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useFirebase } from './hooks/useFirebase';
import {
  AFTER_SALES_CASE_CAPABILITIES,
  AFTER_SALES_DASHBOARD_CAPABILITIES,
  AFTER_SALES_NAV_CAPABILITIES,
  CAPABILITIES,
  SUPERVISOR_DASHBOARD_CAPABILITIES,
  SUPERVISOR_DISPATCH_CAPABILITIES,
  SUPERVISOR_TICKETS_CAPABILITIES,
  SUPERVISOR_TRACKING_CAPABILITIES,
  SUPERVISOR_USER_ACCESS_CAPABILITIES,
  TECHNICIAN_CHECKLIST_CAPABILITIES,
  TECHNICIAN_DASHBOARD_CAPABILITIES,
  TECHNICIAN_HISTORY_CAPABILITIES,
  TECHNICIAN_JOBS_CAPABILITIES,
  TECHNICIAN_MESSAGES_CAPABILITIES,
  TECHNICIAN_NAVIGATION_CAPABILITIES,
  TECHNICIAN_PROFILE_CAPABILITIES,
  TECHNICIAN_SCHEDULE_CAPABILITIES,
  USER_DIRECTORY_CAPABILITIES,
  canAccessAdminWorkspace,
  hasAnyCapability
} from './rbac';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const SharedOperationsDashboard = lazy(() => import('./pages/shared/SharedOperationsDashboard'));
const SupervisorDashboard = lazy(() => import('./pages/supervisor/SupervisorDashboard'));
const TechnicianDashboard = lazy(() => import('./pages/technician/TechnicianDashboard'));
const ClientDashboard = lazy(() => import('./pages/client/ClientDashboard'));
const FollowUpDashboard = lazy(() => import('./pages/follow_up/FollowUpDashboard'));
const FollowUpCases = lazy(() => import('./pages/follow_up/FollowUpCases'));
const ClientRequestTracking = lazy(() => import('./pages/client/ClientRequestTracking'));
const ClientRequestDetail = lazy(() => import('./pages/client/ClientRequestDetail'));
const ClientServiceHistory = lazy(() => import('./pages/client/ClientServiceHistory'));
const ClientMessages = lazy(() => import('./pages/client/ClientMessages'));
const ClientNotifications = lazy(() => import('./pages/client/ClientNotifications'));
const ClientProfile = lazy(() => import('./pages/client/ClientProfile'));
const AdminServiceTickets = lazy(() => import('./pages/admin/AdminServiceTickets'));
const AdminTechnicianTracking = lazy(() => import('./pages/admin/AdminTechnicianTracking'));
const AdminServices = lazy(() => import('./pages/admin/AdminServices'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminUserManagement = lazy(() => import('./pages/admin/AdminUserManagement'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const CoverageHeatmap = lazy(() => import('./pages/admin/CoverageHeatmap'));
const AdminDispatchBoard = lazy(() => import('./pages/admin/AdminDispatchBoard'));
const SupervisorTracking = lazy(() => import('./pages/supervisor/SupervisorTracking'));
const DispatchBoard = lazy(() => import('./pages/supervisor/DispatchBoard'));
const TechnicianJobs = lazy(() => import('./pages/technician/TechnicianJobs'));
const ClientServiceRequests = lazy(() => import('./pages/client/ClientServiceRequests'));
const TechnicianSchedule = lazy(() => import('./pages/technician/TechnicianSchedule'));
const TechnicianMapNavigation = lazy(() => import('./pages/technician/TechnicianMapNavigation'));
const TechnicianChecklist = lazy(() => import('./pages/technician/TechnicianChecklist'));
const TechnicianMessages = lazy(() => import('./pages/technician/TechnicianMessages'));
const TechnicianJobHistory = lazy(() => import('./pages/technician/TechnicianJobHistory'));
const TechnicianProfile = lazy(() => import('./pages/technician/TechnicianProfile'));
const AdminInventory = lazy(() => import('./pages/admin/AdminInventory'));

const getDashboardPath = (user) => {
  if (!user) {
    return '/login';
  }

  if (canAccessAdminWorkspace(user)) {
    return '/admin/dashboard';
  }

  if (user.role === 'follow_up') {
    if (hasAnyCapability(user, AFTER_SALES_DASHBOARD_CAPABILITIES)) {
      return '/follow-up/dashboard';
    }
    if (hasAnyCapability(user, AFTER_SALES_CASE_CAPABILITIES)) {
      return '/follow-up/cases';
    }
  }

  if (user.role === 'supervisor') {
    if (hasAnyCapability(user, SUPERVISOR_DASHBOARD_CAPABILITIES)) {
      return '/supervisor/dashboard';
    }
    if (hasAnyCapability(user, SUPERVISOR_DISPATCH_CAPABILITIES)) {
      return '/supervisor/dispatch-board';
    }
    if (hasAnyCapability(user, SUPERVISOR_TICKETS_CAPABILITIES)) {
      return '/supervisor/service-tickets';
    }
    if (hasAnyCapability(user, SUPERVISOR_TRACKING_CAPABILITIES)) {
      return '/supervisor/technician-tracking';
    }
    if (hasAnyCapability(user, SUPERVISOR_USER_ACCESS_CAPABILITIES)) {
      return '/supervisor/user-access';
    }
  }

  if (user.role === 'technician') {
    if (hasAnyCapability(user, TECHNICIAN_DASHBOARD_CAPABILITIES)) {
      return '/technician/dashboard';
    }
    if (hasAnyCapability(user, TECHNICIAN_JOBS_CAPABILITIES)) {
      return '/technician/my-jobs';
    }
    if (hasAnyCapability(user, TECHNICIAN_SCHEDULE_CAPABILITIES)) {
      return '/technician/schedule';
    }
    if (hasAnyCapability(user, TECHNICIAN_NAVIGATION_CAPABILITIES)) {
      return '/technician/map-navigation';
    }
    if (hasAnyCapability(user, TECHNICIAN_CHECKLIST_CAPABILITIES)) {
      return '/technician/checklist';
    }
    if (hasAnyCapability(user, TECHNICIAN_MESSAGES_CAPABILITIES)) {
      return '/technician/messages';
    }
    if (hasAnyCapability(user, TECHNICIAN_HISTORY_CAPABILITIES)) {
      return '/technician/job-history';
    }
    if (hasAnyCapability(user, TECHNICIAN_PROFILE_CAPABILITIES)) {
      return '/technician/profile';
    }
  }

  if (user.role === 'client') {
    return '/client/dashboard';
  }

  return '/login';
};

const RoleRedirect = ({ user }) => <Navigate to={getDashboardPath(user)} replace />;

const ProtectedRoute = ({ role, allowedRoles = [], requiredAnyCapability = [], children }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const isRoleAllowed = role
    ? user.role === role
    : (allowedRoles.length > 0 ? allowedRoles.includes(user.role) : true);
  const isCapabilityAllowed =
    requiredAnyCapability.length > 0 ? hasAnyCapability(user, requiredAnyCapability) : true;

  if (!isRoleAllowed || !isCapabilityAllowed) {
    return <Navigate to={getDashboardPath(user)} replace />;
  }

  return children;
};

function FirebaseBootstrap() {
  const { fcmToken, registerToken } = useFirebase();

  useEffect(() => {
    if (!fcmToken) {
      return;
    }

    registerToken().catch(() => {});
  }, [fcmToken, registerToken]);

  return null;
}

function AppRoutes() {
  const { user, isAuthenticated } = useAuth();

  return (
    <>
      {isAuthenticated ? <FirebaseBootstrap /> : null}
      <Suspense fallback={<div className="grid min-h-screen place-items-center text-slate-600">Loading...</div>}>
        <Routes>
          <Route path="/" element={<RoleRedirect user={isAuthenticated ? user : null} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['superadmin', 'admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/service-tickets" element={<ProtectedRoute allowedRoles={['superadmin', 'admin']}><AdminServiceTickets /></ProtectedRoute>} />
          <Route path="/admin/dispatch-board" element={<ProtectedRoute allowedRoles={['superadmin', 'admin']}><AdminDispatchBoard /></ProtectedRoute>} />
          <Route path="/admin/technician-tracking" element={<ProtectedRoute allowedRoles={['superadmin', 'admin']}><AdminTechnicianTracking /></ProtectedRoute>} />
          <Route
            path="/admin/technicians"
            element={<ProtectedRoute role="superadmin"><Navigate to="/admin/user-management?role=technician" replace /></ProtectedRoute>}
          />
          <Route
            path="/admin/clients"
            element={<ProtectedRoute role="superadmin"><Navigate to="/admin/user-management?role=client" replace /></ProtectedRoute>}
          />
          <Route path="/admin/services" element={<ProtectedRoute allowedRoles={['superadmin', 'admin']}><AdminServices /></ProtectedRoute>} />
          <Route path="/admin/inventory" element={<ProtectedRoute allowedRoles={['superadmin', 'admin']}><AdminInventory /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['superadmin', 'admin']}><AdminAnalytics /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['superadmin', 'admin']}><AdminReports /></ProtectedRoute>} />
          <Route
            path="/admin/user-management"
            element={
              <ProtectedRoute allowedRoles={['superadmin', 'admin']} requiredAnyCapability={USER_DIRECTORY_CAPABILITIES}>
                <AdminUserManagement />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['superadmin', 'admin']}><AdminSettings /></ProtectedRoute>} />
          <Route path="/admin/coverage-heatmap" element={<ProtectedRoute allowedRoles={['superadmin', 'admin']}><CoverageHeatmap /></ProtectedRoute>} />

          {/* Shared Operations Dashboard - Accessible by Superadmin, Supervisor, and Aftersales */}
          <Route path="/admin/operations-dashboard" element={<ProtectedRoute allowedRoles={['superadmin', 'admin', 'supervisor', 'follow_up']}><SharedOperationsDashboard /></ProtectedRoute>} />

          <Route
            path="/follow-up/dashboard"
            element={
              <ProtectedRoute role="follow_up" requiredAnyCapability={AFTER_SALES_NAV_CAPABILITIES}>
                <SharedOperationsDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/follow-up/cases"
            element={
              <ProtectedRoute role="follow_up" requiredAnyCapability={AFTER_SALES_NAV_CAPABILITIES}>
                <FollowUpCases />
              </ProtectedRoute>
            }
          />

          <Route path="/supervisor/dashboard" element={<ProtectedRoute role="supervisor" requiredAnyCapability={SUPERVISOR_DASHBOARD_CAPABILITIES}><SharedOperationsDashboard /></ProtectedRoute>} />
          <Route path="/supervisor/dispatch-board" element={<ProtectedRoute role="supervisor" requiredAnyCapability={SUPERVISOR_DISPATCH_CAPABILITIES}><DispatchBoard /></ProtectedRoute>} />
          <Route path="/supervisor/service-tickets" element={<ProtectedRoute role="supervisor" requiredAnyCapability={SUPERVISOR_TICKETS_CAPABILITIES}><AdminServiceTickets /></ProtectedRoute>} />
          <Route path="/supervisor/technician-tracking" element={<ProtectedRoute role="supervisor" requiredAnyCapability={SUPERVISOR_TRACKING_CAPABILITIES}><SupervisorTracking /></ProtectedRoute>} />
          <Route
            path="/supervisor/user-access"
            element={
              <ProtectedRoute
                role="supervisor"
                requiredAnyCapability={SUPERVISOR_USER_ACCESS_CAPABILITIES}
              >
                <AdminUserManagement />
              </ProtectedRoute>
            }
          />

          <Route path="/technician/dashboard" element={<ProtectedRoute role="technician" requiredAnyCapability={TECHNICIAN_DASHBOARD_CAPABILITIES}><TechnicianDashboard /></ProtectedRoute>} />
          <Route path="/technician/my-jobs" element={<ProtectedRoute role="technician" requiredAnyCapability={TECHNICIAN_JOBS_CAPABILITIES}><TechnicianJobs /></ProtectedRoute>} />
          <Route path="/technician/schedule" element={<ProtectedRoute role="technician" requiredAnyCapability={TECHNICIAN_SCHEDULE_CAPABILITIES}><TechnicianSchedule /></ProtectedRoute>} />
          <Route path="/technician/map-navigation" element={<ProtectedRoute role="technician" requiredAnyCapability={TECHNICIAN_NAVIGATION_CAPABILITIES}><TechnicianMapNavigation /></ProtectedRoute>} />
          <Route path="/technician/checklist" element={<ProtectedRoute role="technician" requiredAnyCapability={TECHNICIAN_CHECKLIST_CAPABILITIES}><TechnicianChecklist /></ProtectedRoute>} />
          <Route path="/technician/messages" element={<ProtectedRoute allowedRoles={['technician', 'admin', 'superadmin']} requiredAnyCapability={TECHNICIAN_MESSAGES_CAPABILITIES}><TechnicianMessages /></ProtectedRoute>} />
          <Route path="/technician/job-history" element={<ProtectedRoute role="technician" requiredAnyCapability={TECHNICIAN_HISTORY_CAPABILITIES}><TechnicianJobHistory /></ProtectedRoute>} />
          <Route path="/technician/profile" element={<ProtectedRoute role="technician" requiredAnyCapability={TECHNICIAN_PROFILE_CAPABILITIES}><TechnicianProfile /></ProtectedRoute>} />

          <Route path="/client/dashboard" element={<ProtectedRoute role="client"><ClientDashboard /></ProtectedRoute>} />
          <Route path="/client/service-requests" element={<ProtectedRoute role="client"><ClientServiceRequests /></ProtectedRoute>} />
          <Route path="/client/requests" element={<ProtectedRoute role="client"><ClientRequestTracking /></ProtectedRoute>} />
          <Route path="/client/requests/:requestId" element={<ProtectedRoute role="client"><ClientRequestDetail /></ProtectedRoute>} />
          <Route path="/client/service-history" element={<ProtectedRoute role="client"><ClientServiceHistory /></ProtectedRoute>} />
          <Route path="/client/messages" element={<ProtectedRoute role="client"><ClientMessages /></ProtectedRoute>} />
          <Route path="/client/notifications" element={<ProtectedRoute role="client"><ClientNotifications /></ProtectedRoute>} />
          <Route path="/client/profile" element={<ProtectedRoute role="client"><ClientProfile /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
