import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiBell,
  FiCalendar,
  FiClipboard,
  FiClock,
  FiFileText,
  FiHome,
  FiLayers,
  FiMap,
  FiMessageSquare,
  FiPackage,
  FiRefreshCw,
  FiSettings,
  FiShield,
  FiTool,
  FiTrendingUp,
  FiUsers
} from 'react-icons/fi';
import { fetchDashboardStats } from '../api/api';
import {
  AFTER_SALES_CASE_CAPABILITIES,
  AFTER_SALES_DASHBOARD_CAPABILITIES,
  SUPERVISOR_DASHBOARD_CAPABILITIES,
  SUPERVISOR_DISPATCH_CAPABILITIES,
  SUPERVISOR_TICKETS_CAPABILITIES,
  SUPERVISOR_TRACKING_CAPABILITIES,
  TECHNICIAN_CHECKLIST_CAPABILITIES,
  TECHNICIAN_DASHBOARD_CAPABILITIES,
  TECHNICIAN_HISTORY_CAPABILITIES,
  TECHNICIAN_JOBS_CAPABILITIES,
  TECHNICIAN_MESSAGES_CAPABILITIES,
  TECHNICIAN_NAVIGATION_CAPABILITIES,
  TECHNICIAN_PROFILE_CAPABILITIES,
  TECHNICIAN_SCHEDULE_CAPABILITIES,
  USER_DIRECTORY_CAPABILITIES,
  canAccessAfterSalesWorkspace,
  canManageStaffAccess,
  hasAnyCapability
} from '../rbac';

const getAfterSalesItems = (stats, user) => {
  const overview = stats?.overview || {};
  const caseBreakdown = stats?.case_breakdown || {};
  const hasStats = Boolean(stats);
  const getBadge = (value) => (hasStats ? value ?? 0 : undefined);
  const canViewDashboard = hasAnyCapability(user, AFTER_SALES_DASHBOARD_CAPABILITIES);
  const canViewCases = hasAnyCapability(user, AFTER_SALES_CASE_CAPABILITIES);

  const items = [];

  if (canViewDashboard) {
    items.push({
      label: 'After Sales Dashboard',
      path: '/follow-up/dashboard',
      icon: FiHome,
      badge: getBadge(overview.total_cases)
    });
  }

  if (canViewCases) {
    items.push(
      {
        label: 'All Cases',
        path: '/follow-up/cases',
        icon: FiClipboard,
        badge: getBadge(overview.total_cases)
      },
      {
        label: 'Open Cases',
        path: '/follow-up/cases?status=open_work',
        icon: FiTrendingUp,
        badge: getBadge(overview.open_cases),
        badgeTone: 'bg-sky-100 text-sky-700'
      },
      {
        label: 'Overdue',
        path: '/follow-up/cases?status=overdue',
        icon: FiAlertTriangle,
        badge: getBadge(overview.overdue_cases),
        badgeTone: 'bg-rose-100 text-rose-700'
      },
      {
        label: 'Warranty',
        path: '/follow-up/cases?case_type=warranty',
        icon: FiShield,
        badge: getBadge(caseBreakdown.warranty),
        badgeTone: 'bg-emerald-100 text-emerald-700'
      },
      {
        label: 'Maintenance',
        path: '/follow-up/cases?case_type=maintenance',
        icon: FiClock,
        badge: getBadge(caseBreakdown.maintenance),
        badgeTone: 'bg-amber-100 text-amber-700'
      },
      {
        label: 'Complaints',
        path: '/follow-up/cases?case_type=complaint',
        icon: FiMessageSquare,
        badge: getBadge(caseBreakdown.complaint),
        badgeTone: 'bg-orange-100 text-orange-700'
      },
      {
        label: 'Revisits',
        path: '/follow-up/cases?case_type=revisit',
        icon: FiMap,
        badge: getBadge(caseBreakdown.revisit),
        badgeTone: 'bg-violet-100 text-violet-700'
      }
    );
  }

  if (canViewDashboard) {
    items.push({
      label: 'Needs Review',
      path: '/follow-up/dashboard#completed-jobs',
      icon: FiRefreshCw,
      badge: getBadge(overview.follow_up_candidates),
      badgeTone: 'bg-slate-100 text-slate-700'
    });
  }

  return items;
};

