import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { projectsAPI } from '../lib/api';
import { ProjectTimeline } from '../components/Projects/ProjectTimeline';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, FolderKanban, Calendar, Users, DollarSign, ChevronRight, ChevronDown, Layers } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const CATEGORIES = ['Music', 'Events', 'Tech', 'Agro', 'Admin', 'Other'];

const categoryColors = {
  Music: '#8B5CF6',
  Events: '#F59E0B',
  Tech: '#3B82F6',
  Agro: '#10B981',
  Admin: '#EF4444',
  Other: '#A1A1AA'
};

const statusOptions = [
  { value: 'planning', label: 'Planification', color: '#52525B' },
  { value: 'in_progress', label: 'En cours', color: '#D4AF37' },
  { value: 'on_hold', label: 'En pause', color: '#EF4444' },
  { value: 'completed', label: 'Terminé', color: '#10B981' }
];

export default function ProjectsPage() {
  const { canCreate, canDelete } = useAuth();
  const { t } = useLanguage();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [expandedProjects, setExpandedProjects] = useState(new Set());
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planning',
    deadline: '',
    team_members: [],
    budget: 0,
    category: 'Other',
    parent_id: ''
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData };
      if (data.parent_id === 'none' || !data.parent_id) data.parent_id = null;
      
      if (editingProject) {
        await projectsAPI.update(editingProject.id, data);
        toast.success('Projet mis à jour');
      } else {
        await projectsAPI.create(data);
        toast.success('Projet créé');
      }
      setDialogOpen(false);
      resetForm();
      fetchProjects();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleEdit = (project, e) => {
    e?.stopPropagation();
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description,
      status: project.status,
      deadline: project.deadline || '',
      team_members: project.team_members || [],
      budget: project.budget,
      category: project.category || 'Other',
      parent_id: project.parent_id || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    if (!confirm('Supprimer ce projet et ses sous-projets ?')) return;
    try {
      await projectsAPI.delete(id);
      toast.success('Projet supprimé');
      fetchProjects();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const resetForm = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      description: '',
      status: 'planning',
      deadline: '',
      team_members: [],
      budget: 0,
      category: 'Other',
      parent_id: ''
    });
  };

  const toggleExpand = (projectId) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  // Filter and organize projects
  const parentProjects = projects.filter(p => !p.parent_id);
  
  const filteredProjects = parentProjects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(search.toLowerCase()) ||
                         project.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || project.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getSubProjects = (parentId) => projects.filter(p => p.parent_id === parentId);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const option = statusOptions.find(o => o.value === status);
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-medium uppercase tracking-wider`}
        style={{ backgroundColor: `${option?.color}30`, color: option?.color }}>
        {option?.label}
      </span>
    );
  };

  const ProjectCard = ({ project, isChild = false }) => {
    const subProjects = getSubProjects(project.id);
    const hasChildren = subProjects.length > 0;
    const isExpanded = expandedProjects.has(project.id);
    
    return (
      <div className={`${isChild ? 'ml-6 border-l-2 border-[#27272A] pl-4' : ''}`}>
        <div
          onClick={() => setSelectedProject(project)}
          className={`bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4 hover:border-[#D4AF37]/40 transition-colors cursor-pointer group ${selectedProject?.id === project.id ? 'border-[#D4AF37]' : ''}`}
          data-testid={`project-card-${project.id}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {hasChildren && (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleExpand(project.id); }}
                  className="p-1 text-[#52525B] hover:text-white"
                >
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              )}
              <span 
                className="px-2 py-0.5 rounded-sm text-xs font-medium uppercase"
                style={{ backgroundColor: `${categoryColors[project.category]}20`, color: categoryColors[project.category] }}
              >
                {project.category}
              </span>
              {getStatusBadge(project.status)}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {canCreate() && (
                <button
                  onClick={(e) => handleEdit(project, e)}
                  className="p-1.5 text-[#A1A1AA] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-sm"
                >
                  <Edit size={14} />
                </button>
              )}
              {canDelete() && (
                <button
                  onClick={(e) => handleDelete(project.id, e)}
                  className="p-1.5 text-[#A1A1AA] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-sm"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
          
          <h3 className="text-lg font-rajdhani font-bold text-white mb-2 tracking-wide">{project.name}</h3>
          <p className="text-[#A1A1AA] text-sm line-clamp-2 mb-3">{project.description || 'Pas de description'}</p>
          
          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#52525B] text-xs">Progression</span>
              <span className="text-[#D4AF37] text-xs font-mono">{project.progress || 0}%</span>
            </div>
            <Progress value={project.progress || 0} className="h-1.5 bg-[#121212]" />
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-[#52525B]">
              <Calendar size={12} />
              <span>{formatDate(project.deadline)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#52525B]">
              <Layers size={12} />
              <span>{subProjects.length} sous-projets</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#D4AF37] col-span-2">
              <DollarSign size={12} />
              <span className="font-mono">{formatCurrency(project.budget)}</span>
            </div>
          </div>
        </div>
        
        {/* Sub-projects */}
        {hasChildren && isExpanded && (
          <div className="mt-2 space-y-2">
            {subProjects.map(sub => (
              <ProjectCard key={sub.id} project={sub} isChild />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="projects-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-rajdhani font-bold tracking-wider text-white">PROJETS</h1>
          <p className="text-[#A1A1AA] text-sm mt-1">{projects.length} projets au total</p>
        </div>
        {canCreate() && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="create-project-btn" className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm">
                <Plus size={16} className="mr-2" />
                Nouveau projet
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-rajdhani text-xl tracking-wider">
                  {editingProject ? 'MODIFIER PROJET' : 'NOUVEAU PROJET'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Nom</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm min-h-[80px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Catégorie</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger className="bg-[#121212] border-[#27272A] text-white rounded-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat} className="text-white">{cat}</SelectItem>
                        ))}
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
                        {statusOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value} className="text-white">{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Projet parent</Label>
                  <Select value={formData.parent_id || 'none'} onValueChange={(v) => setFormData({ ...formData, parent_id: v === 'none' ? '' : v })}>
                    <SelectTrigger className="bg-[#121212] border-[#27272A] text-white rounded-sm">
                      <SelectValue placeholder="Aucun (projet principal)" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
                      <SelectItem value="none" className="text-white">Aucun (projet principal)</SelectItem>
                      {parentProjects.filter(p => p.id !== editingProject?.id).map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-white">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Échéance</Label>
                    <Input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Budget (€)</Label>
                    <Input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                      className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm">
                  {editingProject ? 'Mettre à jour' : 'Créer'}
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
          className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
            categoryFilter === 'all' ? 'bg-[#D4AF37] text-black' : 'bg-[#121212] text-[#A1A1AA] hover:text-white border border-[#27272A]'
          }`}
        >
          Tous
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
              categoryFilter === cat ? 'text-white' : 'bg-[#121212] text-[#A1A1AA] hover:text-white border border-[#27272A]'
            }`}
            style={categoryFilter === cat ? { backgroundColor: categoryColors[cat] } : {}}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher des projets..."
          className="pl-9 bg-[#121212] border-[#27272A] text-white placeholder:text-[#52525B] focus:border-[#D4AF37] rounded-sm"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-48 bg-[#0A0A0A] rounded-sm border border-[#27272A] animate-pulse" />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <FolderKanban size={48} className="mx-auto text-[#27272A] mb-4" />
              <p className="text-[#52525B]">Aucun projet trouvé</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProjects.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>

        {/* Project Timeline / Details */}
        <div className="lg:col-span-1">
          {selectedProject ? (
            <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-rajdhani font-bold tracking-wider text-white truncate">
                  {selectedProject.name}
                </h3>
                <button
                  onClick={() => setSelectedProject(null)}
                  className="text-[#52525B] hover:text-white text-xs"
                >
                  Fermer
                </button>
              </div>
              <ProjectTimeline projectId={selectedProject.id} />
            </div>
          ) : (
            <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-8 text-center">
              <FolderKanban size={32} className="mx-auto text-[#27272A] mb-2" />
              <p className="text-[#52525B] text-sm">Sélectionnez un projet pour voir sa timeline</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
