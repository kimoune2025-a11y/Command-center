import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { dashboardAPI } from '../lib/api';
import { GlobalSearch } from '../components/Search/GlobalSearch';
import { AlertsPanel, AlertBadge } from '../components/Alerts/AlertsPanel';
import { 
  FolderKanban, 
  CheckSquare, 
  Users, 
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  Clock,
  Search,
  Flame,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Progress } from '../components/ui/progress';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [burnRate, setBurnRate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  useEffect(() => {
    fetchAllData();
    
    // Keyboard shortcut for search
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowAlerts(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchAllData = async () => {
    try {
      const [statsRes, heatmapRes, weeklyRes, burnRes] = await Promise.all([
        dashboardAPI.getStats(),
        axios.get(`${API}/dashboard/heatmap`),
        axios.get(`${API}/dashboard/weekly-summary`),
        axios.get(`${API}/finance/burn-rate`)
      ]);
      setStats(statsRes.data);
      setHeatmap(heatmapRes.data);
      setWeeklySummary(weeklyRes.data);
      setBurnRate(burnRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'dd MMM yyyy');
    } catch {
      return dateString;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-[#EF4444]';
      case 'high': return 'text-[#F59E0B]';
      case 'medium': return 'text-[#D4AF37]';
      default: return 'text-[#A1A1AA]';
    }
  };

  const getUrgencyColor = (score) => {
    if (score >= 70) return '#EF4444';
    if (score >= 40) return '#F59E0B';
    if (score >= 20) return '#D4AF37';
    return '#10B981';
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-[#121212] rounded-sm w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-[#0A0A0A] rounded-sm border border-[#27272A]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      {/* Global Search Modal */}
      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}
      
      {/* Alerts Panel */}
      {showAlerts && <AlertsPanel onClose={() => setShowAlerts(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-rajdhani font-bold tracking-wider text-white">
            {t('dashboard.title').toUpperCase()}
          </h1>
          <p className="text-[#A1A1AA] text-sm mt-1">
            {t('dashboard.welcomeBack')}, <span className="text-[#D4AF37]">{user?.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search Button */}
          <button
            onClick={() => setShowSearch(true)}
            data-testid="global-search-btn"
            className="flex items-center gap-2 px-3 py-1.5 bg-[#121212] border border-[#27272A] rounded-sm text-[#A1A1AA] hover:text-white hover:border-[#D4AF37]/40 transition-colors"
          >
            <Search size={16} />
            <span className="text-sm hidden sm:inline">Rechercher</span>
            <kbd className="text-xs bg-[#0A0A0A] px-1.5 py-0.5 rounded hidden sm:inline">⌘K</kbd>
          </button>
          
          {/* Alerts Badge */}
          <AlertBadge onClick={() => setShowAlerts(true)} />
        </div>
      </div>

      {/* Weekly Summary Bar */}
      {weeklySummary && (
        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="weekly-summary">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-[#D4AF37]" />
            <span className="text-sm font-semibold text-white uppercase tracking-wider">Résumé de la semaine</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div>
              <p className="text-[#52525B] text-xs">Tâches créées</p>
              <p className="text-xl font-mono font-bold text-white">{weeklySummary.tasks_created}</p>
            </div>
            <div>
              <p className="text-[#52525B] text-xs">Tâches terminées</p>
              <p className="text-xl font-mono font-bold text-[#10B981]">{weeklySummary.tasks_completed}</p>
            </div>
            <div>
              <p className="text-[#52525B] text-xs">Taux completion</p>
              <p className="text-xl font-mono font-bold text-[#D4AF37]">{weeklySummary.completion_rate}%</p>
            </div>
            <div>
              <p className="text-[#52525B] text-xs">Événements</p>
              <p className="text-xl font-mono font-bold text-white">{weeklySummary.events_upcoming}</p>
            </div>
            <div>
              <p className="text-[#52525B] text-xs">Revenus</p>
              <p className="text-xl font-mono font-bold text-[#10B981]">{formatCurrency(weeklySummary.revenue_week)}</p>
            </div>
            <div>
              <p className="text-[#52525B] text-xs">Dépenses</p>
              <p className="text-xl font-mono font-bold text-[#EF4444]">{formatCurrency(weeklySummary.expenses_week)}</p>
            </div>
            <div>
              <p className="text-[#52525B] text-xs">Notes</p>
              <p className="text-xl font-mono font-bold text-white">{weeklySummary.notes_created}</p>
            </div>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/projects" className="group" data-testid="metric-projects">
          <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4 h-full hover:border-[#D4AF37]/40 transition-colors duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-[#D4AF37]/10 rounded-sm">
                <FolderKanban size={20} className="text-[#D4AF37]" strokeWidth={1.5} />
              </div>
              <ArrowRight size={16} className="text-[#52525B] group-hover:text-[#D4AF37] transition-colors" />
            </div>
            <p className="text-[#A1A1AA] text-xs uppercase tracking-wider mb-1">{t('dashboard.projects')}</p>
            <p className="text-3xl font-rajdhani font-bold text-white">{stats?.projects?.total || 0}</p>
            <p className="text-[#52525B] text-xs mt-2">
              <span className="text-[#10B981]">{stats?.projects?.active || 0}</span> {t('dashboard.active')}
            </p>
          </div>
        </Link>

        <Link to="/tasks" className="group" data-testid="metric-tasks">
          <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4 h-full hover:border-[#D4AF37]/40 transition-colors duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-[#D4AF37]/10 rounded-sm">
                <CheckSquare size={20} className="text-[#D4AF37]" strokeWidth={1.5} />
              </div>
              {stats?.tasks?.urgent > 0 && (
                <div className="flex items-center gap-1 text-[#EF4444] text-xs">
                  <AlertTriangle size={12} />
                  <span>{stats.tasks.urgent}</span>
                </div>
              )}
            </div>
            <p className="text-[#A1A1AA] text-xs uppercase tracking-wider mb-1">{t('dashboard.tasks')}</p>
            <p className="text-3xl font-rajdhani font-bold text-white">{stats?.tasks?.total || 0}</p>
            <p className="text-[#52525B] text-xs mt-2">
              <span className="text-[#F59E0B]">{stats?.tasks?.urgent || 0}</span> {t('dashboard.urgent')}
            </p>
          </div>
        </Link>

        <Link to="/contacts" className="group" data-testid="metric-contacts">
          <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4 h-full hover:border-[#D4AF37]/40 transition-colors duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-[#D4AF37]/10 rounded-sm">
                <Users size={20} className="text-[#D4AF37]" strokeWidth={1.5} />
              </div>
              <ArrowRight size={16} className="text-[#52525B] group-hover:text-[#D4AF37] transition-colors" />
            </div>
            <p className="text-[#A1A1AA] text-xs uppercase tracking-wider mb-1">{t('dashboard.contacts')}</p>
            <p className="text-3xl font-rajdhani font-bold text-white">{stats?.contacts || 0}</p>
            <p className="text-[#52525B] text-xs mt-2">{t('dashboard.partnersSponsors')}</p>
          </div>
        </Link>

        <Link to="/events" className="group" data-testid="metric-events">
          <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4 h-full hover:border-[#D4AF37]/40 transition-colors duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-[#D4AF37]/10 rounded-sm">
                <Calendar size={20} className="text-[#D4AF37]" strokeWidth={1.5} />
              </div>
              <ArrowRight size={16} className="text-[#52525B] group-hover:text-[#D4AF37] transition-colors" />
            </div>
            <p className="text-[#A1A1AA] text-xs uppercase tracking-wider mb-1">{t('dashboard.events')}</p>
            <p className="text-3xl font-rajdhani font-bold text-white">{stats?.events || 0}</p>
            <p className="text-[#52525B] text-xs mt-2">{t('dashboard.scheduledEvents')}</p>
          </div>
        </Link>
      </div>

      {/* Financial Overview + Burn Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="metric-revenue">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-[#10B981]" />
            <span className="text-[#A1A1AA] text-xs uppercase tracking-wider">{t('dashboard.revenue')}</span>
          </div>
          <p className="text-2xl font-mono font-bold text-[#10B981]">
            {formatCurrency(stats?.finance?.revenue || 0)}
          </p>
        </div>

        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="metric-expenses">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={18} className="text-[#EF4444]" />
            <span className="text-[#A1A1AA] text-xs uppercase tracking-wider">{t('dashboard.expenses')}</span>
          </div>
          <p className="text-2xl font-mono font-bold text-[#EF4444]">
            {formatCurrency(stats?.finance?.expenses || 0)}
          </p>
        </div>

        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="metric-profit">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={18} className="text-[#D4AF37]" />
            <span className="text-[#A1A1AA] text-xs uppercase tracking-wider">{t('dashboard.netProfit')}</span>
          </div>
          <p className={`text-2xl font-mono font-bold ${(stats?.finance?.profit || 0) >= 0 ? 'text-[#D4AF37]' : 'text-[#EF4444]'}`}>
            {formatCurrency(stats?.finance?.profit || 0)}
          </p>
        </div>

        {/* Burn Rate */}
        {burnRate && (
          <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="burn-rate">
            <div className="flex items-center gap-2 mb-4">
              <Flame size={18} className="text-[#F59E0B]" />
              <span className="text-[#A1A1AA] text-xs uppercase tracking-wider">Burn Rate</span>
            </div>
            <p className="text-xl font-mono font-bold text-[#F59E0B]">
              {formatCurrency(burnRate.daily_burn_rate)}/jour
            </p>
            <p className="text-[#52525B] text-xs mt-1">
              {burnRate.days_remaining ? `${burnRate.days_remaining} jours restants` : 'Budget infini'}
            </p>
          </div>
        )}
      </div>

      {/* Project Urgency Heatmap */}
      {heatmap.length > 0 && (
        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="project-heatmap">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-rajdhani font-bold tracking-wider text-white">HEATMAP PROJETS</h3>
            <Link to="/projects" className="text-[#D4AF37] text-xs hover:underline">{t('common.viewAll')}</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {heatmap.slice(0, 6).map(project => (
              <Link 
                key={project.id} 
                to="/projects"
                className="bg-[#121212] border border-[#27272A] rounded-sm p-3 hover:border-[#D4AF37]/40 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium text-sm truncate flex-1">{project.name}</span>
                  <div 
                    className="w-3 h-3 rounded-full ml-2"
                    style={{ backgroundColor: getUrgencyColor(project.urgency_score) }}
                  />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs px-1.5 py-0.5 rounded-sm bg-[#0A0A0A] text-[#A1A1AA]">
                    {project.category}
                  </span>
                  <span className="text-xs text-[#52525B]">
                    Score: {project.urgency_score}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#52525B]">Progression</span>
                    <span className="text-[#D4AF37]">{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-1 bg-[#0A0A0A]" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="upcoming-events">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-rajdhani font-bold tracking-wider text-white">{t('dashboard.upcomingEvents').toUpperCase()}</h3>
            <Link to="/events" className="text-[#D4AF37] text-xs hover:underline">{t('common.viewAll')}</Link>
          </div>
          {stats?.upcoming_events?.length > 0 ? (
            <div className="space-y-3">
              {stats.upcoming_events.map((event) => (
                <div key={event.id} className="flex items-center justify-between py-2 border-b border-[#27272A] last:border-0">
                  <div>
                    <p className="text-white text-sm font-medium">{event.title}</p>
                    <p className="text-[#52525B] text-xs">{event.location || t('dashboard.noLocation')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#D4AF37] text-xs font-mono">{formatDate(event.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#52525B] text-sm">{t('dashboard.noUpcomingEvents')}</p>
          )}
        </div>

        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="recent-tasks">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-rajdhani font-bold tracking-wider text-white">{t('dashboard.activeTasks').toUpperCase()}</h3>
            <Link to="/tasks" className="text-[#D4AF37] text-xs hover:underline">{t('common.viewAll')}</Link>
          </div>
          {stats?.recent_tasks?.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between py-2 border-b border-[#27272A] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      task.priority === 'urgent' ? 'bg-[#EF4444]' :
                      task.priority === 'high' ? 'bg-[#F59E0B]' :
                      task.priority === 'medium' ? 'bg-[#D4AF37]' : 'bg-[#52525B]'
                    }`} />
                    <div>
                      <p className="text-white text-sm font-medium">{task.title}</p>
                      <p className={`text-xs capitalize ${getPriorityColor(task.priority)}`}>{task.priority}</p>
                    </div>
                  </div>
                  {task.deadline && (
                    <div className="flex items-center gap-1 text-[#52525B] text-xs">
                      <Clock size={12} />
                      <span>{formatDate(task.deadline)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#52525B] text-sm">{t('dashboard.noActiveTasks')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
