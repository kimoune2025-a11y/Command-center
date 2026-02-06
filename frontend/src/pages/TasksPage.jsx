import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { tasksAPI, projectsAPI } from '../lib/api';
import { KanbanBoard } from '../components/Tasks/KanbanBoard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Search, LayoutGrid, List, Filter } from 'lucide-react';

export default function TasksPage() {
  const { t } = useLanguage();
  const [view, setView] = useState('kanban');
  const [projects, setProjects] = useState([]);
  const [projectFilter, setProjectFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects');
    }
  };

  return (
    <div className="space-y-6" data-testid="tasks-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-rajdhani font-bold tracking-wider text-white">
            {t('tasks.title').toUpperCase()}
          </h1>
          <p className="text-[#A1A1AA] text-sm mt-1">Gérez vos tâches en mode Kanban</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-[#121212] border border-[#27272A] rounded-sm">
            <button
              onClick={() => setView('kanban')}
              data-testid="view-kanban"
              className={`p-2 ${view === 'kanban' ? 'text-[#D4AF37] bg-[#D4AF37]/10' : 'text-[#A1A1AA] hover:text-white'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setView('list')}
              data-testid="view-list"
              className={`p-2 ${view === 'list' ? 'text-[#D4AF37] bg-[#D4AF37]/10' : 'text-[#A1A1AA] hover:text-white'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher des tâches..."
            className="pl-9 bg-[#121212] border-[#27272A] text-white placeholder:text-[#52525B] focus:border-[#D4AF37] rounded-sm"
            data-testid="task-search-input"
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger data-testid="task-filter-project" className="w-full sm:w-48 bg-[#121212] border-[#27272A] text-white rounded-sm">
            <SelectValue placeholder="Tous les projets" />
          </SelectTrigger>
          <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
            <SelectItem value="all" className="text-white hover:bg-[#121212]">Tous les projets</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id} className="text-white hover:bg-[#121212]">
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {view === 'kanban' ? (
        <KanbanBoard projectId={projectFilter === 'all' ? null : projectFilter} />
      ) : (
        <TaskListView projectId={projectFilter === 'all' ? null : projectFilter} search={search} />
      )}
    </div>
  );
}

// List view component (simplified)
function TaskListView({ projectId, search }) {
  const { canCreate, canDelete } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      const response = await tasksAPI.getAll(projectId);
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const priorityColors = {
    low: '#A1A1AA',
    medium: '#D4AF37',
    high: '#F59E0B',
    urgent: '#EF4444'
  };

  const statusLabels = {
    backlog: 'Backlog',
    in_progress: 'En cours',
    waiting: 'En attente',
    done: 'Terminé'
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-[#0A0A0A] rounded-sm border border-[#27272A] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filteredTasks.map(task => (
        <div
          key={task.id}
          className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4 hover:border-[#D4AF37]/40 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: priorityColors[task.priority] }}
            />
            <div className="flex-1">
              <p className={`text-white font-medium ${task.status === 'done' ? 'line-through opacity-60' : ''}`}>
                {task.title}
              </p>
              {task.description && (
                <p className="text-[#52525B] text-sm truncate">{task.description}</p>
              )}
            </div>
            <span className="text-xs text-[#A1A1AA] bg-[#121212] px-2 py-1 rounded-sm">
              {statusLabels[task.status]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
