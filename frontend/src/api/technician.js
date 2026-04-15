import { api, getApiErrorMessage } from './core';

const toNumericId = (value, fallback = null) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const toNumber = (value, fallback = null) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const normalizeTechnicianJob = (job) => ({
  ...job,
  crewMembers: Array.isArray(job?.crew_members)
    ? job.crew_members.map((member) => ({
        ...member,
        name: member?.name || member?.username || 'Technician'
      }))
    : [],
  service: job.service || job.service_type || job.serviceType || 'Service',
  serviceType: job.service_type || job.serviceType || job.service || 'Service',
  ticketId: toNumericId(job.id, toNumericId(job.ticketId, toNumericId(job.ticket_id))),
  ticketCode: job.ticket_id || (job.id != null ? `TKT-${job.id}` : ''),
  scheduledDate: job.scheduledDate || job.scheduled_date,
  address: job.address || job.location || '',
  location: job.location || job.address || '',
  latitude: toNumber(job.latitude),
  longitude: toNumber(job.longitude),
  status: String(job.status || '').toLowerCase().replace(/\s+/g, '_'),
  assignmentRole: job.assignment_role || job.assignmentRole || 'lead',
  leadTechnician: job.lead_technician || job.technician || '',
  crewSummary: Array.isArray(job?.crew_members)
    ? job.crew_members.map((member) => member?.name || member?.username || 'Technician').join(', ')
    : ''
});

export const fetchTechnicianJobs = async (techName) => {
  try {
    const { data } = await api.get('/technician/jobs/', { params: { techName } });
    const jobArray = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
    return Array.isArray(jobArray) ? jobArray.map(normalizeTechnicianJob) : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to load technician jobs.'));
  }
};

export const fetchTechnicianJob = async (ticketId) => {
  try {
    const { data } = await api.get(`/technician/jobs/${ticketId}/`);
    return normalizeTechnicianJob(data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to load technician job details.'));
  }
};

export const fetchTechnicianSchedule = async (techName) => {
  try {
    const { data } = await api.get('/technician/schedule/', { params: { techName } });
    const scheduleArray = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
    return Array.isArray(scheduleArray) ? scheduleArray.map(normalizeTechnicianJob) : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to load technician schedule.'));
  }
};

export const fetchTechnicianDashboard = async (techName) => {
  try {
    const { data } = await api.get('/technician/dashboard/', { params: { techName } });
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to load technician dashboard.'));
  }
};

export const fetchTechnicianProfile = async (techName) => {
  try {
    const { data } = await api.get('/technician/profile/', { params: { techName } });
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to load technician profile.'));
  }
};

export const updateTechnicianProfile = async (techNameOrPayload, updates) => {
  try {
    const resolvedUpdates = typeof techNameOrPayload === 'object' ? techNameOrPayload.updates : updates;
    const { data } = await api.put('/technician/profile/', resolvedUpdates);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to update technician profile.'));
  }
};

export const fetchTechnicianHistory = async (techName) => {
  try {
    const { data } = await api.get('/technician/history/', { params: { techName } });
    const historyArray = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
    return Array.isArray(historyArray) ? historyArray.map(normalizeTechnicianJob) : [];
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to load technician history.'));
  }
};

export const updateJobStatus = async (jobId, status, notes = '', images = []) => {
  try {
    const payload = { status };
    
    // If completing job, include proof images and notes
    if (status === 'completed') {
      payload.completion_notes = notes;
      payload.completion_proof_images = images;
    }
    
    const { data } = await api.post(`/technician/jobs/${jobId}/status/`, payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to update job status.'));
  }
};

export const submitChecklist = async (checklist) => {
  try {
    const formData = new FormData();
    const {
      photos = [],
      videos = [],
      proof_media,
      ...rest
    } = checklist;

    for (const [key, value] of Object.entries(rest)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }

      if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else if (typeof value === 'boolean') {
        formData.append(key, value ? 'true' : 'false');
      } else {
        formData.append(key, String(value));
      }
    }

    if (proof_media !== undefined && proof_media !== null) {
      formData.append('proof_media', JSON.stringify(proof_media));
    }

    for (const photo of photos) {
      if (photo instanceof File) {
        formData.append('photo_files', photo);
      } else if (photo !== undefined && photo !== null && photo !== '') {
        formData.append('photos', String(photo));
      }
    }

    for (const video of videos) {
      if (video instanceof File) {
        formData.append('video_files', video);
      } else if (video !== undefined && video !== null && video !== '') {
        formData.append('videos', String(video));
      }
    }

    const { data } = await api.post('/checklist/', formData);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Unable to submit checklist.'));
  }
};
