import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, X, CheckSquare, Calendar, DollarSign, Users, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const severityColors = {
  critical: '#EF4444',
  high: '#F59E0B',
  medium: '#D4AF37',
  low: '#52525B'
};

const typeIcons = {
  overdue_task: CheckSquare,
  event_deadline: Calendar,
  budget_alert: DollarSign,
  followup_due: Users
};

export const AlertsPanel = ({ onClose }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API}/alerts`);
      setAlerts(response.data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAlertClick = (alert) => {
    const routes = {
      task: '/tasks',
      event: '/events',
      project: '/projects',
      contact: '/contacts'
    };
    navigate(routes[alert.entity_type] || '/dashboard');
    onClose?.();
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;

  return (
    <div className="fixed right-0 top-0 h-screen w-80 bg-[#0A0A0A] border-l border-[#27272A] z-50 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#27272A]">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-[#D4AF37]" />
          <span className="font-rajdhani font-bold tracking-wider text-white">ALERTES</span>
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 bg-[#EF4444] text-white text-xs font-bold rounded-sm">
              {criticalCount}
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-1 text-[#52525B] hover:text-white">
          <X size={18} />
        </button>
      </div>

      {/* Alerts List */}
      <div className="overflow-y-auto h-[calc(100vh-60px)]">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-[#121212] rounded-sm animate-pulse" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center">
            <Bell size={32} className="mx-auto text-[#27272A] mb-2" />
            <p className="text-[#52525B] text-sm">Aucune alerte</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {alerts.map(alert => {
              const Icon = typeIcons[alert.type] || AlertTriangle;
              return (
                <button
                  key={alert.id}
                  onClick={() => handleAlertClick(alert)}
                  className="w-full p-3 bg-[#121212] border border-[#27272A] rounded-sm hover:border-[#D4AF37]/40 transition-colors text-left"
                  data-testid={`alert-${alert.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="p-1.5 rounded-sm"
                      style={{ backgroundColor: `${severityColors[alert.severity]}20` }}
                    >
                      <Icon size={14} style={{ color: severityColors[alert.severity] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium line-clamp-1">{alert.title}</p>
                      <p className="text-[#52525B] text-xs mt-0.5">{alert.message}</p>
                    </div>
                    <div 
                      className="w-2 h-2 rounded-full mt-1.5"
                      style={{ backgroundColor: severityColors[alert.severity] }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Alert Badge Component for header
export const AlertBadge = ({ onClick }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await axios.get(`${API}/alerts`);
        const critical = response.data.filter(a => a.severity === 'critical' || a.severity === 'high').length;
        setCount(critical);
      } catch (error) {
        console.error('Failed to fetch alert count');
      }
    };
    
    fetchCount();
    const interval = setInterval(fetchCount, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-[#A1A1AA] hover:text-white transition-colors"
      data-testid="alerts-badge"
    >
      <Bell size={20} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#EF4444] text-white text-xs font-bold rounded-full flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
};
