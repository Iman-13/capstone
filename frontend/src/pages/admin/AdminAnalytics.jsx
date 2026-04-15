import { useEffect, useState } from 'react';
import {
  FiRefreshCw
} from 'react-icons/fi';
import Layout from '../../components/Layout';
import { fetchAdminAnalytics, fetchDashboardStats } from '../../api/api';
import {
  AUTO_REFRESH_MS,
  formatCompactNumber,
  formatPercent,
  formatDateTime,
  toneStyles,
  demandTone,
  createLinePoints
} from '../../utils/dashboardHelpers';

/* ───────────────────────── Charts ───────────────────────── */

function EmptyChart({ title, description }) {
  return (
    <div className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
      <div>
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}

/* ─── Key Metrics horizontal bar chart (replaces stat cards) ─── */
function KeyMetricsBar({ data }) {
  const items = [
    { label: 'Total Requests', value: Number(data.total || 0), color: '#0ea5e9' },
    { label: 'Completed', value: Number(data.completed || 0), color: '#10b981' },
    { label: 'Pending', value: Number(data.pending || 0), color: '#f59e0b' },
    { label: 'Active Technicians', value: Number(data.technicians || 0), color: '#8b5cf6' }
  ];

  const maxValue = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-lg font-semibold text-slate-900">Key Metrics</h3>
      <p className="mt-1 text-xs text-slate-500">At-a-glance comparison of core request figures.</p>

      <div className="mt-5 space-y-3">
        {items.map((item) => {
          const width = Math.max(8, (item.value / maxValue) * 100);
          return (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{item.label}</span>
                <span className="font-semibold text-slate-900">{formatCompactNumber(item.value)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100">
                <div
                  className="h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${width}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Operational Focus donut (SLA / stock / maintenance) ─── */
function OperationalFocusDonut({ segments }) {
  const safe = Array.isArray(segments) ? segments.filter((s) => Number(s.value || 0) > 0) : [];
  const total = safe.reduce((sum, s) => sum + Number(s.value || 0), 0);

  let start = 0;
  const stops = safe.map((s) => {
    const size = total ? (Number(s.value || 0) / total) * 360 : 0;
    const stop = `${s.color} ${start}deg ${start + size}deg`;
    start += size;
    return stop;
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-lg font-semibold text-slate-900">Operational Focus</h3>
      <p className="mt-1 text-xs text-slate-500">Where admin attention is needed today.</p>

      <div className="mt-5 grid items-center gap-5 lg:grid-cols-[160px_1fr]">
        <div className="grid place-items-center">
          <div
            className="grid h-36 w-36 place-items-center rounded-full"
            style={{ background: total ? `conic-gradient(${stops.join(', ')})` : '#e2e8f0' }}
          >
            <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-center shadow-sm">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Total</p>
                <p className="mt-0.5 text-xl font-semibold text-slate-900">{total}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {(safe.length ? safe : segments).map((s) => {
            const value = Number(s.value || 0);
            const pct = total ? ((value / total) * 100).toFixed(0) : 0;
            return (
              <div key={s.label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <div className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm text-slate-700">{s.label}</span>
                </div>
                <span className="text-sm text-slate-500">{value} · {pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Monthly Service Trend ─── */
function MonthlyServiceChart({ data }) {
  const chartData = Array.isArray(data) ? data.slice(-6) : [];

  if (!chartData.length) {
    return <EmptyChart title="Monthly trend unavailable" description="History will appear when analytics data is ready." />;
  }

  const width = 480;
  const height = 220;
  const px = 34;
  const py = 24;
  const max = Math.max(1, ...chartData.map((d) => Number(d.requestCount || 0)), ...chartData.map((d) => Number(d.completedCount || 0)));
  const reqPts = createLinePoints(chartData, width, height, px, py, (d) => d.requestCount, max);
  const cmpPts = createLinePoints(chartData, width, height, px, py, (d) => d.completedCount, max);
  const reqLine = reqPts.map((p) => `${p.x},${p.y}`).join(' ');
  const cmpLine = cmpPts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">Monthly Service Trend</h3>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-900" />Requests</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-600" />Completed</span>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full min-w-[380px]">
          {[0.25, 0.5, 0.75, 1].map((s) => {
            const y = height - py - s * (height - py * 2);
            return <line key={s} x1={px} y1={y} x2={width - px} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" />;
          })}
          <polyline fill="none" stroke="#0f172a" strokeWidth="2.5" points={reqLine} strokeLinecap="round" strokeLinejoin="round" />
          <polyline fill="none" stroke="#2563eb" strokeWidth="2.5" points={cmpLine} strokeLinecap="round" strokeLinejoin="round" />
          {reqPts.map((p, i) => (
            <g key={chartData[i]?.label || i}>
              <circle cx={p.x} cy={p.y} r="3.5" fill="#0f172a" />
              <circle cx={cmpPts[i].x} cy={cmpPts[i].y} r="3.5" fill="#2563eb" />
              <text x={p.x} y={height - 4} textAnchor="middle" className="fill-slate-500 text-[10px]">{chartData[i].label}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ─── Top Services Bar ─── */
function ServiceBarChart({ data }) {
  const chartData = Array.isArray(data) ? data.slice(0, 5) : [];

  if (!chartData.length) {
    return <EmptyChart title="Top services unavailable" description="Bars will appear once request data is available." />;
  }

  const max = Math.max(1, ...chartData.map((d) => Number(d.requestCount ?? d.count ?? 0)));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-lg font-semibold text-slate-900">Top Requested Services</h3>
      <p className="mt-1 text-xs text-slate-500">Which services drive most of the workload.</p>

      <div className="mt-4 space-y-3">
        {chartData.map((item) => {
          const label = item.serviceType || item.name || 'Unknown';
          const reqCount = Number(item.requestCount ?? item.count ?? 0);
          const cmpCount = Number(item.completedCount ?? item.completedRequests ?? 0);
          const w = Math.max(10, (reqCount / max) * 100);

          return (
            <div key={label}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{label}</span>
                <span className="text-slate-500">{reqCount} req · {cmpCount} done</span>
              </div>
              <div className="mt-1.5 h-2.5 rounded-full bg-slate-100">
                <div className="h-2.5 rounded-full bg-sky-500" style={{ width: `${w}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── 7-Day Demand Forecast ─── */
function ForecastAreaChart({ data }) {
  const chartData = Array.isArray(data) ? data.slice(0, 7) : [];

  if (!chartData.length) {
    return <EmptyChart title="Forecast unavailable" description="Seven-day projection needs more data." />;
  }

  const width = 480;
  const height = 220;
  const px = 34;
  const py = 24;
  const max = Math.max(1, ...chartData.map((d) => Number(d.predictedRequests || 0)));
  const pts = createLinePoints(chartData, width, height, px, py, (d) => d.predictedRequests, max);
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = [
    `M ${pts[0].x} ${height - py}`,
    ...pts.map((p) => `L ${p.x} ${p.y}`),
    `L ${pts[pts.length - 1].x} ${height - py}`,
    'Z'
  ].join(' ');
  const busiest = [...chartData].sort((a, b) => Number(b.predictedRequests || 0) - Number(a.predictedRequests || 0))[0];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">7-Day Demand Forecast</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${demandTone[busiest?.demandLevel] || 'bg-slate-100 text-slate-700'}`}>
          Peak: {busiest?.label || 'N/A'}
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full min-w-[380px]">
          {[0.25, 0.5, 0.75, 1].map((s) => {
            const y = height - py - s * (height - py * 2);
            return <line key={s} x1={px} y1={y} x2={width - px} y2={y} stroke="#e2e8f0" strokeDasharray="4 6" />;
          })}
          <path d={areaPath} fill="#dbeafe" />
          <polyline fill="none" stroke="#0f172a" strokeWidth="2.5" points={polyline} strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <g key={chartData[i]?.label || i}>
              <circle cx={p.x} cy={p.y} r="3.5" fill="#0f172a" />
              <text x={p.x} y={height - 4} textAnchor="middle" className="fill-slate-500 text-[10px]">{chartData[i].label}</text>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {chartData.slice(0, 3).map((item) => (
          <div key={item.date || item.label} className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-xs font-medium text-slate-600">{item.label}</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{item.predictedRequests || 0}</p>
            <p className="text-[11px] text-slate-400">Gap {item.capacityGap || 0}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadAnalytics = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError('');
      const [analyticsData, dashboardData] = await Promise.all([
        fetchAdminAnalytics(),
        fetchDashboardStats('admin')
      ]);
      setAnalytics(analyticsData || {});
      setDashboardStats(dashboardData || {});
      setLastUpdated(analyticsData?.generatedAt || new Date().toISOString());
    } catch (err) {
      setError(err.message || 'Unable to load admin analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();

    const intervalId = window.setInterval(() => {
      loadAnalytics({ silent: true });
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  const overview = analytics?.overview || {};
  const monthlyServiceTrend = Array.isArray(analytics?.monthlyServiceTrend) ? analytics.monthlyServiceTrend : [];
  const topServices = Array.isArray(analytics?.topRequestedServiceTypes) && analytics.topRequestedServiceTypes.length
    ? analytics.topRequestedServiceTypes
    : (Array.isArray(analytics?.jobCountByService) ? analytics.jobCountByService : []);
  const dailyForecast = Array.isArray(analytics?.dailyForecast) ? analytics.dailyForecast : [];
  const pendingRequests = Array.isArray(dashboardStats?.pending_requests) ? dashboardStats.pending_requests : [];
  const clientSchedule = Array.isArray(dashboardStats?.client_schedule) ? dashboardStats.client_schedule : [];
  const slaOverview = dashboardStats?.sla_overview || {};
  const dashOverview = dashboardStats?.overview || {};

  /* Data for the new Key Metrics bar chart */
  const keyMetricsData = {
    total: analytics?.totalRequests ?? overview.totalRequests ?? 0,
    completed: analytics?.completedRequests ?? overview.completedRequests ?? 0,
    pending: analytics?.pendingRequests ?? overview.pendingRequests ?? 0,
    technicians: analytics?.activeTechnicians ?? overview.activeTechnicians ?? 0
  };

  /* Data for Operational Focus donut */
  const focusSegments = [
    { label: 'Overdue SLA', value: Number(slaOverview.overdue_count || 0), color: '#ef4444' },
    { label: 'Warning SLA', value: Number(slaOverview.warning_count || 0), color: '#f97316' },
    { label: 'Low Stock', value: Number(dashOverview.low_stock_items || 0), color: '#f59e0b' },
    { label: 'Due Maintenance', value: Number(dashOverview.due_maintenance || 0), color: '#8b5cf6' },
    { label: 'Pending Approvals', value: pendingRequests.length, color: '#0ea5e9' },
    { label: 'Scheduled Visits', value: clientSchedule.length, color: '#06b6d4' }
  ];

  return (
    <Layout>
      <div className="space-y-5">
        {/* ── Compact header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
            <p className="mt-1 text-sm text-slate-500">
              Graphs &amp; trends for admin reporting ·{' '}
              <span className="text-slate-400">{formatDateTime(lastUpdated)}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-700">
              {formatCompactNumber(analytics?.avgResponseTime ?? overview.avgResponseTimeHours)}h avg response
            </span>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">
              {formatCompactNumber(analytics?.avgCompletionTime ?? overview.avgCompletionTimeHours)}h avg completion
            </span>
            <button
              type="button"
              onClick={() => loadAnalytics({ silent: true })}
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

        {/* ── Row 1: Key Metrics bar + Operational Focus donut ── */}
        <div className="grid gap-5 xl:grid-cols-2">
          <KeyMetricsBar data={keyMetricsData} />
          <OperationalFocusDonut segments={focusSegments} />
        </div>

        {/* ── Row 2: Monthly trend + Top services ── */}
        <div className="grid gap-5 xl:grid-cols-2">
          <MonthlyServiceChart data={monthlyServiceTrend} />
          <ServiceBarChart data={topServices} />
        </div>

        {/* ── Row 3: Forecast (full width) ── */}
        <ForecastAreaChart data={dailyForecast} />

        {loading && !analytics ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            Loading analytics…
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
