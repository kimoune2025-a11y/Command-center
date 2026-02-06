import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, StickyNote, FileText, MessageSquare, Lightbulb, BookOpen } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const noteTypes = [
  { value: 'note', label: 'Note', icon: StickyNote, color: '#D4AF37' },
  { value: 'meeting', label: 'Réunion', icon: MessageSquare, color: '#3B82F6' },
  { value: 'decision', label: 'Décision', icon: Lightbulb, color: '#10B981' },
  { value: 'journal', label: 'Journal', icon: BookOpen, color: '#8B5CF6' }
];

export const ProjectTimeline = ({ projectId }) => {
  const { canCreate, canDelete } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState({
    project_id: projectId,
    type: 'note',
    title: '',
    content: '',
    participants: [],
    tags: []
  });

  useEffect(() => {
    fetchNotes();
  }, [projectId, filter]);

  const fetchNotes = async () => {
    try {
      let url = `${API}/notes?project_id=${projectId}`;
      if (filter !== 'all') url += `&type=${filter}`;
      const response = await axios.get(url);
      setNotes(response.data);
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData, project_id: projectId };
      
      if (editingNote) {
        await axios.put(`${API}/notes/${editingNote.id}`, data);
        toast.success('Note mise à jour');
      } else {
        await axios.post(`${API}/notes`, data);
        toast.success('Note créée');
      }
      setDialogOpen(false);
      resetForm();
      fetchNotes();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setFormData({
      project_id: projectId,
      type: note.type,
      title: note.title,
      content: note.content,
      participants: note.participants || [],
      tags: note.tags || []
    });
    setDialogOpen(true);
  };

  const handleDelete = async (noteId) => {
    if (!confirm('Supprimer cette note ?')) return;
    try {
      await axios.delete(`${API}/notes/${noteId}`);
      toast.success('Note supprimée');
      fetchNotes();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const resetForm = () => {
    setEditingNote(null);
    setFormData({
      project_id: projectId,
      type: 'note',
      title: '',
      content: '',
      participants: [],
      tags: []
    });
  };

  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'dd MMM yyyy, HH:mm', { locale: fr });
    } catch {
      return dateString;
    }
  };

  const getNoteTypeInfo = (type) => noteTypes.find(t => t.value === type) || noteTypes[0];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-rajdhani font-bold tracking-wider text-white">TIMELINE</h3>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-32 h-8 bg-[#121212] border-[#27272A] text-white text-xs rounded-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
              <SelectItem value="all" className="text-white">Tout</SelectItem>
              {noteTypes.map(t => (
                <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canCreate() && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm text-xs px-3 py-1 h-8">
                <Plus size={14} className="mr-1" />
                Note
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-rajdhani text-xl tracking-wider">
                  {editingNote ? 'MODIFIER' : 'NOUVELLE NOTE'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Type</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger className="bg-[#121212] border-[#27272A] text-white rounded-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
                        {noteTypes.map(t => (
                          <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Titre</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Contenu</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                    className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm min-h-[150px]"
                  />
                </div>
                <Button type="submit" className="w-full bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm">
                  {editingNote ? 'Mettre à jour' : 'Créer'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-[#121212] rounded-sm animate-pulse" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8">
          <FileText size={32} className="mx-auto text-[#27272A] mb-2" />
          <p className="text-[#52525B] text-sm">Aucune note pour ce projet</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-[#27272A]" />
          
          <div className="space-y-4">
            {notes.map(note => {
              const typeInfo = getNoteTypeInfo(note.type);
              const Icon = typeInfo.icon;
              
              return (
                <div key={note.id} className="relative pl-10 group">
                  {/* Timeline dot */}
                  <div 
                    className="absolute left-2 top-4 w-4 h-4 rounded-full border-2 border-[#0A0A0A]"
                    style={{ backgroundColor: typeInfo.color }}
                  />
                  
                  <div className="bg-[#121212] border border-[#27272A] rounded-sm p-4 hover:border-[#D4AF37]/40 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon size={14} style={{ color: typeInfo.color }} />
                        <span 
                          className="text-xs font-medium uppercase tracking-wider"
                          style={{ color: typeInfo.color }}
                        >
                          {typeInfo.label}
                        </span>
                        <span className="text-[#52525B] text-xs">
                          {formatDate(note.created_at)}
                        </span>
                      </div>
                      {canCreate() && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(note)} className="p-1 text-[#A1A1AA] hover:text-[#D4AF37]">
                            <Edit size={12} />
                          </button>
                          {canDelete() && (
                            <button onClick={() => handleDelete(note.id)} className="p-1 text-[#A1A1AA] hover:text-[#EF4444]">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <h4 className="text-white font-medium mb-2">{note.title}</h4>
                    <p className="text-[#A1A1AA] text-sm whitespace-pre-wrap">{note.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
