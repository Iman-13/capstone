import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import { fetchTechnicianHistory } from '../../api/api';
import { FiDownload, FiEye, FiFileText, FiImage } from 'react-icons/fi';

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const buildHistoryReport = (job) => `AFN Technician Job Report
Ticket: #${job.ticketId}
Client: ${job.client}
Service: ${job.service}
Completed: ${formatDate(job.scheduledDate)}
Priority: ${job.priority || 'Normal'}
Address: ${job.address || 'Not provided'}

Notes:
${job.notes || 'No notes captured for this completed job.'}
`;

export default function TechnicianJobHistory() {
  const { user } = useAuth();
  const techName = user?.username || 'Ade Johnson';
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [imageViewer, setImageViewer] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    const data = await fetchTechnicianHistory(techName);
    setHistory(data);
    setLoading(false);
  };

  const downloadHistoryReport = (job) => {
    const reportBlob = new Blob([buildHistoryReport(job)], { type: 'text/plain;charset=utf-8' });
    const reportUrl = URL.createObjectURL(reportBlob);
    const link = document.createElement('a');
    link.href = reportUrl;
    link.download = `ticket-${job.ticketId}-report.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(reportUrl);
  };

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-slate-800">Job History</h2>
        <button
          onClick={loadHistory}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-slate-100 px-6 py-2 text-slate-700 transition hover:bg-slate-200"
        >
          <FiDownload /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-slate-400"></div>
          <p className="text-slate-500">Loading history...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 py-20 text-center">
          <FiFileText className="mx-auto mb-6 h-16 w-16 text-slate-400" />
          <h3 className="mb-3 text-2xl font-bold text-slate-900">No completed jobs yet</h3>
          <p className="mx-auto mb-8 max-w-md text-slate-600">
            Your completed service history will appear here. Check My Jobs for current work.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {history.map((job) => (
            <div
              key={job.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md hover:shadow-lg hover:border-green-300 transition-all flex flex-col"
            >
              {/* Status Badge */}
              <div className="mb-3">
                <div className="inline-block rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-3 py-1 font-semibold text-xs text-white">
                  COMPLETED
                </div>
              </div>

              {/* Service Type */}
              <div className="mb-2">
                <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
                  {job.service}
                </span>
              </div>

              {/* Client Name */}
              <h3 className="mb-3 text-lg font-bold text-slate-900 line-clamp-2">{job.client}</h3>

              {/* Ticket Info */}
              <div className="mb-3 space-y-2 text-sm">
                <div>
                  <span className="text-slate-500 text-xs">Ticket ID</span>
                  <div className="font-semibold text-slate-900">#{job.ticketId}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-xs">Completed</span>
                  <div className="font-semibold text-slate-900">{formatDate(job.scheduledDate)}</div>
                </div>
                {job.priority && (
                  <div>
                    <span className="text-slate-500 text-xs">Priority</span>
                    <div
                      className={`rounded-full px-2 py-1 text-xs font-semibold w-max ${
                        job.priority === 'High'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {job.priority}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              {job.notes && (
                <div className="mb-3 rounded-lg border-l-4 border-green-400 bg-green-50 p-2 flex-1">
                  <span className="block text-xs leading-relaxed text-green-700 line-clamp-2">{job.notes}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-auto flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedJob(job)}
                  className="flex items-center justify-center gap-1 rounded-lg bg-blue-500 px-3 py-2 font-medium text-white text-xs hover:bg-blue-600 transition-colors"
                >
                  <FiEye size={14} /> Details
                </button>
                {job.completion_proof_images && job.completion_proof_images.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setImageViewer(job)}
                    className="flex items-center justify-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 font-medium text-white text-xs hover:bg-emerald-600 transition-colors"
                  >
                    <FiImage size={14} /> Photos ({job.completion_proof_images.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => downloadHistoryReport(job)}
                  className="flex items-center justify-center gap-1 rounded-lg bg-slate-100 px-3 py-2 font-medium text-slate-700 text-xs hover:bg-slate-200 transition-colors"
                >
                  <FiDownload size={14} /> Report
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 p-8 md:col-span-2">
          <h4 className="mb-4 text-lg font-semibold text-slate-900">Performance Summary</h4>
          <p className="leading-relaxed text-slate-600">
            {history.length > 0
              ? `Completed ${history.length} jobs across ${new Set(history.map((entry) => entry.service)).size} service types. Your work history demonstrates consistent quality.`
              : 'Your performance metrics will appear here as you complete more jobs.'}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
          <h4 className="mb-6 text-center text-lg font-semibold">Total Jobs</h4>
          <div className="text-center text-4xl font-bold text-slate-900">{history.length}</div>
        </div>
      </div>

      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{selectedJob.service}</h3>
                <p className="text-slate-600">
                  Ticket #{selectedJob.ticketId} for {selectedJob.client}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600 hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 text-sm font-medium text-slate-500">Completed Date</div>
                <div className="text-slate-900">{formatDate(selectedJob.scheduledDate)}</div>
              </div>
              <div>
                <div className="mb-1 text-sm font-medium text-slate-500">Priority</div>
                <div className="text-slate-900">{selectedJob.priority || 'Normal'}</div>
              </div>
              <div className="md:col-span-2">
                <div className="mb-1 text-sm font-medium text-slate-500">Address</div>
                <div className="text-slate-900">{selectedJob.address || 'No address recorded.'}</div>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <div className="mb-1 text-sm font-medium text-slate-500">Completion Notes</div>
              <div className="text-sm text-slate-700">
                {selectedJob.notes || 'No notes were captured for this completed job.'}
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => downloadHistoryReport(selectedJob)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Download This Report
              </button>
            </div>
          </div>
        </div>
      )}

      {imageViewer && imageViewer.completion_proof_images && imageViewer.completion_proof_images.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Proof Images</h3>
                <p className="text-slate-600">
                  Ticket #{imageViewer.ticketId} - {imageViewer.client}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImageViewer(null)}
                className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600 hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {imageViewer.completion_proof_images.map((image, idx) => (
                <div
                  key={idx}
                  className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                >
                  <img
                    src={image}
                    alt={`Proof ${idx + 1}`}
                    className="h-48 w-full object-cover hover:scale-105 transition"
                  />
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-slate-900 to-transparent p-3 opacity-0 hover:opacity-100 transition">
                    <span className="text-sm font-medium text-white">Image {idx + 1}</span>
                  </div>
                </div>
              ))}
            </div>

            {imageViewer.completion_notes && (
              <div className="mt-6 rounded-xl border-l-4 border-blue-500 bg-blue-50 p-4">
                <h4 className="mb-2 font-semibold text-blue-900">Work Notes</h4>
                <p className="text-sm text-blue-800">{imageViewer.completion_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

