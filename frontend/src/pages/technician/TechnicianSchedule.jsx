import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import { fetchTechnicianSchedule } from '../../api/api';
import { FiMapPin, FiClock, FiCalendar } from 'react-icons/fi';

export default function TechnicianSchedule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const techName = user?.username || 'Ade Johnson';
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const data = await fetchTechnicianSchedule(techName);
      setSchedule(data);
      setError('');
    } catch (err) {
      setSchedule([]);
      setError(err.message || 'Unable to load schedule.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr) => new Date(dateStr).toLocaleString('en-US', { 
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-semibold text-slate-800">My Schedule</h2>
        <button onClick={loadSchedule} disabled={loading} className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2">
          <FiClock /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">{error}</div>
      ) : schedule.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border-2 border-dashed border-slate-200">
          <FiCalendar className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No scheduled jobs</h3>
          <p className="text-slate-500 mb-4">Your schedule will appear here when jobs are assigned.</p>
          <p className="text-sm text-slate-400">Check My Jobs for current assignments</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {schedule.map((item) => (
            <div key={item.id} className="group bg-white rounded-2xl p-4 shadow-md border border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all flex flex-col">
              {/* Card Header */}
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold inline-block">
                    {item.service}
                  </div>
                </div>
                <StatusBadge status={item.status} size="sm" />
              </div>

              {/* Client Name */}
              <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">{item.client}</h3>

              {/* Scheduled Date */}
              <div className="mb-3 text-sm">
                <p className="text-slate-500 text-xs mb-1">Scheduled</p>
                <p className="text-slate-900 font-semibold">{formatTime(item.scheduledDate)}</p>
              </div>

              {/* Location */}
              <div className="mb-3 text-sm">
                <p className="text-slate-500 text-xs mb-1">Location</p>
                <p className="text-slate-700 flex items-start gap-1">
                  <FiMapPin className="flex-shrink-0 mt-0.5" size={14} />
                  <span className="line-clamp-2">{item.address || 'Location TBD'}</span>
                </p>
              </div>

              {/* Priority Badge */}
              <div className="mb-3">
                <div className={`px-2 py-1 rounded-full text-xs font-medium w-max ${
                  item.priority === 'High' ? 'bg-red-100 text-red-800' :
                  item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                }`}>
                  {item.priority || 'Normal'} Priority
                </div>
              </div>

              {/* Notes */}
              {item.notes && (
                <div className="mb-4 flex-1">
                  <p className="text-xs text-slate-500 line-clamp-2">{item.notes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 mt-auto">
                <button
                  type="button"
                  onClick={() => navigate(`/technician/my-jobs?ticketId=${item.ticketId || item.id}`)}
                  className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-xs font-medium transition-colors"
                >
                  View Details
                </button>
                <a href={`/technician/map-navigation?ticketId=${item.ticketId || item.id}`} className="px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-xs font-medium flex items-center justify-center gap-1 transition-colors">
                  <FiMapPin size={14} /> Navigate
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl text-center">
        <FiCalendar className="mx-auto h-12 w-12 opacity-75 mb-4" />
        <h3 className="text-xl font-bold mb-2">Smart Scheduling</h3>
        <p className="opacity-90">Jobs optimized for your location and skills. GPS tracking enabled.</p>
      </div>
    </Layout>
  );
}
