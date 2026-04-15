import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClipboard,
  FiRefreshCw,
  FiTrendingUp,
  FiUsers
} from 'react-icons/fi';
import Layout from '../../components/Layout';
import ActiveTechnicianJobs from '../../components/ActiveTechnicianJobs';
import { useAuth } from '../../context/AuthContext';
import { fetchDashboardStats } from '../../api/api';
import { canViewAdminUserDirectory } from '../../rbac';
import {
  AUTO_REFRESH_MS,
  formatDate,
  formatDateTime,
  getDisplayText,
  getSlaAction,
  getStatusTone,
  toneStyles
} from '../../utils/dashboardHelpers';

function StatCard({ label, value, helper, icon: Icon, tone = 'blue' }) {
  const palette = toneStyles[tone] || toneStyles.blue;

  return (
    <div className={`rounded-2xl border p-4 ${palette.card}`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2.5 ${palette.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-0.5 text-2xl font-semibold text-slate-900">{value}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError('');
      const data = await fetchDashboardStats('admin');
      setStats(data || {});
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError(err.message || 'Unable to load the admin dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();

    const intervalId = window.setInterval(() => {
      loadDashboard({ silent: true });
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  const overview = stats?.overview || {};
  const pendingRequests = Array.isArray(stats?.pending_requests) ? stats.pending_requests : [];
  const slaQueue = Array.isArray(stats?.sla_queue) ? stats.sla_queue : [];
  const clientSchedule = Array.isArray(stats?.client_schedule) ? stats.client_schedule : [];
  const slaOverview = stats?.sla_overview || {};

  const overdueCount = Number(slaOverview.overdue_count || 0);
  const warningCount = Number(slaOverview.warning_count || 0);
  const lowStock = Number(overview.low_stock_items || 0);
  const dueMaintenance = Number(overview.due_maintenance || 0);
  const canOpenUsers = canViewAdminUserDirectory(user);

  const primaryMetrics = [
    {
      label: 'Pending Approvals',
      value: pendingRequests.length,
      helper: 'Waiting for admin approval',
      icon: FiClipboard,
      tone: 'amber'
    },
    {
      label: 'Active Tickets',
      value: Number(overview.active_tickets || overview.total_tickets || 0),
      helper: 'Open work in the system',
      icon: FiTrendingUp,
      tone: 'blue'
    },
    {
      label: 'Completed Today',
      value: Number(overview.completed_today || 0),
      helper: 'Jobs closed today',
      icon: FiCheckCircle,
      tone: 'emerald'
    }
  ];

  /* ---------- attention bar items ---------- */
  const attentionItems = [
    { label: 'Overdue SLA', value: overdueCount, color: 'bg-rose-100 text-rose-700' },
    { label: 'Warning SLA', value: warningCount, color: 'bg-amber-100 text-amber-700' },
    { label: 'Low Stock', value: lowStock, color: 'bg-orange-100 text-orange-700' },
    { label: 'Due Maintenance', value: dueMaintenance, color: 'bg-violet-100 text-violet-700' }
  ];
  const totalAttention = attentionItems.reduce((s, i) => s + i.value, 0);

  return (
    <Layout>
      <div className="space-y-5">
        {/* ── Compact header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              Operations at a glance · <span className="text-slate-400">{formatDateTime(lastUpdated)}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canOpenUsers ? (
              <button
                type="button"
                onClick={() => navigate('/admin/user-management')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
              >
                Users
                <FiArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => navigate('/admin/analytics')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
            >
              Analytics
              <FiArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => loadDashboard({ silent: true })}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              <FiRefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {/* ── Stat cards (3 compact) ── */}
        <div className="grid gap-3 sm:grid-cols-3">
          {primaryMetrics.map((m) => (
            <StatCard key={m.label} {...m} />
          ))}
        </div>

        {/* ── Attention bar (replaces 4 focus cards) ── */}
        {totalAttention > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <span className="mr-1 text-sm font-medium text-slate-700">
              <FiAlertTriangle className="mr-1 inline h-3.5 w-3.5 text-amber-500" />
              Attention
            </span>
            {attentionItems
              .filter((i) => i.value > 0)
              .map((item) => (
                <span
                  key={item.label}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${item.color}`}
                >
                  {item.value} {item.label}
                </span>
              ))}
          </div>
        )}

        {/* ── Active Technicians inline indicator ── */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <FiUsers className="h-4 w-4 text-violet-500" />
          <span>
            <span className="font-semibold text-slate-800">{Number(overview.active_technicians || 0)}</span> active
            technicians on the field
          </span>
        </div>

        {/* ── Two-column: Approvals + Schedule ── */}
        <div className="grid gap-5 xl:grid-cols-2">
          {/* Pending Approvals */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Pending Approvals</h2>
              <button
                type="button"
                onClick={() => navigate('/admin/service-tickets')}
                className="text-sm font-medium text-sky-600 transition hover:text-sky-800"
              >
                View all →
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {loading && !stats ? (
                <p className="py-6 text-center text-sm text-slate-400">Loading approvals…</p>
              ) : pendingRequests.length ? (
                pendingRequests.slice(0, 5).map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">{req.client || 'Client not set'}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{req.service_type || 'Service not set'}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${getStatusTone(req.status)}`}>
                        {req.status || 'Pending'}
                      </span>
                      <span className="text-xs text-slate-400">{formatDate(req.request_date)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-slate-400">No approvals waiting.</p>
              )}
            </div>
          </div>

          {/* Upcoming Schedule */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Upcoming Schedule</h2>
              <button
                type="button"
                onClick={() => navigate('/admin/dispatch-board')}
                className="text-sm font-medium text-sky-600 transition hover:text-sky-800"
              >
                Dispatch board →
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {loading && !stats ? (
                <p className="py-6 text-center text-sm text-slate-400">Loading schedule…</p>
              ) : clientSchedule.length ? (
                clientSchedule.slice(0, 5).map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-800">{ticket.client || 'Client not set'}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {ticket.service_type || 'Service not set'}
                        {ticket.assigned_technician ? ` · ${ticket.assigned_technician}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${getStatusTone(ticket.status)}`}>
                        {ticket.status || 'Scheduled'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDate(ticket.scheduled_date)}
                        {ticket.scheduled_time ? ` ${ticket.scheduled_time}` : ''}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-slate-400">No scheduled visits yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Active Technician Jobs ── */}
        <ActiveTechnicianJobs 
          jobs={Array.isArray(stats?.active_technician_jobs) ? stats.active_technician_jobs : []}
          title="Technician Live Jobs"
        />

        {/* ── SLA Watchlist (compact table) ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">SLA Watchlist</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              <FiAlertTriangle className="h-3 w-3" />
              {slaQueue.length} items
            </span>
          </div>

          {loading && !stats ? (
            <p className="mt-4 py-6 text-center text-sm text-slate-400">Loading watchlist…</p>
          ) : slaQueue.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wider text-slate-400">
                    <th className="pb-2 pr-4">Client / Service</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">SLA</th>
                    <th className="pb-2">Schedule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {slaQueue.slice(0, 5).map((item) => {
                    const slaLabel = getDisplayText(item.sla) || 'SLA tracked';
                    return (
                      <tr key={`${item.entity_type || 'item'}-${item.id}`} className="text-slate-700">
                        <td className="py-2.5 pr-4">
                          <p className="font-medium text-slate-800">{item.client || 'Not set'}</p>
                          <p className="text-xs text-slate-500">{item.service_type || ''}</p>
                        </td>
                        <td className="py-2.5 pr-4 text-xs capitalize text-slate-500">
                          {item.entity_type === 'request' ? 'Request' : 'Ticket'}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${getStatusTone(item.status)}`}>
                            {item.status || 'Open'}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${getStatusTone(item.sla)}`}>
                            {slaLabel}
                          </span>
                        </td>
                        <td className="py-2.5 text-xs text-slate-500">
                          {item.scheduled_date ? formatDate(item.scheduled_date) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 py-6 text-center text-sm text-slate-400">SLA queue is clear.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
