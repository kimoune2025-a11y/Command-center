import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { tasksAPI, projectsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, CheckSquare, Calendar, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'text-[#A1A1AA]', bg: 'bg-[#A1A1AA]/20' },
  { value: 'medium', label: 'Medium', color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/20' },
  { value: 'high', label: 'High', color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/20' },
  { value: 'urgent', label: 'Urgent', color: 'text-[#EF4444]', bg: 'bg-[#EF4444]/20' }
];

const statusOptions = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'completed', label: 'Completed' }
];

export default function TasksPage() {
  const { canCreate, canDelete } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    deadline: '',
    assigned_to: '',
    project_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        tasksAPI.getAll(),
        projectsAPI.getAll()
      ]);
      setTasks(tasksRes.data);
      setProjects(projectsRes.data);
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
      if (!data.assigned_to) data.assigned_to = null;
      
      if (editingTask) {
        await tasksAPI.update(editingTask.id, data);
        toast.success('Task updated');
      } else {
        await tasksAPI.create(data);
        toast.success('Task created');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      deadline: task.deadline || '',
      assigned_to: task.assigned_to || '',
      project_id: task.project_id || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await tasksAPI.delete(id);
      toast.success('Task deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleStatusToggle = async (task) => {
    if (!canCreate()) return;
    try {
      const newStatus = task.status === 'completed' ? 'todo' : 'completed';
      await tasksAPI.update(task.id, { ...task, status: newStatus });
      fetchData();
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const resetForm = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      deadline: '',
      assigned_to: '',
      project_id: ''
    });
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesProject = projectFilter === 'all' || task.project_id === projectFilter;
    return matchesSearch && matchesPriority && matchesStatus && matchesProject;
  });

  const getPriorityBadge = (priority) => {
    const opt = priorityOptions.find(o => o.value === priority);
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium uppercase tracking-wider ${opt?.bg} ${opt?.color}`}>
        {opt?.label}
      </span>
    );
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || '-';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  // Group tasks by status
  const groupedTasks = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    review: filteredTasks.filter(t => t.status === 'review'),
    completed: filteredTasks.filter(t => t.status === 'completed')
  };

  return (
    <div className="space-y-6" data-testid="tasks-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-rajdhani font-bold tracking-wider text-white">TASK MANAGER</h1>
          <p className="text-[#A1A1AA] text-sm mt-1">{tasks.length} total tasks</p>
        </div>
        {canCreate() && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="create-task-btn" className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm">
                <Plus size={16} className="mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="font-rajdhani text-xl tracking-wider">
                  {editingTask ? 'EDIT TASK' : 'NEW TASK'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Title</Label>
                  <Input
                    data-testid="task-title-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Description</Label>
                  <Textarea
                    data-testid="task-description-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm min-h-[80px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Priority</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                      <SelectTrigger data-testid="task-priority-select" className="bg-[#121212] border-[#27272A] text-white rounded-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
                        {priorityOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-[#121212]">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger data-testid="task-status-select" className="bg-[#121212] border-[#27272A] text-white rounded-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
                        {statusOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-[#121212]">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Project</Label>
                  <Select value={formData.project_id} onValueChange={(v) => setFormData({ ...formData, project_id: v })}>
                    <SelectTrigger data-testid="task-project-select" className="bg-[#121212] border-[#27272A] text-white rounded-sm">
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
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Deadline</Label>
                  <Input
                    type="date"
                    data-testid="task-deadline-input"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                  />
                </div>
                <Button type="submit" data-testid="task-submit-btn" className="w-full bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm">
                  {editingTask ? 'Update Task' : 'Create Task'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]" />
          <Input
            data-testid="task-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="pl-9 bg-[#121212] border-[#27272A] text-white placeholder:text-[#52525B] focus:border-[#D4AF37] rounded-sm"
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger data-testid="task-filter-priority" className="w-full sm:w-36 bg-[#121212] border-[#27272A] text-white rounded-sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
            <SelectItem value="all" className="text-white hover:bg-[#121212]">All Priority</SelectItem>
            {priorityOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-[#121212]">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger data-testid="task-filter-project" className="w-full sm:w-48 bg-[#121212] border-[#27272A] text-white rounded-sm">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
            <SelectItem value="all" className="text-white hover:bg-[#121212]">All Projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id} className="text-white hover:bg-[#121212]">
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-[#0A0A0A] rounded-sm border border-[#27272A] animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckSquare size={48} className="mx-auto text-[#27272A] mb-4" />
          <p className="text-[#52525B]">No tasks found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              data-testid={`task-item-${task.id}`}
              className={`bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4 hover:border-[#D4AF37]/40 transition-colors duration-300 group ${task.status === 'completed' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={() => handleStatusToggle(task)}
                  disabled={!canCreate()}
                  className="mt-1 border-[#27272A] data-[state=checked]:bg-[#D4AF37] data-[state=checked]:border-[#D4AF37]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className={`font-medium text-white ${task.status === 'completed' ? 'line-through' : ''}`}>
                      {task.title}
                    </h3>
                    {getPriorityBadge(task.priority)}
                  </div>
                  <p className="text-[#A1A1AA] text-sm line-clamp-1">{task.description || 'No description'}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-[#52525B]">
                    {task.project_id && (
                      <span className="flex items-center gap-1">
                        <Filter size={12} />
                        {getProjectName(task.project_id)}
                      </span>
                    )}
                    {task.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(task.deadline)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {canCreate() && (
                    <button
                      onClick={() => handleEdit(task)}
                      data-testid={`edit-task-${task.id}`}
                      className="p-1.5 text-[#A1A1AA] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-sm"
                    >
                      <Edit size={14} />
                    </button>
                  )}
                  {canDelete() && (
                    <button
                      onClick={() => handleDelete(task.id)}
                      data-testid={`delete-task-${task.id}`}
                      className="p-1.5 text-[#A1A1AA] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-sm"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
