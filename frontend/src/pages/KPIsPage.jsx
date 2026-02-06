import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { kpisAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, BarChart3, TrendingUp, TrendingDown, Target, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const categoryOptions = [
  { value: 'revenue', label: 'Revenue', icon: TrendingUp, color: '#10B981' },
  { value: 'growth', label: 'Growth', icon: Activity, color: '#D4AF37' },
  { value: 'performance', label: 'Performance', icon: Target, color: '#3B82F6' },
  { value: 'engagement', label: 'Engagement', icon: BarChart3, color: '#8B5CF6' }
];

const periodOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' }
];

export default function KPIsPage() {
  const { canCreate, canDelete } = useAuth();
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    value: 0,
    unit: '',
    category: 'revenue',
    target: null,
    period: 'monthly'
  });

  useEffect(() => {
    fetchKpis();
  }, []);

  const fetchKpis = async () => {
    try {
      const response = await kpisAPI.getAll();
      setKpis(response.data);
    } catch (error) {
      toast.error('Failed to fetch KPIs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData };
      if (!data.target) data.target = null;
      
      if (editingKpi) {
        await kpisAPI.update(editingKpi.id, data);
        toast.success('KPI updated');
      } else {
        await kpisAPI.create(data);
        toast.success('KPI created');
      }
      setDialogOpen(false);
      resetForm();
      fetchKpis();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (kpi) => {
    setEditingKpi(kpi);
    setFormData({
      name: kpi.name,
      value: kpi.value,
      unit: kpi.unit,
      category: kpi.category,
      target: kpi.target || '',
      period: kpi.period
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this KPI?')) return;
    try {
      await kpisAPI.delete(id);
      toast.success('KPI deleted');
      fetchKpis();
    } catch (error) {
      toast.error('Failed to delete KPI');
    }
  };

  const resetForm = () => {
    setEditingKpi(null);
    setFormData({
      name: '',
      value: 0,
      unit: '',
      category: 'revenue',
      target: null,
      period: 'monthly'
    });
  };

  const filteredKpis = kpis.filter(kpi => 
    categoryFilter === 'all' || kpi.category === categoryFilter
  );

  const formatValue = (value, unit) => {
    if (unit === '%') return `${value}%`;
    if (unit === '$' || unit === 'USD') return `$${value.toLocaleString()}`;
    return `${value.toLocaleString()} ${unit}`;
  };

  const getProgress = (value, target) => {
    if (!target) return null;
    return Math.min(100, (value / target) * 100);
  };

  const getCategoryColor = (category) => {
    return categoryOptions.find(c => c.value === category)?.color || '#D4AF37';
  };

  // Group by category
  const groupedKpis = categoryOptions.reduce((acc, cat) => {
    acc[cat.value] = filteredKpis.filter(k => k.category === cat.value);
    return acc;
  }, {});

  // Sample chart data (would typically come from historical KPI data)
  const sampleChartData = [
    { month: 'Jan', value: 65 },
    { month: 'Feb', value: 72 },
    { month: 'Mar', value: 68 },
    { month: 'Apr', value: 85 },
    { month: 'May', value: 78 },
    { month: 'Jun', value: 92 }
  ];

  return (
    <div className="space-y-6" data-testid="kpis-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-rajdhani font-bold tracking-wider text-white">KPI DASHBOARD</h1>
          <p className="text-[#A1A1AA] text-sm mt-1">{kpis.length} metrics tracked</p>
        </div>
        {canCreate() && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="create-kpi-btn" className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm">
                <Plus size={16} className="mr-2" />
                New KPI
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="font-rajdhani text-xl tracking-wider">
                  {editingKpi ? 'EDIT KPI' : 'NEW KPI'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Metric Name</Label>
                  <Input
                    data-testid="kpi-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Monthly Revenue"
                    required
                    className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Current Value</Label>
                    <Input
                      type="number"
                      data-testid="kpi-value-input"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                      required
                      className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Unit</Label>
                    <Input
                      data-testid="kpi-unit-input"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="%, $, users..."
                      className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger data-testid="kpi-category-select" className="bg-[#121212] border-[#27272A] text-white rounded-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
                        {categoryOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-[#121212]">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Period</Label>
                    <Select value={formData.period} onValueChange={(v) => setFormData({ ...formData, period: v })}>
                      <SelectTrigger data-testid="kpi-period-select" className="bg-[#121212] border-[#27272A] text-white rounded-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
                        {periodOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-[#121212]">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Target (Optional)</Label>
                  <Input
                    type="number"
                    data-testid="kpi-target-input"
                    value={formData.target || ''}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="Target value"
                    className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                  />
                </div>
                <Button type="submit" data-testid="kpi-submit-btn" className="w-full bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm">
                  {editingKpi ? 'Update KPI' : 'Create KPI'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
            categoryFilter === 'all'
              ? 'bg-[#D4AF37] text-black'
              : 'bg-[#121212] text-[#A1A1AA] hover:text-white border border-[#27272A]'
          }`}
        >
          All Categories
        </button>
        {categoryOptions.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              data-testid={`filter-${cat.value}`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
                categoryFilter === cat.value
                  ? 'text-white'
                  : 'bg-[#121212] text-[#A1A1AA] hover:text-white border border-[#27272A]'
              }`}
              style={categoryFilter === cat.value ? { backgroundColor: cat.color } : {}}
            >
              <Icon size={12} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Performance Overview Chart */}
      {kpis.length > 0 && (
        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="performance-chart">
          <h3 className="text-lg font-rajdhani font-bold tracking-wider text-white mb-4">PERFORMANCE TREND</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sampleChartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#A1A1AA', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#A1A1AA', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#0A0A0A', border: '1px solid #27272A', borderRadius: '2px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#D4AF37" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* KPIs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-36 bg-[#0A0A0A] rounded-sm border border-[#27272A] animate-pulse" />
          ))}
        </div>
      ) : filteredKpis.length === 0 ? (
        <div className="text-center py-12">
          <BarChart3 size={48} className="mx-auto text-[#27272A] mb-4" />
          <p className="text-[#52525B]">No KPIs found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredKpis.map(kpi => {
            const progress = getProgress(kpi.value, kpi.target);
            const color = getCategoryColor(kpi.category);
            
            return (
              <div
                key={kpi.id}
                data-testid={`kpi-card-${kpi.id}`}
                className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4 hover:border-[#D4AF37]/40 transition-colors duration-300 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span 
                    className="text-xs font-medium uppercase tracking-wider px-2 py-0.5 rounded-sm"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    {kpi.category}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canCreate() && (
                      <button
                        onClick={() => handleEdit(kpi)}
                        data-testid={`edit-kpi-${kpi.id}`}
                        className="p-1 text-[#A1A1AA] hover:text-[#D4AF37]"
                      >
                        <Edit size={12} />
                      </button>
                    )}
                    {canDelete() && (
                      <button
                        onClick={() => handleDelete(kpi.id)}
                        data-testid={`delete-kpi-${kpi.id}`}
                        className="p-1 text-[#A1A1AA] hover:text-[#EF4444]"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                
                <p className="text-[#A1A1AA] text-xs mb-1 truncate">{kpi.name}</p>
                <p className="text-2xl font-mono font-bold text-white mb-2" style={{ color }}>
                  {formatValue(kpi.value, kpi.unit)}
                </p>
                
                {kpi.target && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#52525B]">Target</span>
                      <span className="text-[#A1A1AA]">{formatValue(kpi.target, kpi.unit)}</span>
                    </div>
                    <div className="h-1.5 bg-[#121212] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${progress}%`,
                          backgroundColor: progress >= 100 ? '#10B981' : color
                        }}
                      />
                    </div>
                    <p className="text-xs text-right" style={{ color: progress >= 100 ? '#10B981' : color }}>
                      {progress.toFixed(0)}%
                    </p>
                  </div>
                )}
                
                <p className="text-[#52525B] text-xs mt-2 capitalize">{kpi.period}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
