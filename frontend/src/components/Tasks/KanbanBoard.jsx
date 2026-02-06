import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { tasksAPI, projectsAPI } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, GripVertical, Clock, AlertTriangle, Link2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', color: '#52525B' },
  { id: 'in_progress', title: 'En cours', color: '#D4AF37' },
  { id: 'waiting', title: 'En attente', color: '#F59E0B' },
  { id: 'done', title: 'Terminé', color: '#10B981' }
];

const priorityColors = {
  low: '#A1A1AA',
  medium: '#D4AF37',
  high: '#F59E0B',
  urgent: '#EF4444'
};

export const KanbanBoard = ({ projectId = null }) => {
  const { canCreate, canDelete } = useAuth();
  const [kanban, setKanban] = useState({});
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'backlog',
    deadline: '',
    assigned_to: '',
    project_id: projectId || '',
    depends_on: [],
    is_recurring: false,
    recurrence_pattern: ''
  });

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      const url = projectId 
        ? `${API}/tasks/kanban?project_id=${projectId}`
        : `${API}/tasks/kanban`;
      const [kanbanRes, projectsRes] = await Promise.all([
        axios.get(url),
        projectsAPI.getAll()
      ]);
      setKanban(kanbanRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.setData('fromStatus', task.status);
  };

  const handleDrop = async (e, toStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const fromStatus = e.dataTransfer.getData('fromStatus');
    
    if (fromStatus === toStatus) return;
    
    // Optimistic update
    const task = kanban[fromStatus].find(t => t.id === taskId);
    if (!task) return;
    
    setKanban(prev => ({
      ...prev,
      [fromStatus]: prev[fromStatus].filter(t => t.id !== taskId),
      [toStatus]: [...prev[toStatus], { ...task, status: toStatus }]
    }));
    
    try {
      await axios.put(`${API}/tasks/${taskId}/status?status=${toStatus}`);
    } catch (error) {
      toast.error('Erreur de mise à jour');
      fetchData();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData };
      if (data.project_id === 'none' || !data.project_id) data.project_id = null;
      if (!data.assigned_to) data.assigned_to = null;
      if (!data.recurrence_pattern) data.recurrence_pattern = null;
      
      if (editingTask) {
        await tasksAPI.update(editingTask.id, data);
        toast.success('Tâche mise à jour');
      } else {
        await tasksAPI.create(data);
        toast.success('Tâche créée');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      deadline: task.deadline?.split('T')[0] || '',
      assigned_to: task.assigned_to || '',
      project_id: task.project_id || '',
      depends_on: task.depends_on || [],
      is_recurring: task.is_recurring || false,
      recurrence_pattern: task.recurrence_pattern || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (taskId) => {
    if (!confirm('Supprimer cette tâche ?')) return;
    try {
      await tasksAPI.delete(taskId);
      toast.success('Tâche supprimée');
      fetchData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const resetForm = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      status: 'backlog',
      deadline: '',
      assigned_to: '',
      project_id: projectId || '',
      depends_on: [],
      is_recurring: false,
      recurrence_pattern: ''
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      return format(parseISO(dateString), 'dd/MM');
    } catch {
      return null;
    }
  };

  const getProjectName = (pid) => {
    return projects.find(p => p.id === pid)?.name || '';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map(col => (
          <div key={col.id} className="h-96 bg-[#0A0A0A] rounded-sm border border-[#27272A] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-rajdhani font-bold tracking-wider text-white">KANBAN</h2>
        {canCreate() && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="kanban-add-task" className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm text-xs px-3 py-1 h-8">
                <Plus size={14} className="mr-1" />
                Tâche
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-rajdhani text-xl tracking-wider">
                  {editingTask ? 'MODIFIER TÂCHE' : 'NOUVELLE TÂCHE'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Titre</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm min-h-[60px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Priorité</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                      <SelectTrigger className="bg-[#121212] border-[#27272A] text-white rounded-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
                        <SelectItem value="low" className="text-white">Basse</SelectItem>
                        <SelectItem value="medium" className="text-white">Moyenne</SelectItem>
                        <SelectItem value="high" className="text-white">Haute</SelectItem>
                        <SelectItem value="urgent" className="text-white">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Statut</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger className="bg-[#121212] border-[#27272A] text-white rounded-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
                        {COLUMNS.map(col => (
                          <SelectItem key={col.id} value={col.id} className="text-white">{col.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Projet</Label>
                  <Select value={formData.project_id || 'none'} onValueChange={(v) => setFormData({ ...formData, project_id: v === 'none' ? '' : v })}>
                    <SelectTrigger className="bg-[#121212] border-[#27272A] text-white rounded-sm">
                      <SelectValue placeholder="Aucun projet" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
                      <SelectItem value="none" className="text-white">Aucun projet</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-white">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Échéance</Label>
                  <Input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                    className="rounded-sm border-[#27272A] bg-[#121212]"
                  />
                  <Label htmlFor="recurring" className="text-[#A1A1AA] text-xs">Tâche récurrente</Label>
                </div>
                {formData.is_recurring && (
                  <Select value={formData.recurrence_pattern} onValueChange={(v) => setFormData({ ...formData, recurrence_pattern: v })}>
                    <SelectTrigger className="bg-[#121212] border-[#27272A] text-white rounded-sm">
                      <SelectValue placeholder="Fréquence" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
                      <SelectItem value="daily" className="text-white">Quotidien</SelectItem>
                      <SelectItem value="weekly" className="text-white">Hebdomadaire</SelectItem>
                      <SelectItem value="monthly" className="text-white">Mensuel</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Button type="submit" className="w-full bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm">
                  {editingTask ? 'Mettre à jour' : 'Créer'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map(column => (
          <div
            key={column.id}
            className="bg-[#0A0A0A] border border-[#27272A] rounded-sm min-h-[400px]"
            onDrop={(e) => handleDrop(e, column.id)}
            onDragOver={handleDragOver}
            data-testid={`kanban-column-${column.id}`}
          >
            {/* Column Header */}
            <div className="p-3 border-b border-[#27272A] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }} />
                <span className="text-sm font-semibold text-white uppercase tracking-wider">
                  {column.title}
                </span>
              </div>
              <span className="text-xs text-[#52525B] bg-[#121212] px-2 py-0.5 rounded-sm">
                {kanban[column.id]?.length || 0}
              </span>
            </div>

            {/* Tasks */}
            <div className="p-2 space-y-2">
              {kanban[column.id]?.map(task => (
                <div
                  key={task.id}
                  draggable={canCreate()}
                  onDragStart={(e) => handleDragStart(e, task)}
                  className={`bg-[#121212] border border-[#27272A] rounded-sm p-3 cursor-grab active:cursor-grabbing hover:border-[#D4AF37]/40 transition-colors group ${task.is_blocked ? 'opacity-60' : ''}`}
                  data-testid={`kanban-task-${task.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: priorityColors[task.priority] }} 
                      />
                      <span className="text-white text-sm font-medium line-clamp-2">{task.title}</span>
                    </div>
                    {canCreate() && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(task)} className="p-1 text-[#A1A1AA] hover:text-[#D4AF37]">
                          <Edit size={12} />
                        </button>
                        {canDelete() && (
                          <button onClick={() => handleDelete(task.id)} className="p-1 text-[#A1A1AA] hover:text-[#EF4444]">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {task.is_blocked && (
                      <span className="text-[#EF4444] text-xs flex items-center gap-1">
                        <Link2 size={10} />
                        Bloqué
                      </span>
                    )}
                    {task.deadline && (
                      <span className="text-[#52525B] text-xs flex items-center gap-1">
                        <Clock size={10} />
                        {formatDate(task.deadline)}
                      </span>
                    )}
                    {task.project_id && (
                      <span className="text-[#A1A1AA] text-xs bg-[#0A0A0A] px-1.5 py-0.5 rounded-sm truncate max-w-[100px]">
                        {getProjectName(task.project_id)}
                      </span>
                    )}
                    {task.is_recurring && (
                      <span className="text-[#D4AF37] text-xs">↻</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
