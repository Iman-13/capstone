import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiArrowRight, FiBell, FiLogOut, FiMenu } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import {
  fetchNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead
} from '../api/api';

const routeMeta = [
  {
    prefix: '/admin/dashboard',
    section: 'Home',
    title: 'Dashboard',
    subtitle: 'Start here for queue health, urgent issues, and team readiness.'
  },
  {
    prefix: '/admin/service-tickets',
    section: 'Operations',
    title: 'Tickets',
    subtitle: 'Review tickets, linked requests, and the next action for each job.'
  },
  {
    prefix: '/admin/dispatch-board',
    section: 'Operations',
    title: 'Dispatch Board',
    subtitle: 'Assign work and balance technician coverage.'
  },
  {
    prefix: '/admin/analytics',
    section: 'Home',
    title: 'Analytics',
    subtitle: 'Watch trends, demand, and performance.'
  },
  {
    prefix: '/admin/reports',
    section: 'Home',
    title: 'Reports',
    subtitle: 'Export and review operational reports.'
  },
  {
    prefix: '/admin/technician-tracking',
    section: 'Operations',
    title: 'Live Map',
    subtitle: 'See technician locations and field coverage.'
  },
  {
    prefix: '/admin/technicians',
    section: 'People',
    title: 'Technicians',
    subtitle: 'Manage technician accounts, availability, and field readiness.'
  },
  {
    prefix: '/admin/clients',
    section: 'People',
    title: 'Clients',
    subtitle: 'View and manage customer accounts.'
  },
  {
    prefix: '/admin/services',
    section: 'Operations',
    title: 'Services',
    subtitle: 'Manage service types and supported work categories.'
  },
  {
    prefix: '/admin/inventory',
    section: 'Operations',
    title: 'Inventory',
    subtitle: 'Find stock quickly and keep supplies organized.'
  },
  {
    prefix: '/admin/user-management',
    section: 'People',
    title: 'Users',
    subtitle: 'Manage system users by role and account status.'
  },
  {
    prefix: '/admin/settings',
    section: 'Setup',
    title: 'Settings',
    subtitle: 'Control system defaults and configuration.'
  },
  {
    prefix: '/follow-up/dashboard',
    section: 'Home',
    title: 'Dashboard',
    subtitle: 'See open after-sales work, overdue issues, and follow-up needs.'
  },
  {
    prefix: '/follow-up/cases',
    section: 'Cases',
    title: 'After-Sales Cases',
    subtitle: 'Track complaints, warranty issues, maintenance, and revisits.'
  },
  {
    prefix: '/supervisor/dashboard',
    section: 'Home',
    title: 'Dashboard',
    subtitle: 'See which tickets and technicians need attention right now.'
  },
  {
    prefix: '/supervisor/dispatch-board',
    section: 'Execution',
    title: 'Dispatch Board',
    subtitle: 'Route active work and keep appointments moving.'
  },
  {
    prefix: '/supervisor/service-tickets',
    section: 'Execution',
    title: 'Tickets',
    subtitle: 'See which tickets need action from the field team.'
  },
  {
    prefix: '/supervisor/technician-tracking',
    section: 'Execution',
    title: 'Live Map',
    subtitle: 'Check technician availability and live field coverage.'
  },
  {
    prefix: '/technician/dashboard',
    section: 'Home',
    title: 'Dashboard',
    subtitle: 'Start with your jobs, route, and alerts.'
  },
  {
    prefix: '/technician/my-jobs',
    section: 'My Work',
    title: 'Jobs',
    subtitle: 'See assigned jobs and update their status.'
  },
  {
    prefix: '/technician/schedule',
    section: 'My Work',
    title: 'Schedule',
    subtitle: 'Keep today’s appointments and timing in view.'
  },
  {
    prefix: '/technician/map-navigation',
    section: 'My Work',
    title: 'Navigation',
    subtitle: 'Open the route, destination, and travel details for a job.'
  },
  {
    prefix: '/technician/checklist',
    section: 'My Work',
    title: 'Checklist',
    subtitle: 'Complete service steps and capture proof of work.'
  },
  {
    prefix: '/technician/messages',
    section: 'Account',
    title: 'Messages',
    subtitle: 'Stay in touch with supervisors and support.'
  },
  {
    prefix: '/technician/job-history',
    section: 'My Work',
    title: 'History',
    subtitle: 'Review completed jobs and recent activity.'
  },
  {
    prefix: '/technician/profile',
    section: 'Account',
    title: 'Profile',
    subtitle: 'Update your account details and field status.'
  },
  {
    prefix: '/client/dashboard',
    section: 'Home',
    title: 'Service Overview',
    subtitle: 'See requests, tickets, and next steps in one place.'
  },
  {
    prefix: '/client/service-requests',
    section: 'Service',
    title: 'New Request',
    subtitle: 'Submit a new issue or maintenance need with the right details.'
  },
  {
    prefix: '/client/requests',
    section: 'Service',
    title: 'My Requests',
    subtitle: 'Track request approval, ticket creation, and service progress.'
  },
  {
    prefix: '/client/service-history',
    section: 'Service',
    title: 'Service History',
    subtitle: 'Review completed work and feedback.'
  },
  {
    prefix: '/client/messages',
    section: 'Account',
    title: 'Messages',
    subtitle: 'Contact support and review recent conversations.'
  },
  {
    prefix: '/client/notifications',
    section: 'Account',
    title: 'Notifications',
    subtitle: 'See status changes, reminders, and service updates.'
  },
  {
    prefix: '/client/profile',
    section: 'Account',
    title: 'Profile',
    subtitle: 'Manage your contact details and account information.'
  }
];

