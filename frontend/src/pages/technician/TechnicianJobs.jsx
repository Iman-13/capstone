import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/Layout';
import StatusBadge, { formatStatusLabel } from '../../components/StatusBadge';
import { fetchTechnicianJobs, updateJobStatus } from '../../api/api';
import { FiClipboard, FiEye, FiMapPin, FiUpload } from 'react-icons/fi';

const formatDateLabel = (value) => {
  if (!value) {
    return 'Schedule pending';
  }

  const parsedValue = new Date(value);
  if (Number.isNaN(parsedValue.getTime())) {
    return 'Schedule pending';
  }

  return parsedValue.toLocaleDateString();
};

export default function TechnicianJobs() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const techName = user?.username || 'Ade Johnson';
  const [jobs, setJobs] = useState([]);
  const [activeJob, setActiveJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [completionJob, setCompletionJob] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [error, setError] = useState('');
  const [proofImages, setProofImages] = useState([]);
  const [completionNotes, setCompletionNotes] = useState('');

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    const requestedTicketId = searchParams.get('ticketId');
    if (!requestedTicketId) {
      setSelectedJob(null);
      return;
    }

    const matchingJob = jobs.find(
      (job) => String(job.ticketId || job.id) === String(requestedTicketId)
    );
    if (matchingJob) {
      setSelectedJob(matchingJob);
    }
  }, [jobs, searchParams]);

  const loadJobs = async () => {
    try {
      const data = await fetchTechnicianJobs(techName);
      setJobs(data);
      
      // Find active job (In Progress or On Hold)
      const active = data.find(job => ['in_progress', 'on_hold'].includes(job.status?.toLowerCase()));
      setActiveJob(active || null);
      setError('');
    } catch (loadError) {
      setJobs([]);
      setActiveJob(null);
      setError(loadError.message || 'Unable to load jobs.');
    }
  };

  const openJobDetails = (job) => {
    setSelectedJob(job);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('ticketId', String(job.ticketId || job.id));
    setSearchParams(nextSearchParams, { replace: true });
  };

  const closeJobDetails = () => {
    setSelectedJob(null);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('ticketId');
    setSearchParams(nextSearchParams, { replace: true });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProofImages(prev => [...prev, event.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setProofImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleStatusUpdate = async (jobId, newStatus) => {
    // Check if trying to start a new job while one is active
    if (newStatus === 'in_progress' && activeJob && activeJob.id !== jobId) {
      setError(`You already have an active job (Ticket #${activeJob.id}). Please complete or hold it first.`);
      setTimeout(() => setError(''), 5000);
      return;
    }

    try {
      setActionMessage(`Updating job status to ${newStatus}...`);
      const response = await updateJobStatus(jobId, newStatus, '', []);
      
      // Check if backend returned an error (for the case where we bypass client-side check)
      if (response.error) {
        setError(response.error);
        setTimeout(() => setError(''), 5000);
        return;
      }
      
      await loadJobs();
      setActionMessage(`Job status updated to ${newStatus}.`);
      setTimeout(() => setActionMessage(''), 3000);
    } catch (error) {
      const errorMsg = error.message || 'Unable to update job status.';
      setError(errorMsg);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleCompleteJob = async () => {
    if (proofImages.length === 0) {
      setActionMessage('Please upload at least one proof image before completing the job.');
      return;
    }

    try {
      setActionMessage('Completing job with proof images...');
      await updateJobStatus(completionJob.id, 'completed', completionNotes, proofImages);
      await loadJobs();
      setCompletionJob(null);
      setProofImages([]);
      setCompletionNotes('');
      setActionMessage(`Job ${completionJob.id} completed with proof images.`);
      setTimeout(() => setActionMessage(''), 4000);
    } catch (completeError) {
      setActionMessage(completeError.message || 'Unable to complete job.');
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-slate-800">My Jobs ({jobs.length})</h2>
        <button
          onClick={loadJobs}
          className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      {/* Active Job Banner */}
      {activeJob && (
        <div className="mb-6 rounded-xl border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-blue-100 p-4 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide">🔴 Active Now</div>
              <div className="mt-1 text-lg font-bold text-blue-900">
                Ticket #{activeJob.id} • {activeJob.client}
              </div>
              <div className="mt-1 text-sm text-blue-800">
                {activeJob.service} • <span className="font-semibold">{activeJob.status}</span>
              </div>
            </div>
            <div className="text-right">
              <button
                onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set('ticketId', String(activeJob.id));
                  setSearchParams(params);
                  setSelectedJob(activeJob);
                }}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 transition"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      )}

      {actionMessage && (
        <div className="mb-4 rounded border-l-4 border-green-500 bg-green-100 p-3 text-green-800">
          {actionMessage}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-800">{error}</div>
      )}

      {jobs.length === 0 ? (
        <div className="py-12 text-center">
          <FiClipboard className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <h3 className="mb-2 text-lg font-medium text-slate-900">No jobs assigned</h3>
          <p className="text-slate-500">Check back later for new assignments.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md flex flex-col"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 line-clamp-2">{job.service}</h3>
                  <p className="text-xs text-slate-600">Ticket #{job.ticketId}</p>
                </div>
                <StatusBadge status={job.status} />
              </div>

              <div className="mb-3 space-y-1 text-xs">
                <p className="text-slate-700 font-medium truncate">{job.client}</p>
                <p className="text-slate-500 line-clamp-2">{job.address}</p>
              </div>

              <div className="mb-3 flex flex-wrap gap-1">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  job.assignmentRole === 'crew'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {job.assignmentRole === 'crew' ? 'Crew' : 'Lead'}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-semibold ${
                    job.priority === 'High'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {job.priority}
                </span>
              </div>

              <div className="mb-4 text-xs">
                <span className="text-slate-500">Scheduled: </span>
                <span className="text-slate-900 font-medium">{formatDateLabel(job.scheduledDate)}</span>
              </div>

              <div className="mt-auto flex flex-col gap-2">
                {job.status === 'not_started' && (
                  <button
                    onClick={() => handleStatusUpdate(job.id, 'in_progress')}
                    disabled={activeJob && activeJob.id !== job.id}
                    className={`rounded-lg px-3 py-2 text-xs font-medium text-white transition w-full ${
                      activeJob && activeJob.id !== job.id
                        ? 'bg-slate-300 cursor-not-allowed opacity-60'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                    title={activeJob && activeJob.id !== job.id ? `Complete Ticket #${activeJob.id} first` : ''}
                  >
                    {activeJob && activeJob.id !== job.id ? '❌ Complete Other Job First' : 'Start Job'}
                  </button>
                )}
                {job.status === 'on_hold' && (
                  <button
                    onClick={() => handleStatusUpdate(job.id, 'in_progress')}
                    disabled={activeJob && activeJob.id !== job.id && activeJob.status !== 'on_hold'}
                    className={`rounded-lg px-3 py-2 text-xs font-medium text-white transition w-full ${
                      activeJob && activeJob.id !== job.id && activeJob.status !== 'on_hold'
                        ? 'bg-slate-300 cursor-not-allowed opacity-60'
                        : 'bg-orange-500 hover:bg-orange-600'
                    }`}
                    title={activeJob && activeJob.id !== job.id && activeJob.status !== 'on_hold' ? `Complete Ticket #${activeJob.id} first` : ''}
                  >
                    {activeJob && activeJob.id !== job.id && activeJob.status !== 'on_hold' ? '❌ Complete Other Job First' : 'Resume Job'}
                  </button>
                )}
                {job.status === 'in_progress' && (
                  <button
                    onClick={() => setCompletionJob(job)}
                    className="rounded-lg bg-green-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-green-600 w-full"
                  >
                    Complete (Proof)
                  </button>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openJobDetails(job)}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-slate-200 px-2 py-2 text-xs text-slate-700 hover:bg-slate-300 font-medium"
                  >
                    <FiEye size={14} /> Details
                  </button>
                  <Link
                    to={`/technician/map-navigation?ticketId=${job.ticketId}`}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-500 px-2 py-2 text-xs text-white hover:bg-emerald-600 font-medium"
                  >
                    <FiMapPin size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
                onClick={closeJobDetails}
                className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600 hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-1 text-sm font-medium text-slate-500">Status</div>
                <StatusBadge status={selectedJob.status} size="sm" />
              </div>
              <div>
                <div className="mb-1 text-sm font-medium text-slate-500">Priority</div>
                <div className="text-slate-900">{selectedJob.priority}</div>
              </div>
              <div>
                <div className="mb-1 text-sm font-medium text-slate-500">Scheduled Date</div>
                <div className="text-slate-900">
                  {formatDateLabel(selectedJob.scheduledDate)}
                </div>
              </div>
              <div>
                <div className="mb-1 text-sm font-medium text-slate-500">Address</div>
                <div className="text-slate-900">{selectedJob.address || 'Location pending'}</div>
              </div>
              <div>
                <div className="mb-1 text-sm font-medium text-slate-500">Lead Technician</div>
                <div className="text-slate-900">{selectedJob.leadTechnician || 'Unassigned'}</div>
              </div>
              <div>
                <div className="mb-1 text-sm font-medium text-slate-500">Assignment Role</div>
                <div className="text-slate-900">
                  {selectedJob.assignmentRole === 'crew' ? 'Crew Member' : 'Lead Technician'}
                </div>
              </div>
            </div>

            {selectedJob.crewMembers?.length > 0 && (
              <div className="mt-4 rounded-xl bg-emerald-50 p-4">
                <div className="mb-1 text-sm font-medium text-emerald-700">Assigned Crew</div>
                <div className="text-sm text-emerald-900">
                  {selectedJob.crewMembers.map((member) => member.name).join(', ')}
                </div>
              </div>
            )}

            {selectedJob.notes && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <div className="mb-1 text-sm font-medium text-slate-500">Work Notes</div>
                <div className="text-sm text-slate-700">{selectedJob.notes}</div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={`/technician/map-navigation?ticketId=${selectedJob.ticketId}`}
                className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600"
              >
                <FiMapPin size={16} /> Open Navigation
              </Link>
              <Link
                to={`/technician/checklist?ticketId=${selectedJob.ticketId}`}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Open Checklist
              </Link>
            </div>
          </div>
        </div>
      )}

      {completionJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Complete Job - Upload Proof</h3>
                <p className="text-slate-600">
                  Ticket #{completionJob.ticketId} for {completionJob.client}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCompletionJob(null);
                  setProofImages([]);
                  setCompletionNotes('');
                }}
                className="rounded-lg bg-slate-100 px-3 py-2 text-slate-600 hover:bg-slate-200"
              >
                Close
              </button>
            </div>

            <div className="space-y-6">
              {/* Proof Images Upload */}
              <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-6">
                <label className="block mб-2 text-sm font-semibold text-slate-900">
                  <FiUpload className="mr-2 inline" /> Upload Proof Images (Required)
                </label>
                <p className="mb-4 text-sm text-slate-600">
                  Upload photos showing the completed work as proof of service delivery.
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="mb-4 block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-blue-500 file:px-4 file:py-2 file:text-white hover:file:bg-blue-600"
                />

                {proofImages.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-700">
                      {proofImages.length} image(s) selected
                    </p>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {proofImages.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={img}
                            alt={`Proof ${idx + 1}`}
                            className="h-24 w-full rounded-lg border border-slate-200 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Completion Notes */}
              <div>
                <label className="block mb-2 text-sm font-semibold text-slate-900">
                  Completion Notes (Optional)
                </label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Describe the work completed, any issues encountered, recommendations for client, etc."
                  className="h-24 w-full rounded-lg border border-slate-300 p-3 text-slate-800 placeholder-slate-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCompleteJob}
                  disabled={proofImages.length === 0}
                  className={`flex-1 rounded-lg px-6 py-3 font-medium text-white transition ${
                    proofImages.length === 0
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  Complete Job with Proof
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCompletionJob(null);
                    setProofImages([]);
                    setCompletionNotes('');
                  }}
                  className="rounded-lg bg-slate-200 px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>

              {proofImages.length === 0 && (
                <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                  ⚠️ At least one proof image is required to complete the job.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
