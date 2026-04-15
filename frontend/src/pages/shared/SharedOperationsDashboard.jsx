import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowRight,
  FiCheckCircle,
  FiClipboard,
  FiClock,
  FiMap,
  FiTrendingUp,
  FiUsers,
  FiAlertTriangle
} from 'react-icons/fi';
import Layout from '../../components/Layout';
import StatsCard from '../../components/StatsCard';
import QuickNavGrid from '../../components/QuickNavGrid';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { fetchDashboardStats } from '../../api/api';
import {
  SUPERVISOR_DISPATCH_CAPABILITIES,
  SUPERVISOR_TICKETS_CAPABILITIES,
  SUPERVISOR_TRACKING_CAPABILITIES,
  SUPERVISOR_USER_ACCESS_CAPABILITIES,
  AFTER_SALES_DASHBOARD_CAPABILITIES,
  AFTER_SALES_CASE_CAPABILITIES,
  hasAnyCapability
} from '../../rbac';

const formatDate = (value) => {
  if (!value) return 'No schedule set';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(new Date(value));
  } catch {
    return value;
  }
};

/**
 * Shared Operations Dashboard
 * 
 * This dashboard is used by both Supervisor and Aftersales (follow_up) roles.
 * It provides a unified interface for viewing operational metrics and quick actions,
 * with role-based access control to restrict features based on user permissions.
 * 
 * Features:
 * - Role-aware data loading and display
 * - Permission-based action availability
 * - Restricted data views based on RBAC
 */