const roleMeta = {
  admin: {
    workspace: 'Admin',
    action: { label: 'Open tickets', path: '/admin/service-tickets' },
    notificationsTarget: { label: 'Open tickets', path: '/admin/service-tickets' }
  },
  follow_up: {
    workspace: 'After Sales',
    action: { label: 'Open cases', path: '/follow-up/cases' },
    notificationsTarget: { label: 'Open cases', path: '/follow-up/cases' }
  },
  supervisor: {
    workspace: 'Supervisor',
    action: { label: 'Open dispatch', path: '/supervisor/dispatch-board' },
    notificationsTarget: { label: 'Open tickets', path: '/supervisor/service-tickets' }
  },
  technician: {
    workspace: 'Technician',
    action: { label: 'View jobs', path: '/technician/my-jobs' },
    notificationsTarget: { label: 'View jobs', path: '/technician/my-jobs' }
  },
  client: {
    workspace: 'Client',
    action: { label: 'New request', path: '/client/service-requests' },
    notificationsTarget: { label: 'Open notifications', path: '/client/notifications' }
  }
};

const formatNotificationTime = (value) => {
  if (!value) {
    return 'Just now';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Just now';
  }

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

export default function Topbar({ toggleSidebar }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const notificationPanelRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const activeRoute = useMemo(
    () => routeMeta.find((item) => location.pathname.startsWith(item.prefix)),
    [location.pathname]
  );

  const activeRole = roleMeta[user?.role] || null;
  const primaryAction =
    activeRole && activeRole.action.path !== location.pathname ? activeRole.action : null;
  const notificationsTarget = activeRole?.notificationsTarget || null;
  const displayName =
    user?.first_name?.trim() || user?.username || user?.email || 'Team member';

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return () => {
        isMounted = false;
      };
    }

    const loadNotificationSummary = async () => {
      try {
        const [notificationItems, unreadItems] = await Promise.all([
          fetchNotifications(),
          getUnreadNotificationCount()
        ]);

        if (!isMounted) {
          return;
        }

        const sortedNotifications = [...notificationItems].sort(
          (left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0)
        );

        setNotifications(sortedNotifications.slice(0, 5));
        setUnreadCount(unreadItems || 0);
      } catch {
        if (!isMounted) {
          return;
        }

        setNotifications([]);
        setUnreadCount(0);
      }
    };

    loadNotificationSummary();
    const intervalId = window.setInterval(loadNotificationSummary, 45000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [user]);

  useEffect(() => {
    setNotificationsOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!notificationPanelRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleNotificationClick = async (notification) => {
    if (notification?.status === 'unread') {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications((current) =>
          current.map((item) => (
            item.id === notification.id
              ? { ...item, status: 'read' }
              : item
          ))
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      } catch {
        // Keep the preview usable even if mark-read fails.
      }
    }

    if (notificationsTarget?.path) {
      navigate(notificationsTarget.path);
    }
    setNotificationsOpen(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((current) => current.map((item) => ({ ...item, status: 'read' })));
      setUnreadCount(0);
    } catch {
      // Ignore preview-only failures in the header.
    }
  };

  return (
    <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-3 py-3 shadow-sm backdrop-blur sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-50 md:hidden"
          >
            <FiMenu size={18} />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                {activeRole?.workspace || 'AFN portal'}
              </span>
              <span className="text-xs text-slate-400">{displayName}</span>
            </div>
            {activeRoute?.section && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400">
                <span>{activeRole?.workspace || 'Portal'}</span>
                <span>/</span>
                <span>{activeRoute.section}</span>
              </div>
            )}
            <h1 className="mt-2 truncate text-lg font-semibold text-slate-900 sm:text-xl">
              {activeRoute?.title || 'AFN Service Management'}
            </h1>
            <p className="text-sm text-slate-500">
              {activeRoute?.subtitle || 'Use the sidebar to move between the main tasks for your role.'}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative" ref={notificationPanelRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen((current) => !current)}
              className={`relative inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                unreadCount > 0
                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              aria-label="Open notifications"
            >
              <FiBell className={unreadCount > 0 ? 'text-rose-600' : 'text-slate-500'} />
              <span className="hidden sm:inline">{unreadCount > 0 ? 'Alerts' : 'Notifications'}</span>
              {unreadCount > 0 && (
                <>
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white shadow-sm">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                  <span className="absolute -right-1 -top-1 h-5 min-w-5 animate-ping rounded-full bg-rose-400 opacity-60" />
                </>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Notifications</div>
                    <div className="text-xs text-slate-500">
                      {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
                    </div>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-xs font-medium text-rose-600 hover:text-rose-700"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-[24rem] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-slate-500">No recent notifications.</div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
                          notification.status === 'unread' ? 'bg-rose-50/60' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 shrink-0">
                            <span className={`inline-flex h-2.5 w-2.5 rounded-full ${
                              notification.status === 'unread' ? 'bg-rose-500' : 'bg-slate-300'
                            }`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-900">
                                  {notification.title || 'Notification'}
                                </div>
                                <div className="mt-1 line-clamp-2 text-sm text-slate-600">
                                  {notification.message}
                                </div>
                              </div>
                              {notification.status === 'unread' && (
                                <FiAlertCircle className="mt-0.5 shrink-0 text-rose-500" />
                              )}
                            </div>
                            <div className="mt-2 text-xs text-slate-400">
                              {formatNotificationTime(notification.created_at)}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {notificationsTarget?.path && (
                  <div className="border-t border-slate-200 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        navigate(notificationsTarget.path);
                        setNotificationsOpen(false);
                      }}
                      className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      {notificationsTarget.label}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {primaryAction && (
            <button
              onClick={() => navigate(primaryAction.path)}
              className="hidden items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:inline-flex"
            >
              {primaryAction.label}
              <FiArrowRight size={15} />
            </button>
          )}
          <button
            onClick={logout}
            className="inline-flex items-center gap-1 rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-600 sm:px-3 sm:py-2"
          >
            <FiLogOut />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
