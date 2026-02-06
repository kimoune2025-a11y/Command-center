import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeAPI, projectsAPI, contactsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const typeOptions = [
  { value: 'revenue', label: 'Revenue', color: '#10B981' },
  { value: 'expense', label: 'Expense', color: '#EF4444' },
  { value: 'budget', label: 'Budget', color: '#D4AF37' }
];

const categoryOptions = [
  'Operations', 'Marketing', 'Production', 'Personnel', 'Equipment', 
  'Travel', 'Events', 'Sponsorship', 'Sales', 'Licensing', 'Other'
];

export default function FinancePage() {
  const { canCreate, canDelete } = useAuth();
  const [records, setRecords] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    type: 'expense',
    category: 'Operations',
    amount: 0,
    description: '',
    project_id: '',
    sponsor_id: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [financeRes, projectsRes, contactsRes] = await Promise.all([
        financeAPI.getAll(),
        projectsAPI.getAll(),
        contactsAPI.getAll('sponsor')
      ]);
      setRecords(financeRes.data);
      setProjects(projectsRes.data);
      setSponsors(contactsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData };
      if (!data.project_id) data.project_id = null;
      if (!data.sponsor_id) data.sponsor_id = null;
      
      if (editingRecord) {
        await financeAPI.update(editingRecord.id, data);
        toast.success('Record updated');
      } else {
        await financeAPI.create(data);
        toast.success('Record created');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      type: record.type,
      category: record.category,
      amount: record.amount,
      description: record.description,
      project_id: record.project_id || '',
      sponsor_id: record.sponsor_id || '',
      date: record.date?.split('T')[0] || format(new Date(), 'yyyy-MM-dd')
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      await financeAPI.delete(id);
      toast.success('Record deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete record');
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setFormData({
      type: 'expense',
      category: 'Operations',
      amount: 0,
      description: '',
      project_id: '',
      sponsor_id: '',
      date: format(new Date(), 'yyyy-MM-dd')
    });
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.description?.toLowerCase().includes(search.toLowerCase()) ||
                         record.category.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || record.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  // Calculate totals
  const totals = {
    revenue: records.filter(r => r.type === 'revenue').reduce((sum, r) => sum + r.amount, 0),
    expense: records.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0),
    budget: records.filter(r => r.type === 'budget').reduce((sum, r) => sum + r.amount, 0)
  };
  totals.profit = totals.revenue - totals.expense;

  // Chart data
  const pieData = [
    { name: 'Revenue', value: totals.revenue, color: '#10B981' },
    { name: 'Expenses', value: totals.expense, color: '#EF4444' }
  ];

  const categoryData = categoryOptions.map(cat => ({
    category: cat,
    amount: records.filter(r => r.category === cat && r.type === 'expense').reduce((sum, r) => sum + r.amount, 0)
  })).filter(d => d.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 6);

  return (
    <div className="space-y-6" data-testid="finance-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-rajdhani font-bold tracking-wider text-white">FINANCE</h1>
          <p className="text-[#A1A1AA] text-sm mt-1">{records.length} financial records</p>
        </div>
        {canCreate() && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="create-finance-btn" className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm">
                <Plus size={16} className="mr-2" />
                New Record
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="font-rajdhani text-xl tracking-wider">
                  {editingRecord ? 'EDIT RECORD' : 'NEW RECORD'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Type</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger data-testid="finance-type-select" className="bg-[#121212] border-[#27272A] text-white rounded-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
                        {typeOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-[#121212]">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger data-testid="finance-category-select" className="bg-[#121212] border-[#27272A] text-white rounded-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
                        {categoryOptions.map(cat => (
                          <SelectItem key={cat} value={cat} className="text-white hover:bg-[#121212]">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Amount (USD)</Label>
                    <Input
                      type="number"
                      data-testid="finance-amount-input"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      required
                      className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Date</Label>
                    <Input
                      type="date"
                      data-testid="finance-date-input"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Project (Optional)</Label>
                  <Select value={formData.project_id} onValueChange={(v) => setFormData({ ...formData, project_id: v })}>
                    <SelectTrigger data-testid="finance-project-select" className="bg-[#121212] border-[#27272A] text-white rounded-sm">
                      <SelectValue placeholder="No project" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
                      <SelectItem value="none" className="text-white hover:bg-[#121212]">No project</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-white hover:bg-[#121212]">
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Description</Label>
                  <Textarea
                    data-testid="finance-description-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm min-h-[60px]"
                  />
                </div>
                <Button type="submit" data-testid="finance-submit-btn" className="w-full bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm">
                  {editingRecord ? 'Update Record' : 'Create Record'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="total-revenue">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-[#10B981]" />
            <span className="text-[#A1A1AA] text-xs uppercase tracking-wider">Total Revenue</span>
          </div>
          <p className="text-2xl font-mono font-bold text-[#10B981]">{formatCurrency(totals.revenue)}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="total-expenses">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={18} className="text-[#EF4444]" />
            <span className="text-[#A1A1AA] text-xs uppercase tracking-wider">Total Expenses</span>
          </div>
          <p className="text-2xl font-mono font-bold text-[#EF4444]">{formatCurrency(totals.expense)}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="total-budget">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={18} className="text-[#D4AF37]" />
            <span className="text-[#A1A1AA] text-xs uppercase tracking-wider">Total Budget</span>
          </div>
          <p className="text-2xl font-mono font-bold text-[#D4AF37]">{formatCurrency(totals.budget)}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="net-profit">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} className={totals.profit >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'} />
            <span className="text-[#A1A1AA] text-xs uppercase tracking-wider">Net Profit</span>
          </div>
          <p className={`text-2xl font-mono font-bold ${totals.profit >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
            {formatCurrency(totals.profit)}
          </p>
        </div>
      </div>

      {/* Charts */}
      {records.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue vs Expenses Pie Chart */}
          <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="revenue-expense-chart">
            <h3 className="text-lg font-rajdhani font-bold tracking-wider text-white mb-4">REVENUE VS EXPENSES</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: '#0A0A0A', border: '1px solid #27272A', borderRadius: '2px' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              {pieData.map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ background: item.color }} />
                  <span className="text-[#A1A1AA] text-xs">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category Breakdown Bar Chart */}
          <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="category-chart">
            <h3 className="text-lg font-rajdhani font-bold tracking-wider text-white mb-4">EXPENSE BY CATEGORY</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#A1A1AA', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="category" tick={{ fill: '#A1A1AA', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip 
                    contentStyle={{ background: '#0A0A0A', border: '1px solid #27272A', borderRadius: '2px' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Bar dataKey="amount" fill="#D4AF37" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]" />
          <Input
            data-testid="finance-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search records..."
            className="pl-9 bg-[#121212] border-[#27272A] text-white placeholder:text-[#52525B] focus:border-[#D4AF37] rounded-sm"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger data-testid="finance-filter-type" className="w-full sm:w-40 bg-[#121212] border-[#27272A] text-white rounded-sm">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
            <SelectItem value="all" className="text-white hover:bg-[#121212]">All Types</SelectItem>
            {typeOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-[#121212]">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Records Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-[#0A0A0A] rounded-sm border border-[#27272A] animate-pulse" />
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-12">
          <DollarSign size={48} className="mx-auto text-[#27272A] mb-4" />
          <p className="text-[#52525B]">No financial records found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#27272A]">
                <th className="text-left py-3 px-4 text-[#A1A1AA] text-xs uppercase tracking-wider font-semibold">Date</th>
                <th className="text-left py-3 px-4 text-[#A1A1AA] text-xs uppercase tracking-wider font-semibold">Type</th>
                <th className="text-left py-3 px-4 text-[#A1A1AA] text-xs uppercase tracking-wider font-semibold">Category</th>
                <th className="text-left py-3 px-4 text-[#A1A1AA] text-xs uppercase tracking-wider font-semibold">Description</th>
                <th className="text-right py-3 px-4 text-[#A1A1AA] text-xs uppercase tracking-wider font-semibold">Amount</th>
                <th className="text-right py-3 px-4 text-[#A1A1AA] text-xs uppercase tracking-wider font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(record => (
                <tr key={record.id} data-testid={`finance-row-${record.id}`} className="border-b border-[#27272A] hover:bg-[#D4AF37]/5">
                  <td className="py-3 px-4 text-white text-sm font-mono">{formatDate(record.date)}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium uppercase ${
                      record.type === 'revenue' ? 'bg-[#10B981]/20 text-[#10B981]' :
                      record.type === 'expense' ? 'bg-[#EF4444]/20 text-[#EF4444]' :
                      'bg-[#D4AF37]/20 text-[#D4AF37]'
                    }`}>
                      {record.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#A1A1AA] text-sm">{record.category}</td>
                  <td className="py-3 px-4 text-white text-sm max-w-[200px] truncate">{record.description || '-'}</td>
                  <td className={`py-3 px-4 text-right font-mono text-sm ${
                    record.type === 'revenue' ? 'text-[#10B981]' :
                    record.type === 'expense' ? 'text-[#EF4444]' :
                    'text-[#D4AF37]'
                  }`}>
                    {formatCurrency(record.amount)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canCreate() && (
                        <button
                          onClick={() => handleEdit(record)}
                          data-testid={`edit-finance-${record.id}`}
                          className="p-1.5 text-[#A1A1AA] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-sm"
                        >
                          <Edit size={14} />
                        </button>
                      )}
                      {canDelete() && (
                        <button
                          onClick={() => handleDelete(record.id)}
                          data-testid={`delete-finance-${record.id}`}
                          className="p-1.5 text-[#A1A1AA] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-sm"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
