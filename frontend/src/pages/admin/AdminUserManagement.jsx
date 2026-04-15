import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import {
  createAdminClient,
  createAdminTechnician,
  createAdminUser,
  deactivateAdminUser,
  deleteAdminClient,
  deleteAdminTechnician,
  fetchAdminUsers,
  fetchAssignableCapabilities,
  fetchUserCapabilities,
  updateAdminClient,
  updateAdminTechnician,
  updateAdminUser,
  updateUserCapabilities
} from '../../api/api';
import {
  TECHNICIAN_ACCESS_CAPABILITIES,
  USER_DIRECTORY_CAPABILITIES,
  canReceiveDelegatedAuthority,
  canManageStaffAccess,
  canManageStaffTargetRole,
  hasAnyCapability
} from '../../rbac';

const ROLE_SECTIONS = [
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'admin', label: 'Administrators' },
  { value: 'supervisor', label: 'Supervisors' },
  { value: 'technician', label: 'Technicians' },
  { value: 'follow_up', label: 'After Sales' },
  { value: 'client', label: 'Clients' }
];
const CREATE_ROLE_SECTIONS = ROLE_SECTIONS.filter((section) => section.value !== 'superadmin');
const TECH_CAP_SET = new Set(TECHNICIAN_ACCESS_CAPABILITIES);
const inputClass = 'rounded-xl border p-2';
const panelClass = 'rounded-2xl bg-white p-6 shadow-sm';
const emptyCreate = { username: '', name: '', role: 'technician', email: '', phone: '', address: '', status: 'available', password: '', passwordConfirm: '' };
const emptyEdit = { name: '', email: '', phone: '', address: '', status: 'available', lat: '', lng: '' };

const getRoleLabel = (role) => ROLE_SECTIONS.find((section) => section.value === role)?.label || role || 'Unknown';
const getEntityLabel = (role) => (role === 'technician' ? 'Technician' : role === 'client' ? 'Client' : 'User');
const getAllowedRoleFilter = (canViewAllUsers, search) => {
  const requested = new URLSearchParams(search).get('role');
  const allowed = canViewAllUsers ? ['all', ...ROLE_SECTIONS.map((section) => section.value)] : ['technician'];
  return allowed.includes(requested) ? requested : (canViewAllUsers ? 'all' : 'technician');
};
const getTechnicianStatusLabel = (status) => (status === 'available' ? 'Available' : status === 'on_job' ? 'On job' : 'Offline');
const sanitizeCapabilities = (capabilities = [], availableCapabilities = []) => {
  const allowedCapabilities = new Set((availableCapabilities || []).map((item) => item.code));
  return capabilities.filter((capability) => allowedCapabilities.has(capability));
};
const matchesSearch = (user, query) => !query || [
  user.username,
  user.name,
  user.email,
  user.phone,
  user.address,
  user.role,
  getRoleLabel(user.role),
  user.role === 'technician' ? getTechnicianStatusLabel(user.technicianStatus) : '',
  user.active ? 'active' : 'inactive'
].some((value) => String(value || '').toLowerCase().includes(query));
const getDetails = (user) => {
  if (user.role === 'technician') {
    const hasCoords = Boolean(Number(user.lat) || Number(user.lng));
    return hasCoords ? `${getTechnicianStatusLabel(user.technicianStatus)} | ${Number(user.lat).toFixed(5)}, ${Number(user.lng).toFixed(5)}` : getTechnicianStatusLabel(user.technicianStatus);
  }
  if (user.role === 'client') return user.address || 'No address on file';
  return user.active ? 'Active account' : 'Inactive account';
};