const getSupervisorMenu = (user) => {
  const homeItems = [];
  const executionItems = [];
  const peopleItems = [];

  if (hasAnyCapability(user, SUPERVISOR_DASHBOARD_CAPABILITIES)) {
    homeItems.push({ label: 'Dashboard', path: '/supervisor/dashboard', icon: FiHome });
  }

  if (hasAnyCapability(user, SUPERVISOR_TICKETS_CAPABILITIES)) {
    executionItems.push({ label: 'Tickets', path: '/supervisor/service-tickets', icon: FiClipboard });
  }

  if (hasAnyCapability(user, SUPERVISOR_DISPATCH_CAPABILITIES)) {
    executionItems.push({ label: 'Dispatch Board', path: '/supervisor/dispatch-board', icon: FiLayers });
  }

  if (hasAnyCapability(user, SUPERVISOR_TRACKING_CAPABILITIES)) {
    executionItems.push({ label: 'Live Map', path: '/supervisor/technician-tracking', icon: FiMap });
  }

  if (canManageStaffAccess(user)) {
    peopleItems.push({ label: 'Technician Access', path: '/supervisor/user-access', icon: FiUsers });
  }

  return {
    label: 'Supervisor',
    description: 'Keep work moving by watching tickets, assignments, and technician activity.',
    sections: [
      { title: 'Home', items: homeItems },
      { title: 'Execution', items: executionItems },
      { title: 'People', items: peopleItems }
    ].filter((section) => section.items.length > 0)
  };
};

const getAdminMenu = (user) => {
  const homeItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: FiHome },
    { label: 'Analytics', path: '/admin/analytics', icon: FiFileText },
    { label: 'Reports', path: '/admin/reports', icon: FiFileText }
  ];
  
  const operationsItems = [
    { label: 'Operations Dashboard', path: '/admin/operations-dashboard', icon: FiHome, description: 'Unified dashboard for supervisor and aftersales teams' },
    { label: 'Tickets', path: '/admin/service-tickets', icon: FiClipboard },
    { label: 'Dispatch Board', path: '/admin/dispatch-board', icon: FiLayers },
    { label: 'Live Map', path: '/admin/technician-tracking', icon: FiMap },
    { label: 'Services', path: '/admin/services', icon: FiTool },
    { label: 'Inventory', path: '/admin/inventory', icon: FiPackage }
  ];
  
  const communicationItems = [];
  
  if (hasAnyCapability(user, TECHNICIAN_MESSAGES_CAPABILITIES)) {
    communicationItems.push({ label: 'Messages', path: '/technician/messages', icon: FiMessageSquare });
  }
  
  const accessItems = [];
  
  // Add "Manage access" with permission check
  const canManageAccess = canManageStaffAccess(user);
  accessItems.push({ 
    label: 'User Management', 
    path: '/admin/user-management', 
    icon: FiUsers,
    disabled: !canManageAccess,
    title: canManageAccess ? 'Manage users and staff capabilities' : 'Superadmin must grant you access'
  });
  
  const setupItems = [
    { label: 'Settings', path: '/admin/settings', icon: FiSettings }
  ];
  
  return {
    label: user.role === 'superadmin' ? 'Superadmin' : 'Admin',
    description: user.role === 'superadmin' 
      ? 'Own the platform, oversee operations, and control which internal accounts get access.'
      : 'Run day-to-day service operations and keep tickets, teams, and stock moving.',
    sections: [
      { title: 'Home', items: homeItems },
      { title: 'Operations', items: operationsItems },
      ...(communicationItems.length > 0 ? [{ title: 'Communication', items: communicationItems }] : []),
      { title: 'Access', items: accessItems },
      { title: 'Setup', items: setupItems }
    ].filter((section) => section.items.length > 0)
  };
};

