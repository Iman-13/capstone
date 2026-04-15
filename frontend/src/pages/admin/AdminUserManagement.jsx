import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { createAdminUser, deactivateAdminUser, fetchAdminUsers } from '../../api/api';

const emptyForm = {
  username: '',
  role: 'technician',
  email: '',
  phone: '',
  password: '',
  passwordConfirm: ''
};

const ROLE_SECTIONS = [
  { value: 'admin', label: 'Administrators', description: 'Full system access and configuration control.' },
  { value: 'supervisor', label: 'Supervisors', description: 'Dispatch oversight, queue visibility, and assignment control.' },
  { value: 'technician', label: 'Technicians', description: 'Field users handling service execution and tracking.' },
  { value: 'follow_up', label: 'After Sales', description: 'Warranty, complaint, and customer recovery workflows.' },
  { value: 'client', label: 'Clients', description: 'Customer accounts that create and track service requests.' }
];

const ROLE_LABELS = Object.fromEntries(ROLE_SECTIONS.map((section) => [section.value, section.label]));

const getRoleLabel = (role) => ROLE_LABELS[role] || role || 'Unknown';

const matchesSearch = (user, query) => {
  if (!query) {
    return true;
  }

  return [
    user.username,
    user.name,
    user.email,
    user.phone,
    user.role,
    getRoleLabel(user.role),
    user.active ? 'active' : 'inactive'
  ].some((value) => String(value || '').toLowerCase().includes(query));
};

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [busyUserId, setBusyUserId] = useState(null);

  const load = async ({ preserveFeedback = false } = {}) => {
    setLoading(true);
    try {
      const fetchedUsers = await fetchAdminUsers();
      const sortedUsers = [...fetchedUsers].sort((left, right) => Number(right.id || 0) - Number(left.id || 0));
      setUsers(sortedUsers);
      if (!preserveFeedback) {
        setMessage('');
        setError('');
      }
    } catch (loadError) {
      setUsers([]);
      if (!preserveFeedback) {
        setMessage('');
      }
      setError(loadError.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createNew = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!form.username.trim()) {
      setError('Username is required.');
      return;
    }

    if (!form.password) {
      setError('Password is required.');
      return;
    }

    if (form.password !== form.passwordConfirm) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createAdminUser(form);
      setMessage('User created.');
      setForm(emptyForm);
      await load({ preserveFeedback: true });
    } catch (createError) {
      setError(createError.message || 'Failed to create user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (userId) => {
    setBusyUserId(userId);
    setMessage('');
    setError('');

    try {
      await deactivateAdminUser(userId);
      setMessage('User deactivated.');
      await load({ preserveFeedback: true });
    } catch (deactivateError) {
      setError(deactivateError.message || 'Unable to deactivate user.');
    } finally {
      setBusyUserId(null);
    }
  };

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredUsers = users.filter(
    (user) => (roleFilter === 'all' || user.role === roleFilter) && matchesSearch(user, normalizedSearchTerm)
  );
  const groupedUsers = ROLE_SECTIONS
    .filter((section) => roleFilter === 'all' || section.value === roleFilter)
    .map((section) => ({
      ...section,
      users: filteredUsers.filter((user) => user.role === section.value)
    }))
    .filter((section) => section.users.length > 0 || roleFilter === section.value);

  return (
    <Layout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-slate-600">Manage system users, roles, and access rights without mixing account types together.</p>
        </div>
        {message && <div className="text-sm font-medium text-green-700">{message}</div>}
      </div>

      <form onSubmit={createNew} className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-lg font-semibold">Create new user</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            className="rounded-xl border p-2"
            placeholder="Username"
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
          />
          <select
            className="rounded-xl border p-2"
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value })}
          >
            {ROLE_SECTIONS.map((section) => (
              <option key={section.value} value={section.value}>
                {section.label}
              </option>
            ))}
          </select>
          <input
            className="rounded-xl border p-2"
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          <input
            className="rounded-xl border p-2"
            placeholder="Phone"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
          <input
            type="password"
            className="rounded-xl border p-2"
            placeholder="Password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
          <input
            type="password"
            className="rounded-xl border p-2"
            placeholder="Confirm Password"
            value={form.passwordConfirm}
            onChange={(event) => setForm({ ...form, passwordConfirm: event.target.value })}
          />
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-3 rounded-xl bg-primary px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Creating...' : 'Create'}
        </button>
      </form>

      <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Search users</label>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Search by username, email, phone, role, or status"
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Category</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  roleFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All roles ({users.length})
              </button>
              {ROLE_SECTIONS.map((section) => {
                const count = users.filter((user) => user.role === section.value).length;
                return (
                  <button
                    key={section.value}
                    type="button"
                    onClick={() => setRoleFilter(section.value)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      roleFilter === section.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    {section.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Showing {filteredUsers.length} user{filteredUsers.length === 1 ? '' : 's'}
          {roleFilter === 'all' ? ' across all roles.' : ` in ${getRoleLabel(roleFilter)}.`}
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">Loading users...</div>
      ) : groupedUsers.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
          No users match the current search or selected category.
        </div>
      ) : (
        <div className="space-y-5">
          {groupedUsers.map((section) => (
            <section key={section.value} className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{section.label}</h3>
                    <p className="mt-1 text-sm text-slate-500">{section.description}</p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                    {section.users.length} user{section.users.length === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-100 text-left text-sm text-slate-700">
                    <tr>
                      <th className="p-3">Username</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.users.map((user) => (
                      <tr key={user.id} className="border-t">
                        <td className="p-3 font-medium text-slate-900">{user.username}</td>
                        <td className="p-3 text-slate-600">{getRoleLabel(user.role)}</td>
                        <td className="p-3 text-slate-600">{user.email || '-'}</td>
                        <td className="p-3 text-slate-600">{user.phone || '-'}</td>
                        <td className="p-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              user.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {user.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {user.active ? (
                            <button
                              type="button"
                              disabled={busyUserId === user.id}
                              onClick={() => handleDeactivate(user.id)}
                              className="text-sm font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busyUserId === user.id ? 'Deactivating...' : 'Deactivate'}
                            </button>
                          ) : (
                            <span className="text-sm text-slate-400">Inactive</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </Layout>
  );
}