export default function AdminUserManagement() {
  const location = useLocation();
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';
  const canViewAllUsers = isSuperadmin || (user?.role === 'admin' && hasAnyCapability(user, USER_DIRECTORY_CAPABILITIES));
  const allowCapabilityManagement = canManageStaffAccess(user);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState(() => getAllowedRoleFilter(canViewAllUsers, location.search));
  const [editingProfileUser, setEditingProfileUser] = useState(null);
  const [editingAccessUser, setEditingAccessUser] = useState(null);
  const [editingCapabilities, setEditingCapabilities] = useState([]);
  const [busyUserId, setBusyUserId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  const load = async ({ preserveFeedback = false } = {}) => {
    setLoading(true);
    try {
      const fetchedUsers = await fetchAdminUsers();
      setUsers([...fetchedUsers].sort((left, right) => Number(right.id || 0) - Number(left.id || 0)));
      if (!preserveFeedback) {
        setMessage('');
        setError('');
      }
    } catch (loadError) {
      setUsers([]);
      if (!preserveFeedback) setMessage('');
      setError(loadError.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setRoleFilter(getAllowedRoleFilter(canViewAllUsers, location.search)); }, [canViewAllUsers, location.search]);
  useEffect(() => {
    let isMounted = true;
    if (!allowCapabilityManagement) {
      setCatalog([]);
      return () => { isMounted = false; };
    }
    fetchAssignableCapabilities().then((capabilities) => {
      if (isMounted) setCatalog(Array.isArray(capabilities) ? capabilities : []);
    }).catch(() => {
      if (isMounted) setCatalog([]);
    });
    return () => { isMounted = false; };
  }, [allowCapabilityManagement]);

  const visibleUsers = (canViewAllUsers ? users : users.filter((record) => canManageStaffTargetRole(record.role)))
    .filter((record) => (roleFilter === 'all' || record.role === roleFilter) && matchesSearch(record, searchTerm.trim().toLowerCase()));

  const canManageAccessTarget = (role) => isSuperadmin
    ? ['admin', 'supervisor', 'follow_up'].includes(role)
    : false;

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!isSuperadmin) return;
    setMessage('');
    setError('');
    if (!createForm.username.trim()) return setError('Username is required.');
    if (!createForm.password) return setError('Password is required.');
    if (createForm.password !== createForm.passwordConfirm) return setError('Passwords do not match.');
    const basePayload = { username: createForm.username, name: createForm.name, role: createForm.role, email: createForm.email, phone: createForm.phone, password: createForm.password, passwordConfirm: createForm.passwordConfirm };
    setIsSubmitting(true);
    try {
      if (createForm.role === 'technician') await createAdminTechnician({ ...basePayload, status: createForm.status });
      else if (createForm.role === 'client') await createAdminClient({ ...basePayload, address: createForm.address });
      else await createAdminUser(basePayload);
      setCreateForm(emptyCreate);
      setMessage(`${getEntityLabel(createForm.role)} created.`);
      await load({ preserveFeedback: true });
    } catch (createError) {
      setError(createError.message || 'Failed to create user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openProfileEditor = (record) => {
    setEditingProfileUser(record);
    setEditForm({ name: record.name || '', email: record.email || '', phone: record.phone || '', address: record.address || '', status: record.role === 'technician' ? record.technicianStatus || 'available' : 'available', lat: record.lat || '', lng: record.lng || '' });
    setMessage('');
    setError('');
  };

  const saveProfile = async () => {
    if (!editingProfileUser || !isSuperadmin) return;
    const updates = { name: editForm.name, email: editForm.email, phone: editForm.phone, active: editingProfileUser.active };
    setIsSavingProfile(true);
    setMessage('');
    setError('');
    try {
      if (editingProfileUser.role === 'technician') await updateAdminTechnician(editingProfileUser.id, { ...updates, status: editForm.status, lat: editForm.lat, lng: editForm.lng });
      else if (editingProfileUser.role === 'client') await updateAdminClient(editingProfileUser.id, { ...updates, address: editForm.address });
      else await updateAdminUser(editingProfileUser.id, updates);
      setEditingProfileUser(null);
      setEditForm(emptyEdit);
      setMessage(`${getEntityLabel(editingProfileUser.role)} updated.`);
      await load({ preserveFeedback: true });
    } catch (saveError) {
      setError(saveError.message || 'Unable to update user.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const removeUser = async (record) => {
    if (!isSuperadmin) return;
    const isDelete = record.role === 'technician' || record.role === 'client';
    if (!window.confirm(isDelete ? `Delete this ${getEntityLabel(record.role).toLowerCase()}?` : 'Deactivate this user?')) return;
    setBusyUserId(record.id);
    setMessage('');
    setError('');
    try {
      if (record.role === 'technician') {
        await deleteAdminTechnician(record.id);
        setMessage('Technician deleted.');
      } else if (record.role === 'client') {
        await deleteAdminClient(record.id);
        setMessage('Client deleted.');
      } else {
        await deactivateAdminUser(record.id);
        setMessage('User deactivated.');
      }
      if (editingProfileUser?.id === record.id) setEditingProfileUser(null);
      if (editingAccessUser?.id === record.id) setEditingAccessUser(null);
      await load({ preserveFeedback: true });
    } catch (removeError) {
      setError(removeError.message || 'Unable to remove user.');
    } finally {
      setBusyUserId(null);
    }
  };

  const openAccessEditor = async (record) => {
    if (!allowCapabilityManagement || !canManageAccessTarget(record.role)) return;
    setBusyUserId(record.id);
    setMessage('');
    setError('');
    try {
      const accessData = await fetchUserCapabilities(record.id);
      if (Array.isArray(accessData.available_capabilities) && accessData.available_capabilities.length > 0) setCatalog(accessData.available_capabilities);
      setEditingAccessUser(record);
      setEditingCapabilities(sanitizeCapabilities(accessData.direct_capabilities || [], accessData.available_capabilities || []));
    } catch (accessError) {
      setError(accessError.message || 'Unable to load user access.');
    } finally {
      setBusyUserId(null);
    }
  };

  const saveAccess = async () => {
    if (!editingAccessUser) return;
    setIsSavingAccess(true);
    setMessage('');
    setError('');
    try {
      const payload = sanitizeCapabilities(editingCapabilities, catalog);
      await updateUserCapabilities(editingAccessUser.id, payload);
      setEditingAccessUser(null);
      setEditingCapabilities([]);
      setMessage(`Access updated for ${editingAccessUser.username}.`);
      await load({ preserveFeedback: true });
    } catch (saveError) {
      setError(saveError.message || 'Unable to update user access.');
    } finally {
      setIsSavingAccess(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            {isSuperadmin ? 'Owner Access Management' : canViewAllUsers ? 'User Directory' : 'Technician Access'}
          </h2>
          <p className="text-slate-600">
            {isSuperadmin
              ? 'Create admins and staff accounts, manage client records, and control who can access the internal workspaces.'
              : canViewAllUsers
                ? 'Review all accounts from the admin workspace. Editing and account creation remain reserved for the superadmin.'
                : 'Bestow or remove technician workspace access without changing each technician\'s main role.'}
          </p>
        </div>
        {message ? <div className="text-sm font-medium text-green-700">{message}</div> : null}
      </div>
      {error ? <div className="mb-6 text-sm font-medium text-red-600">{error}</div> : null}
      {isSuperadmin ? (
        <form onSubmit={handleCreate} className={`${panelClass} mb-6`}>
          <h3 className="mb-3 text-lg font-semibold">Create new user</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input className={inputClass} placeholder="Username" value={createForm.username} onChange={(event) => setCreateForm({ ...createForm, username: event.target.value })} />
            <input className={inputClass} placeholder="Full name" value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} />
            <select className={inputClass} value={createForm.role} onChange={(event) => setCreateForm({ ...createForm, role: event.target.value })}>
              {CREATE_ROLE_SECTIONS.map((section) => <option key={section.value} value={section.value}>{section.label}</option>)}
            </select>
            <input className={inputClass} placeholder="Email" value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} />
            <input className={inputClass} placeholder="Phone" value={createForm.phone} onChange={(event) => setCreateForm({ ...createForm, phone: event.target.value })} />
            {createForm.role === 'client' ? (
              <input className={`${inputClass} md:col-span-2`} placeholder="Address" value={createForm.address} onChange={(event) => setCreateForm({ ...createForm, address: event.target.value })} />
            ) : null}
            {createForm.role === 'technician' ? (
              <select className={inputClass} value={createForm.status} onChange={(event) => setCreateForm({ ...createForm, status: event.target.value })}>
                <option value="available">Available</option>
                <option value="on_job">On job</option>
                <option value="offline">Offline</option>
              </select>
            ) : null}
            <input type="password" className={inputClass} placeholder="Password" value={createForm.password} onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })} />
            <input type="password" className={inputClass} placeholder="Confirm Password" value={createForm.passwordConfirm} onChange={(event) => setCreateForm({ ...createForm, passwordConfirm: event.target.value })} />
          </div>
          <button type="submit" disabled={isSubmitting} className="mt-3 rounded-xl bg-primary px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </form>
      ) : canViewAllUsers ? (
        <div className={`${panelClass} mb-6 border border-violet-100 bg-violet-50`}>
          <h3 className="text-lg font-semibold text-slate-900">Read-Only User Directory</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">This admin account can review user records because the superadmin granted directory access. Any account creation, profile editing, or deletion still requires the superadmin account.</p>
        </div>
      ) : allowCapabilityManagement ? (
        <div className={`${panelClass} mb-6 border border-sky-100 bg-sky-50`}>
          <h3 className="text-lg font-semibold text-slate-900">Technician Capability Access</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use <span className="font-medium text-slate-900">Manage access</span> to control which technician pages each field user can open.</p>
        </div>
      ) : null}

      <div className={`${panelClass} mb-6`}>
        <div className={`grid gap-4 ${canViewAllUsers ? 'lg:grid-cols-[1.4fr_1fr]' : ''}`}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Search users</label>
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Search by username, name, email, phone, role, address, or status" />
          </div>
          {canViewAllUsers ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Category</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setRoleFilter('all')} className={`rounded-full px-4 py-2 text-sm font-medium transition ${roleFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>All roles ({users.length})</button>
                {ROLE_SECTIONS.map((section) => {
                  const count = users.filter((record) => record.role === section.value).length;
                  return <button key={section.value} type="button" onClick={() => setRoleFilter(section.value)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${roleFilter === section.value ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>{section.label} ({count})</button>;
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Technician accounts available: <span className="font-semibold text-slate-900">{users.filter((record) => record.role === 'technician').length}</span></div>
          )}
        </div>
        <p className="mt-4 text-sm text-slate-500">Showing {visibleUsers.length} user{visibleUsers.length === 1 ? '' : 's'}{roleFilter === 'all' ? ' across all roles.' : ` in ${getRoleLabel(roleFilter)}.`}</p>
      </div>

      {loading ? (
        <div className={panelClass}>Loading users...</div>
      ) : visibleUsers.length === 0 ? (
        <div className={panelClass}>No users match the current search or selected category.</div>
      ) : (
        <div className={panelClass}>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100 text-left text-sm text-slate-700">
                <tr>
                  <th className="p-3">Username</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Details</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Access</th>
                  <th className="p-3">Status</th>
                  {isSuperadmin ? <th className="p-3 text-right">Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((record) => {
                  const canEditAccess = allowCapabilityManagement && canManageAccessTarget(record.role);
                  const canDelete = isSuperadmin && record.role !== 'superadmin' && (record.role === 'technician' || record.role === 'client');
                  const accessCount = record.role === 'technician'
                    ? (record.capabilities || []).filter((capability) => TECH_CAP_SET.has(capability)).length
                    : (record.capabilities || []).filter((capability) => capability === USER_DIRECTORY_CAPABILITIES[0]).length;
                  return (
                    <tr key={record.id} className="border-t">
                      <td className="p-3 font-medium text-slate-900">{record.username}</td>
                      <td className="p-3 text-slate-600">{getRoleLabel(record.role)}</td>
                      <td className="p-3 text-sm text-slate-600">{getDetails(record)}</td>
                      <td className="p-3 text-slate-600">{record.email || '-'}</td>
                      <td className="p-3 text-slate-600">{record.phone || '-'}</td>
                      <td className="p-3">
                        {canEditAccess ? (
                          <div className="space-y-1">
                            <button type="button" disabled={busyUserId === record.id} onClick={() => openAccessEditor(record)} className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
                              {busyUserId === record.id && editingAccessUser?.id !== record.id ? 'Loading access...' : 'Manage access'}
                            </button>
                            <div className="text-xs text-slate-500">{accessCount === 0 ? 'Role only' : `${accessCount} granted permission${accessCount === 1 ? '' : 's'}`}</div>
                          </div>
                        ) : <span className="text-sm text-slate-400">{canViewAllUsers ? 'Read only' : 'Technician only'}</span>}
                      </td>
                      <td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${record.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>{record.active ? 'Active' : 'Inactive'}</span></td>
                      {isSuperadmin ? (
                        <td className="p-3 text-right">
                          <div className="flex flex-wrap justify-end gap-3">
                            <button type="button" onClick={() => openProfileEditor(record)} className="text-sm font-medium text-blue-600">Edit</button>
                            {canDelete ? (
                              <button type="button" disabled={busyUserId === record.id} onClick={() => removeUser(record)} className="text-sm font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-60">{busyUserId === record.id ? 'Deleting...' : 'Delete'}</button>
                            ) : record.role === 'superadmin' ? (
                              <span className="text-sm text-slate-400">Owner account</span>
                            ) : record.active ? (
                              <button type="button" disabled={busyUserId === record.id} onClick={() => removeUser(record)} className="text-sm font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-60">{busyUserId === record.id ? 'Deactivating...' : 'Deactivate'}</button>
                            ) : <span className="text-sm text-slate-400">Inactive</span>}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {editingProfileUser ? (
        <div className={`${panelClass} mt-6`}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Edit {getEntityLabel(editingProfileUser.role)}</h3>
              <p className="text-sm text-slate-500">{editingProfileUser.username} stays on the same role and route.</p>
            </div>
            <button type="button" onClick={() => { setEditingProfileUser(null); setEditForm(emptyEdit); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Close</button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input className={`${inputClass} bg-slate-50 text-slate-500`} value={editingProfileUser.username} disabled />
            <input className={`${inputClass} bg-slate-50 text-slate-500`} value={getRoleLabel(editingProfileUser.role)} disabled />
            <input className={inputClass} placeholder="Full name" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} />
            <input className={inputClass} placeholder="Email" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} />
            <input className={inputClass} placeholder="Phone" value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} />
            {editingProfileUser.role === 'technician' ? (
              <select className={inputClass} value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}>
                <option value="available">Available</option>
                <option value="on_job">On job</option>
                <option value="offline">Offline</option>
              </select>
            ) : null}
            {editingProfileUser.role === 'client' ? (
              <input className={`${inputClass} md:col-span-2`} placeholder="Address" value={editForm.address} onChange={(event) => setEditForm({ ...editForm, address: event.target.value })} />
            ) : null}
            {editingProfileUser.role === 'technician' ? (
              <>
                <input type="number" className={inputClass} placeholder="Latitude" value={editForm.lat} onChange={(event) => setEditForm({ ...editForm, lat: event.target.value })} />
                <input type="number" className={inputClass} placeholder="Longitude" value={editForm.lng} onChange={(event) => setEditForm({ ...editForm, lng: event.target.value })} />
              </>
            ) : null}
          </div>
          <button type="button" onClick={saveProfile} disabled={isSavingProfile} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
            {isSavingProfile ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      ) : null}

      {editingAccessUser ? (
        <div className={`${panelClass} mt-6`}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Capabilities for {getRoleLabel(editingAccessUser.role)}</h3>
              <p className="text-sm text-slate-500">Select which capabilities {editingAccessUser.username} can access.</p>
            </div>
            <button type="button" onClick={() => { setEditingAccessUser(null); setEditingCapabilities([]); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Close</button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {catalog.map((capability) => (
              <label key={capability.code} className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition ${editingCapabilities.includes(capability.code) ? 'border-slate-900 bg-slate-900/5 text-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                <input type="checkbox" checked={editingCapabilities.includes(capability.code)} onChange={() => setEditingCapabilities((current) => current.includes(capability.code) ? current.filter((item) => item !== capability.code) : [...current, capability.code])} className="mt-1" />
                <span>
                  <span className="block font-semibold text-slate-900">{capability.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{capability.description}</span>
                </span>
              </label>
            ))}
          </div>
          {catalog.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">No capabilities are available for this account.</div>
          ) : null}
          <button type="button" onClick={saveAccess} disabled={isSavingAccess} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
            {isSavingAccess ? 'Saving access...' : 'Save access'}
          </button>
        </div>
      ) : null}
    </Layout>
  );
}