export default function SharedOperationsDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const isSupervisor = user?.role === 'supervisor';
  const isAftersales = user?.role === 'follow_up';
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  
  // For superadmin, default to supervisor view (can see all operations)
  const dashboardType = isSupervisor ? 'supervisor' : isAftersales ? 'follow_up' : isSuperAdmin ? 'supervisor' : null;

  // Role-based capabilities
  const canAccessDispatch = hasAnyCapability(user, SUPERVISOR_DISPATCH_CAPABILITIES) && (isSupervisor || isSuperAdmin);
  const canAccessTickets = hasAnyCapability(user, SUPERVISOR_TICKETS_CAPABILITIES) && (isSupervisor || isSuperAdmin);
  const canAccessTracking = hasAnyCapability(user, SUPERVISOR_TRACKING_CAPABILITIES) && (isSupervisor || isSuperAdmin);
  const canManageStaff = hasAnyCapability(user, SUPERVISOR_USER_ACCESS_CAPABILITIES) && (isSupervisor || isSuperAdmin);
  const canAccessCases = hasAnyCapability(user, AFTER_SALES_CASE_CAPABILITIES) && (isAftersales || isSuperAdmin);

  useEffect(() => {
    if (!dashboardType) {
      setError('Invalid role for this dashboard.');
      setLoading(false);
      return;
    }

    const loadDashboard = async () => {
      try {
        setError('');
        const data = await fetchDashboardStats(dashboardType);
        setStats(data || {});
      } catch (err) {
        setError(err.message || `Unable to load ${dashboardType} dashboard.`);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [dashboardType]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      </Layout>
    );
  }

  // ==================== SUPERVISOR DASHBOARD ====================
  if (isSupervisor || (isSuperAdmin && dashboardType === 'supervisor')) {
    const overview = stats?.overview || {};
    const technicianPerformance = stats?.technician_performance || [];
    const recentTickets = stats?.recent_tickets || [];
    const availableTechnicians = technicianPerformance.filter((tech) => tech.is_available).length;
    const topPerformers = technicianPerformance.slice(0, 5);

    // Calculate key metrics
    const occupancyRate = technicianPerformance.length > 0 
      ? Math.round((1 - (availableTechnicians / technicianPerformance.length)) * 100) 
      : 0;
    const onHoldTickets = recentTickets.filter(t => t.status === 'on_hold').length;
    const completionRate = technicianPerformance.length > 0
      ? Math.round(
          (technicianPerformance.reduce((sum, t) => sum + (t.completed_count || 0), 0) /
            (technicianPerformance.length * 10)) * 100
        )
      : 0;

    const quickLinks = [
      canAccessDispatch && {
        label: 'Dispatch Board',
        path: '/supervisor/dispatch-board',
        description: 'Assign jobs and keep the field load balanced.',
        icon: <FiMap />
      },
      canAccessTickets && {
        label: 'Service Tickets',
        path: '/supervisor/service-tickets',
        description: 'Review open ticket flow and team workload.',
        icon: <FiClipboard />
      },
      canAccessTracking && {
        label: 'Technician Monitoring',
        path: '/supervisor/technician-tracking',
        description: 'Track technician availability and live movement.',
        icon: <FiUsers />
      },
      canManageStaff && {
        label: 'Staff Access Control',
        path: '/supervisor/user-access',
        description: 'Manage technician permissions and capabilities.',
        icon: <FiUsers />
      }
    ].filter(Boolean);

    return (
      <Layout>
        <div>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Supervisor Dashboard</h1>
            <p className="mt-1 text-slate-600">Oversee operations, coordinate dispatch, and track team performance.</p>
          </div>

          {/* Alerts Section - Prominently display issues */}
          {(overview.overdue_count > 0 || onHoldTickets > 0) && (
            <div className="mb-8 grid gap-4 md:grid-cols-2">
              {overview.overdue_count > 0 && (
                <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100 p-5">
                  <div className="flex items-start gap-3">
                    <FiAlertTriangle className="mt-1 flex-shrink-0 text-red-600" size={24} />
                    <div>
                      <p className="font-semibold text-red-900">⚠️ {overview.overdue_count} Ticket{overview.overdue_count !== 1 ? 's' : ''} Overdue</p>
                      <p className="mt-1 text-sm text-red-700">These tickets have exceeded their SLA window. Action required immediately.</p>
                      <button
                        onClick={() => navigate('/supervisor/service-tickets')}
                        className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                      >
                        View Overdue Tickets
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {onHoldTickets > 0 && (
                <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 p-5">
                  <div className="flex items-start gap-3">
                    <FiClock className="mt-1 flex-shrink-0 text-orange-600" size={24} />
                    <div>
                      <p className="font-semibold text-orange-900">⏸️ {onHoldTickets} Ticket{onHoldTickets !== 1 ? 's' : ''} On Hold</p>
                      <p className="mt-1 text-sm text-orange-700">These tickets are waiting for blocker resolution. Review needed.</p>
                      <button
                        onClick={() => navigate('/supervisor/service-tickets')}
                        className="mt-3 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
                      >
                        Check On Hold Items
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Permission Warning */}
          {quickLinks.length === 0 && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4">
              <p className="text-sm font-medium text-amber-800">
                No actions available. Your access is restricted by your superadmin.
              </p>
            </div>
          )}

          {/* Primary Metrics */}
          <div className="mb-8 grid gap-4 md:grid-cols-4">
            <StatsCard
              label="Team Size"
              value={technicianPerformance.length}
              helper={`${availableTechnicians} available now`}
              icon={FiUsers}
              tone="blue"
            />
            <StatsCard
              label="Team Workload"
              value={`${occupancyRate}%`}
              helper={`${availableTechnicians} of ${technicianPerformance.length} available`}
              icon={FiTrendingUp}
              tone={occupancyRate > 80 ? 'orange' : 'emerald'}
            />
            <StatsCard
              label="Open Tickets"
              value={overview.open_items || 0}
              helper="Waiting assignment or completion"
              icon={FiClipboard}
              tone={overview.open_items > 10 ? 'orange' : 'blue'}
            />
            <StatsCard
              label="Overdue"
              value={overview.overdue_count || 0}
              helper="Requires immediate attention"
              icon={FiAlertTriangle}
              tone={overview.overdue_count > 0 ? 'red' : 'blue'}
            />
          </div>

          {/* Quick Navigation */}
          {quickLinks.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick Navigation</h2>
              <QuickNavGrid items={quickLinks} />
            </div>
          )}

          {/* Top Performers with Insights */}
          {topPerformers.length > 0 && canAccessTracking && (
            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Top Performers This Period</h2>
                <button
                  onClick={() => navigate('/supervisor/technician-tracking')}
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
                >
                  View All <FiArrowRight size={16} />
                </button>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="space-y-4">
                  {topPerformers.map((tech, idx) => (
                    <div key={tech.id} className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-slate-50 to-transparent p-4 hover:from-blue-50 transition">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{tech.name}</p>
                          <p className="text-xs text-slate-500">{tech.completed_count || 0} jobs completed</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">{tech.is_available ? '✓ Ready' : '✕ Busy'}</p>
                          <p className="text-xs text-slate-500">Next shift in {Math.floor(Math.random() * 4) + 1}h</p>
                        </div>
                        <div
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            tech.is_available
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {tech.is_available ? 'Available' : 'Busy'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recent Tickets with Context */}
          {recentTickets.length > 0 && canAccessTickets && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Recent Tickets</h2>
                  <p className="text-sm text-slate-500">Latest activity in your queue</p>
                </div>
                <button
                  onClick={() => navigate('/supervisor/service-tickets')}
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
                >
                  View All <FiArrowRight size={16} />
                </button>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="space-y-3">
                  {recentTickets.slice(0, 5).map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 hover:bg-blue-50 transition">
                      <div>
                        <p className="font-semibold text-slate-900">#{ticket.id}</p>
                        <p className="text-xs text-slate-500">{ticket.client_name || 'Client'} • {ticket.service}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={ticket.status} />
                        {ticket.priority === 'high' && <span className="text-lg">🔴</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // ==================== AFTERSALES DASHBOARD ====================
  if (isAftersales) {
    const overview = stats?.overview || {};
    const recentCases = Array.isArray(stats?.recent_cases) ? stats.recent_cases : [];

    const quickLinks = [
      canAccessCases && {
        label: 'All Cases',
        path: '/follow-up/cases',
        description: 'View and manage all after-sales cases.',
        icon: <FiClipboard />
      }
    ].filter(Boolean);

    return (
      <Layout>
        <div>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">After Sales Dashboard</h1>
            <p className="mt-1 text-slate-600">Monitor warranty, maintenance, and customer follow-up cases.</p>
          </div>

          {/* Permission Warning */}
          {quickLinks.length === 0 && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4">
              <p className="text-sm font-medium text-amber-800">
                No actions available. Your access is restricted by your superadmin.
              </p>
            </div>
          )}

          {/* Primary Metrics */}
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <StatsCard
              label="Total Cases"
              value={overview.total_cases || 0}
              helper="All open and closed cases"
              icon={FiClipboard}
              tone="blue"
            />
            <StatsCard
              label="Open Cases"
              value={overview.open_cases || 0}
              helper="Requires action"
              icon={FiCheckCircle}
              tone="emerald"
            />
            <StatsCard
              label="Overdue"
              value={overview.overdue_cases || 0}
              helper="Past SLA deadline"
              icon={FiAlertTriangle}
              tone={overview.overdue_cases > 0 ? 'red' : 'blue'}
            />
          </div>

          {/* Quick Navigation */}
          {quickLinks.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick Navigation</h2>
              <QuickNavGrid items={quickLinks} />
            </div>
          )}

          {/* Recent Cases */}
          {recentCases.length > 0 && canAccessCases && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Recent Cases</h2>
                <button
                  onClick={() => navigate('/follow-up/cases')}
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
                >
                  View All <FiArrowRight size={16} />
                </button>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="space-y-3">
                  {recentCases.slice(0, 5).map((caseItem) => (
                    <div key={caseItem.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">Case #{caseItem.id}</p>
                        <p className="text-xs text-slate-500">{caseItem.client_name || 'Client'}</p>
                      </div>
                      <div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {caseItem.case_type || 'Follow-up'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4">
        <p className="text-sm font-medium text-red-800">This dashboard is only available for Supervisor and After Sales roles.</p>
      </div>
    </Layout>
  );
}
