import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { entitiesAPI, projectsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, Building2, FolderKanban } from 'lucide-react';

const typeOptions = [
  { value: 'holding', labelKey: 'entities.typeHolding' },
  { value: 'studio', labelKey: 'entities.typeStudio' },
  { value: 'label', labelKey: 'entities.typeLabel' },
  { value: 'agency', labelKey: 'entities.typeAgency' },
  { value: 'other', labelKey: 'entities.typeOther' }
];

const colorPresets = ['#D4AF37', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];

export default function EntitiesPage() {
  const { canCreate, canDelete } = useAuth();
  const { t } = useLanguage();
  const [entities, setEntities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'other',
    color: '#D4AF37'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [entitiesRes, projectsRes] = await Promise.all([
        entitiesAPI.getAll(),
        projectsAPI.getAll()
      ]);
      setEntities(entitiesRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      toast.error(t('common.noResults'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEntity) {
        await entitiesAPI.update(editingEntity.id, formData);
        toast.success(t('entities.updateEntity'));
      } else {
        await entitiesAPI.create(formData);
        toast.success(t('entities.createEntity'));
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error');
    }
  };

  const handleEdit = (entity) => {
    setEditingEntity(entity);
    setFormData({
      name: entity.name,
      description: entity.description,
      type: entity.type,
      color: entity.color
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm(t('entities.deleteConfirm'))) return;
    try {
      await entitiesAPI.delete(id);
      toast.success(t('common.delete'));
      fetchData();
    } catch (error) {
      toast.error('Error');
    }
  };

  const resetForm = () => {
    setEditingEntity(null);
    setFormData({ name: '', description: '', type: 'other', color: '#D4AF37' });
  };

  const getTypeLabel = (type) => {
    const opt = typeOptions.find(o => o.value === type);
    return opt ? t(opt.labelKey) : type;
  };

  const getProjectCount = (entityId) => projects.filter(p => p.entity_id === entityId).length;

  const filteredEntities = entities.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.description || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="entities-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-rajdhani font-bold tracking-wider text-white">{t('entities.title').toUpperCase()}</h1>
          <p className="text-[#A1A1AA] text-sm mt-1">{entities.length} {t('entities.totalEntities')}</p>
        </div>
        {canCreate() && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="create-entity-btn" className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm">
                <Plus size={16} className="mr-2" />
                {t('entities.newEntity')}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="font-rajdhani text-xl tracking-wider">
                  {(editingEntity ? t('entities.editEntity') : t('entities.newEntity')).toUpperCase()}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">{t('entities.entityName')}</Label>
                  <Input
                    data-testid="entity-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">{t('entities.description')}</Label>
                  <Textarea
                    data-testid="entity-description-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">{t('entities.type')}</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger data-testid="entity-type-select" className="bg-[#121212] border-[#27272A] text-white rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
                      {typeOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-[#121212]">
                          {t(opt.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">{t('entities.color')}</Label>
                  <div className="flex flex-wrap gap-2" data-testid="entity-color-picker">
                    {colorPresets.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: c })}
                        className={`w-8 h-8 rounded-sm border-2 transition-transform hover:scale-110 ${formData.color === c ? 'border-white' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                        aria-label={c}
                      />
                    ))}
                  </div>
                </div>
                <Button type="submit" data-testid="entity-submit-btn" className="w-full bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm">
                  {editingEntity ? t('entities.updateEntity') : t('entities.createEntity')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]" />
        <Input
          data-testid="entity-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('entities.searchEntities')}
          className="pl-9 bg-[#121212] border-[#27272A] text-white placeholder:text-[#52525B] focus:border-[#D4AF37] rounded-sm"
        />
      </div>

      {/* Entities Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-[#0A0A0A] rounded-sm border border-[#27272A] animate-pulse" />
          ))}
        </div>
      ) : filteredEntities.length === 0 ? (
        <div className="text-center py-12">
          <Building2 size={48} className="mx-auto text-[#27272A] mb-4" />
          <p className="text-[#52525B]">{t('entities.noEntities')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntities.map(entity => (
            <div
              key={entity.id}
              data-testid={`entity-card-${entity.id}`}
              className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4 hover:border-[#D4AF37]/40 transition-colors duration-300 group"
              style={{ borderLeft: `3px solid ${entity.color}` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-sm flex items-center justify-center" style={{ backgroundColor: `${entity.color}20` }}>
                    <Building2 size={18} style={{ color: entity.color }} />
                  </div>
                  <span className="px-2 py-0.5 rounded-sm text-xs font-medium uppercase tracking-wider" style={{ backgroundColor: `${entity.color}20`, color: entity.color }}>
                    {getTypeLabel(entity.type)}
                  </span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {canCreate() && (
                    <button
                      onClick={() => handleEdit(entity)}
                      data-testid={`edit-entity-${entity.id}`}
                      className="p-1.5 text-[#A1A1AA] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-sm"
                    >
                      <Edit size={14} />
                    </button>
                  )}
                  {canDelete() && (
                    <button
                      onClick={() => handleDelete(entity.id)}
                      data-testid={`delete-entity-${entity.id}`}
                      className="p-1.5 text-[#A1A1AA] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-sm"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <h3 className="text-lg font-rajdhani font-bold text-white mb-2 tracking-wide">{entity.name}</h3>
              <p className="text-[#A1A1AA] text-sm line-clamp-2 mb-4">{entity.description || t('entities.noDescription')}</p>
              <div className="flex items-center gap-1.5 text-xs text-[#52525B]">
                <FolderKanban size={12} />
                <span>{getProjectCount(entity.id)} {t('entities.projectsCount')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
