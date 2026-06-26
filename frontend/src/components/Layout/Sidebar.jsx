import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  DollarSign,
  Users,
  Calendar,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Building2,
  Menu,
  X
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { t } = useLanguage();

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
    { path: '/entities', icon: Building2, labelKey: 'nav.entities' },
    { path: '/projects', icon: FolderKanban, labelKey: 'nav.projects' },
    { path: '/tasks', icon: CheckSquare, labelKey: 'nav.tasks' },
    { path: '/finance', icon: DollarSign, labelKey: 'nav.finance' },
    { path: '/contacts', icon: Users, labelKey: 'nav.contacts' },
    { path: '/events', icon: Calendar, labelKey: 'nav.events' },
    { path: '/documents', icon: FileText, labelKey: 'nav.documents' },
    { path: '/kpis', icon: BarChart3, labelKey: 'nav.kpis' },
  ];

  const NavLink = ({ item }) => {
    const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
    const Icon = item.icon;

    return (
      <Link
        to={item.path}
        data-testid={`nav-${t(item.labelKey).toLowerCase()}`}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-sm transition-all duration-200',
          isActive 
            ? 'text-[#D4AF37] bg-[#D4AF37]/10 border-r-2 border-[#D4AF37]' 
            : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
        )}
      >
        <Icon size={18} strokeWidth={1.5} />
        {!collapsed && <span>{t(item.labelKey)}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        data-testid="mobile-menu-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-sm bg-[#0A0A0A] border border-[#27272A] lg:hidden"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        className={cn(
          'fixed left-0 top-0 h-screen z-40 flex flex-col',
          'bg-gradient-to-b from-[#0A0A0A]/95 to-[#050505] border-r border-[#27272A]',
          'backdrop-blur-xl transition-all duration-300',
          collapsed ? 'w-16' : 'w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272A]">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#D4AF37] rounded-sm flex items-center justify-center">
                <span className="text-black font-bold text-sm">CV</span>
              </div>
              <span className="font-rajdhani font-bold text-lg tracking-wider">{t('branding.cvln')}</span>
            </div>
          )}
          <button
            data-testid="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-sm text-[#A1A1AA] hover:text-white hover:bg-white/5 hidden lg:block"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </nav>

        {/* Admin link */}
        {isAdmin() && (
          <div className="px-3 pb-2">
            <Link
              to="/admin"
              data-testid="nav-admin"
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-sm transition-all duration-200',
                location.pathname === '/admin'
                  ? 'text-[#D4AF37] bg-[#D4AF37]/10 border-r-2 border-[#D4AF37]'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
              )}
            >
              <Shield size={18} strokeWidth={1.5} />
              {!collapsed && <span>{t('nav.admin')}</span>}
            </Link>
          </div>
        )}

        {/* User section */}
        <div className="p-3 border-t border-[#27272A]">
          {!collapsed && user && (
            <div className="px-3 py-2 mb-2">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-[#52525B] capitalize">{t(`roles.${user.role}`)}</p>
            </div>
          )}
          <div className="space-y-1">
            <Link
              to="/settings"
              data-testid="nav-settings"
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-sm transition-all duration-200',
                location.pathname === '/settings'
                  ? 'text-[#D4AF37] bg-[#D4AF37]/10'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
              )}
            >
              <Settings size={18} strokeWidth={1.5} />
              {!collapsed && <span>{t('nav.settings')}</span>}
            </Link>
            <button
              data-testid="logout-btn"
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-[#A1A1AA] hover:text-[#EF4444] hover:bg-[#EF4444]/5 rounded-sm transition-all duration-200"
            >
              <LogOut size={18} strokeWidth={1.5} />
              {!collapsed && <span>{t('auth.logout')}</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
