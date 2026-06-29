import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { boardPackAPI } from '../lib/api';
import { format, parseISO } from 'date-fns';
import {
  Lock, TrendingUp, TrendingDown, DollarSign, Flame, Building2,
  ListChecks, AlertTriangle, Clock, PauseCircle, Wallet
} from 'lucide-react';

const priorityColor = (p) => ({
  urgent: '#EF4444', high: '#F59E0B', medium: '#D4AF37', low: '#A1A1AA'
}[p] || '#A1A1AA');

const severityColor = (s) => (s === 'high' ? '#EF4444' : s === 'medium' ? '#F59E0B' : '#A1A1AA');

export default function BoardPackPage() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    boardPackAPI.get()
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (amount) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(amount || 0);

  const fmtDate = (d) => {
    if (!d) return t('boardPack.noDeadline');
    try { return format(parseISO(d), 'dd MMM yyyy'); } catch { return d; }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse" data-testid="board-pack-page">
        <div className="h-8 bg-[#121212] rounded-sm w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-[#0A0A0A] rounded-sm border border-[#27272A]" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="text-[#52525B] p-8" data-testid="board-pack-page">—</div>;
  }

  const { entity_performance = [], unassigned, top_priorities = [], risk_summary, treasury } = data;
  const showUnassigned = unassigned && (unassigned.projects_count > 0 || unassigned.revenue > 0 || unassigned.expenses > 0);

  return (
    <div className="space-y-6" data-testid="board-pack-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-rajdhani font-bold tracking-wider text-white">{t('boardPack.title').toUpperCase()}</h1>
          <p className="text-[#A1A1AA] text-sm mt-1">{t('boardPack.subtitle')}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-medium uppercase tracking-wider bg-[#121212] border border-[#27272A] text-[#A1A1AA] w-fit">
          <Lock size={12} /> {t('boardPack.readOnly')}
        </span>
      </div>

      {/* Treasury */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="treasury-net-cash">
          <div className="flex items-center gap-2 mb-3"><Wallet size={18} className="text-[#D4AF37]" /><span className="text-[#A1A1AA] text-xs uppercase tracking-wider">{t('boardPack.netCash')}</span></div>
          <p className={`text-2xl font-mono font-bold ${treasury.net_cash >= 0 ? 'text-[#D4AF37]' : 'text-[#EF4444]'}`}>{fmt(treasury.net_cash)}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="treasury-revenue">
          <div className="flex items-center gap-2 mb-3"><TrendingUp size={18} className="text-[#10B981]" /><span className="text-[#A1A1AA] text-xs uppercase tracking-wider">{t('boardPack.revenue')}</span></div>
          <p className="text-2xl font-mono font-bold text-[#10B981]">{fmt(treasury.total_revenue)}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="treasury-expenses">
          <div className="flex items-center gap-2 mb-3"><TrendingDown size={18} className="text-[#EF4444]" /><span className="text-[#A1A1AA] text-xs uppercase tracking-wider">{t('boardPack.expenses')}</span></div>
          <p className="text-2xl font-mono font-bold text-[#EF4444]">{fmt(treasury.total_expenses)}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="treasury-runway">
          <div className="flex items-center gap-2 mb-3"><Flame size={18} className="text-[#F59E0B]" /><span className="text-[#A1A1AA] text-xs uppercase tracking-wider">{t('boardPack.runway')}</span></div>
          <p className="text-2xl font-mono font-bold text-[#F59E0B]">{treasury.runway_months != null ? `${treasury.runway_months} ${t('boardPack.months')}` : t('boardPack.infinite')}</p>
          <p className="text-[#52525B] text-xs mt-1">{t('boardPack.monthlyBurn')}: {fmt(treasury.monthly_burn)}</p>
        </div>
      </div>

      {/* Entity Performance */}
      <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="entity-performance">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={18} className="text-[#D4AF37]" />
          <h3 className="text-lg font-rajdhani font-bold tracking-wider text-white">{t('boardPack.entityPerformance').toUpperCase()}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#52525B] text-xs uppercase tracking-wider border-b border-[#27272A]">
                <th className="text-left font-medium py-2 pr-4">{t('boardPack.entity')}</th>
                <th className="text-right font-medium py-2 px-4">{t('boardPack.projects')}</th>
                <th className="text-right font-medium py-2 px-4">{t('boardPack.budget')}</th>
                <th className="text-right font-medium py-2 px-4">{t('boardPack.revenue')}</th>
                <th className="text-right font-medium py-2 px-4">{t('boardPack.expenses')}</th>
                <th className="text-right font-medium py-2 pl-4">{t('boardPack.profit')}</th>
              </tr>
            </thead>
            <tbody>
              {entity_performance.map(e => (
                <tr key={e.id} data-testid={`entity-perf-row-${e.id}`} className="border-b border-[#27272A]/50 last:border-0">
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                      <span className="text-white font-medium">{e.name}</span>
                    </span>
                  </td>
                  <td className="text-right py-3 px-4 text-[#A1A1AA] font-mono">{e.projects_count}</td>
                  <td className="text-right py-3 px-4 text-[#A1A1AA] font-mono">{fmt(e.total_budget)}</td>
                  <td className="text-right py-3 px-4 text-[#10B981] font-mono">{fmt(e.revenue)}</td>
                  <td className="text-right py-3 px-4 text-[#EF4444] font-mono">{fmt(e.expenses)}</td>
                  <td className={`text-right py-3 pl-4 font-mono font-bold ${e.profit >= 0 ? 'text-[#D4AF37]' : 'text-[#EF4444]'}`}>{fmt(e.profit)}</td>
                </tr>
              ))}
              {showUnassigned && (
                <tr data-testid="entity-perf-row-unassigned" className="border-t border-[#27272A]">
                  <td className="py-3 pr-4 text-[#52525B] italic">{t('boardPack.unassigned')}</td>
                  <td className="text-right py-3 px-4 text-[#52525B] font-mono">{unassigned.projects_count}</td>
                  <td className="text-right py-3 px-4 text-[#52525B] font-mono">{fmt(unassigned.total_budget)}</td>
                  <td className="text-right py-3 px-4 text-[#52525B] font-mono">{fmt(unassigned.revenue)}</td>
                  <td className="text-right py-3 px-4 text-[#52525B] font-mono">{fmt(unassigned.expenses)}</td>
                  <td className={`text-right py-3 pl-4 font-mono ${unassigned.profit >= 0 ? 'text-[#D4AF37]' : 'text-[#EF4444]'}`}>{fmt(unassigned.profit)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Priorities + Risks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top priorities */}
        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="top-priorities">
          <div className="flex items-center gap-2 mb-4">
            <ListChecks size={18} className="text-[#D4AF37]" />
            <h3 className="text-lg font-rajdhani font-bold tracking-wider text-white">{t('boardPack.topPriorities').toUpperCase()}</h3>
          </div>
          {top_priorities.length === 0 ? (
            <p className="text-[#52525B] text-sm">{t('boardPack.noPriorities')}</p>
          ) : (
            <div className="space-y-2">
              {top_priorities.map((task, idx) => (
                <div key={task.id} className="flex items-center gap-3 py-2 border-b border-[#27272A]/50 last:border-0">
                  <span className="text-[#52525B] text-xs font-mono w-5">{idx + 1}.</span>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: priorityColor(task.priority) }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{task.title}</p>
                    <p className="text-[#52525B] text-xs truncate">
                      {task.project_name || '—'}{task.entity_name ? ` · ${task.entity_name}` : ''}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-[#52525B] text-xs shrink-0">
                    <Clock size={11} /> {fmtDate(task.deadline)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Risk summary */}
        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="risk-summary">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-[#F59E0B]" />
            <h3 className="text-lg font-rajdhani font-bold tracking-wider text-white">{t('boardPack.riskSummary').toUpperCase()}</h3>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-[#121212] rounded-sm p-3 text-center">
              <p className="text-2xl font-mono font-bold text-[#EF4444]">{risk_summary.overdue_tasks}</p>
              <p className="text-[#52525B] text-xs mt-1">{t('boardPack.overdueTasks')}</p>
            </div>
            <div className="bg-[#121212] rounded-sm p-3 text-center">
              <p className="text-2xl font-mono font-bold text-[#F59E0B]">{risk_summary.projects_on_hold}</p>
              <p className="text-[#52525B] text-xs mt-1">{t('boardPack.projectsOnHold')}</p>
            </div>
            <div className="bg-[#121212] rounded-sm p-3 text-center">
              <p className="text-2xl font-mono font-bold text-[#EF4444]">{risk_summary.over_budget_entities}</p>
              <p className="text-[#52525B] text-xs mt-1">{t('boardPack.overBudget')}</p>
            </div>
          </div>
          {risk_summary.items.length === 0 ? (
            <p className="text-[#10B981] text-sm">{t('boardPack.noRisks')}</p>
          ) : (
            <div className="space-y-2">
              {risk_summary.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 py-1.5 border-b border-[#27272A]/50 last:border-0">
                  {item.type === 'project_on_hold' ? <PauseCircle size={14} style={{ color: severityColor(item.severity) }} /> : <AlertTriangle size={14} style={{ color: severityColor(item.severity) }} />}
                  <span className="text-white text-sm flex-1 truncate">{item.label}</span>
                  <span className="text-xs uppercase tracking-wider" style={{ color: severityColor(item.severity) }}>{item.severity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