const getTechnicianMenu = (user) => {
  const homeItems = [];
  const workItems = [];
  const accountItems = [];

  if (hasAnyCapability(user, TECHNICIAN_DASHBOARD_CAPABILITIES)) {
    homeItems.push({ label: 'Dashboard', path: '/technician/dashboard', icon: FiHome });
  }

  if (hasAnyCapability(user, TECHNICIAN_JOBS_CAPABILITIES)) {
    workItems.push({ label: 'Jobs', path: '/technician/my-jobs', icon: FiClipboard });
  }

  if (hasAnyCapability(user, TECHNICIAN_SCHEDULE_CAPABILITIES)) {
    workItems.push({ label: 'Schedule', path: '/technician/schedule', icon: FiCalendar });
  }

  if (hasAnyCapability(user, TECHNICIAN_NAVIGATION_CAPABILITIES)) {
    workItems.push({ label: 'Navigation', path: '/technician/map-navigation', icon: FiMap });
  }

  if (hasAnyCapability(user, TECHNICIAN_CHECKLIST_CAPABILITIES)) {
    workItems.push({ label: 'Checklist', path: '/technician/checklist', icon: FiClipboard });
  }

  if (hasAnyCapability(user, TECHNICIAN_HISTORY_CAPABILITIES)) {
    workItems.push({ label: 'History', path: '/technician/job-history', icon: FiFileText });
  }

  if (hasAnyCapability(user, TECHNICIAN_MESSAGES_CAPABILITIES)) {
    accountItems.push({ label: 'Messages', path: '/technician/messages', icon: FiMessageSquare });
  }

  if (hasAnyCapability(user, TECHNICIAN_PROFILE_CAPABILITIES)) {
    accountItems.push({ label: 'Profile', path: '/technician/profile', icon: FiSettings });
  }

  return {
    label: 'Technician',
    description: "See today's jobs, routes, checklist, and updates without extra noise.",
    sections: [
      { title: 'Home', items: homeItems },
      { title: 'My Work', items: workItems },
      { title: 'Account', items: accountItems }
    ].filter((section) => section.items.length > 0)
  };
};

const roleMenu = {
  superadmin: {
    label: 'Superadmin',
    description: 'Own the platform, oversee operations, and control which internal accounts get access.',
    sections: [
      {
        title: 'Home',
        items: [
          { label: 'Dashboard', path: '/admin/dashboard', icon: FiHome },
          { label: 'Analytics', path: '/admin/analytics', icon: FiFileText },
          { label: 'Reports', path: '/admin/reports', icon: FiFileText }
        ]
      },
      {
        title: 'Operations',
        items: [
          { label: 'Tickets', path: '/admin/service-tickets', icon: FiClipboard },
          { label: 'Dispatch Board', path: '/admin/dispatch-board', icon: FiLayers },
          { label: 'Live Map', path: '/admin/technician-tracking', icon: FiMap },
          { label: 'Services', path: '/admin/services', icon: FiTool },
          { label: 'Inventory', path: '/admin/inventory', icon: FiPackage }
        ]
      },
      {
        title: 'Access',
        items: [
          { label: 'Users', path: '/admin/user-management', icon: FiUsers }
        ]
      },
      {
        title: 'Setup',
        items: [
          { label: 'Settings', path: '/admin/settings', icon: FiSettings }
        ]
      }
    ]
  },
  admin: {
    label: 'Admin',
    description: 'Run day-to-day service operations and keep tickets, teams, and stock moving.',
    sections: [
      {
        title: 'Home',
        items: [
          { label: 'Dashboard', path: '/admin/dashboard', icon: FiHome },
          { label: 'Analytics', path: '/admin/analytics', icon: FiFileText },
          { label: 'Reports', path: '/admin/reports', icon: FiFileText }
        ]
      },
      {
        title: 'Operations',
        items: [
          { label: 'Tickets', path: '/admin/service-tickets', icon: FiClipboard },
          { label: 'Dispatch Board', path: '/admin/dispatch-board', icon: FiLayers },
          { label: 'Live Map', path: '/admin/technician-tracking', icon: FiMap },
          { label: 'Services', path: '/admin/services', icon: FiTool },
          { label: 'Inventory', path: '/admin/inventory', icon: FiPackage }
        ]
      },
      {
        title: 'Access',
        items: [
          { label: 'Users', path: '/admin/user-management', icon: FiUsers }
        ]
      },
      {
        title: 'Setup',
        items: [
          { label: 'Settings', path: '/admin/settings', icon: FiSettings }
        ]
      }
    ]
  },
  client: {
    label: 'Client',
    description: 'Request service, track progress, and understand what happens next.',
    sections: [
      {
        title: 'Home',
        items: [{ label: 'Dashboard', path: '/client/dashboard', icon: FiHome }]
      },
      {
        title: 'Service',
        items: [
          { label: 'New Request', path: '/client/service-requests', icon: FiClipboard },
          { label: 'My Requests', path: '/client/requests', icon: FiClipboard },
          { label: 'Service History', path: '/client/service-history', icon: FiFileText }
        ]
      },
      {
        title: 'Account',
        items: [
          { label: 'Messages', path: '/client/messages', icon: FiMessageSquare },
          { label: 'Notifications', path: '/client/notifications', icon: FiBell },
          { label: 'Profile', path: '/client/profile', icon: FiSettings }
        ]
      }
    ]
  }
};

export default function Sidebar({ user, isOpen, onClose }) {
  const location = useLocation();
  const [afterSalesStats, setAfterSalesStats] = useState(null);
  const role = user?.role;
  const canViewUserDirectory = hasAnyCapability(user, USER_DIRECTORY_CAPABILITIES);
  const afterSalesItems = canAccessAfterSalesWorkspace(user) ? getAfterSalesItems(afterSalesStats, user) : [];
  const shouldLoadAfterSalesStats =
    role === 'follow_up' && hasAnyCapability(user, AFTER_SALES_DASHBOARD_CAPABILITIES);

  useEffect(() => {
    let isMounted = true;

    if (!shouldLoadAfterSalesStats) {
      setAfterSalesStats(null);
      return () => {
        isMounted = false;
      };
    }

    fetchDashboardStats('follow_up')
      .then((data) => {
        if (isMounted) {
          setAfterSalesStats(data);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAfterSalesStats(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [location.pathname, location.search, shouldLoadAfterSalesStats]);

  if (!role) return null;

  const baseMenu = role === 'follow_up'
    ? {
        label: 'After Sales',
        description: 'Handle complaints, warranty work, maintenance, and revisits after service is done.',
        sections: [
          {
            title: 'After Sales',
            items: afterSalesItems
          }
        ]
      }
    : role === 'supervisor'
      ? getSupervisorMenu(user)
      : role === 'technician'
        ? getTechnicianMenu(user)
        : role === 'admin' || role === 'superadmin'
          ? getAdminMenu(user)
          : roleMenu[role];

  const filteredSections = (baseMenu?.sections || []).filter((section) => {
    if (!Array.isArray(section.items) || section.items.length === 0) {
      return false;
    }
    if (role === 'admin' && section.title === 'Access' && !canViewUserDirectory) {
      return false;
    }
    return true;
  });

  const menu = baseMenu
    ? {
        ...baseMenu,
        sections: filteredSections
      }
    : null;

  if (!menu) return null;

  const isItemActive = (item) => {
    const [pathWithSearch, hashFragment = ''] = item.path.split('#');
    const [pathname, searchFragment = ''] = pathWithSearch.split('?');

    if (searchFragment || hashFragment) {
      const currentSearch = location.search.startsWith('?') ? location.search.slice(1) : location.search;
      const currentHash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;

      return location.pathname === pathname && currentSearch === searchFragment && currentHash === hashFragment;
    }

    return location.pathname === pathname;
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-20 bg-black/30 transition-opacity md:hidden ${
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-[85vw] max-w-72 overflow-y-auto border-r border-slate-200 bg-white p-3 transition-transform md:static md:block md:min-h-screen md:w-64 md:max-w-none md:translate-x-0 md:p-4 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-sky-900 p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-200">AFN Portal</p>
              <h2 className="mt-2 text-lg font-bold sm:text-xl">{menu.label}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-200">{menu.description}</p>
            </div>
            <button className="rounded-md p-1 text-xl leading-none text-white md:hidden" onClick={onClose}>
              x
            </button>
          </div>
        </div>

        <nav className="space-y-5">
          {menu.sections.map((section) => (
            <div key={section.title}>
              <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                {section.title}
              </div>
              <div className="mt-2 space-y-1.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const itemIsActive = isItemActive(item) && !item.disabled;
                  
                  if (item.disabled) {
                    return (
                      <div
                        key={item.path}
                        title={item.title || ''}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 cursor-not-allowed opacity-60"
                      >
                        <Icon size={16} className="shrink-0" />
                        <span className="min-w-0 break-words">{item.label}</span>
                      </div>
                    );
                  }

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={() =>
                        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                          itemIsActive ? 'bg-primary text-white shadow-md' : 'text-slate-700 hover:bg-slate-100'
                        }`
                      }
                    >
                      <Icon size={16} className="shrink-0" />
                      <span className="min-w-0 break-words">{item.label}</span>
                      {item.badge !== undefined && item.badge !== null && (
                        <span
                          className={`ml-auto inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            itemIsActive ? 'bg-white/20 text-white' : item.badgeTone || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
