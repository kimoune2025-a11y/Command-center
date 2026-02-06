import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { documentsAPI, projectsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Search, FileText, Upload, File, Folder, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const categoryOptions = [
  'General', 'Contracts', 'Proposals', 'Reports', 'Presentations', 
  'Designs', 'Legal', 'Marketing', 'Finance', 'Other'
];

export default function DocumentsPage() {
  const { canCreate, canDelete } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'General',
    project_id: '',
    file: null
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [docsRes, projectsRes] = await Promise.all([
        documentsAPI.getAll(),
        projectsAPI.getAll()
      ]);
      setDocuments(docsRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.file) {
      toast.error('Please select a file');
      return;
    }
    
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', formData.file);
      fd.append('title', formData.title);
      fd.append('category', formData.category);
      if (formData.project_id) {
        fd.append('project_id', formData.project_id);
      }
      
      await documentsAPI.upload(fd);
      toast.success('Document uploaded');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await documentsAPI.delete(id);
      toast.success('Document deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category: 'General',
      project_id: '',
      file: null
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({
        ...formData,
        file,
        title: formData.title || file.name.replace(/\.[^/.]+$/, '')
      });
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase()) ||
                         doc.filename.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    const matchesProject = projectFilter === 'all' || doc.project_id === projectFilter;
    return matchesSearch && matchesCategory && matchesProject;
  });

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || '-';
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const iconClass = "text-[#D4AF37]";
    return <File size={20} className={iconClass} />;
  };

  // Group by category for stats
  const categoryStats = categoryOptions.map(cat => ({
    name: cat,
    count: documents.filter(d => d.category === cat).length
  })).filter(c => c.count > 0);

  return (
    <div className="space-y-6" data-testid="documents-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-rajdhani font-bold tracking-wider text-white">DOCUMENTS</h1>
          <p className="text-[#A1A1AA] text-sm mt-1">{documents.length} files uploaded</p>
        </div>
        {canCreate() && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="upload-document-btn" className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm">
                <Upload size={16} className="mr-2" />
                Upload File
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="font-rajdhani text-xl tracking-wider">UPLOAD DOCUMENT</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">File</Label>
                  <div 
                    className="border-2 border-dashed border-[#27272A] rounded-sm p-6 text-center cursor-pointer hover:border-[#D4AF37]/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      data-testid="document-file-input"
                    />
                    {formData.file ? (
                      <div className="flex items-center justify-center gap-2">
                        <File size={20} className="text-[#D4AF37]" />
                        <span className="text-white">{formData.file.name}</span>
                        <span className="text-[#52525B] text-xs">({formatFileSize(formData.file.size)})</span>
                      </div>
                    ) : (
                      <div>
                        <Upload size={32} className="mx-auto text-[#52525B] mb-2" />
                        <p className="text-[#A1A1AA] text-sm">Click to select a file</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Title</Label>
                  <Input
                    data-testid="document-title-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger data-testid="document-category-select" className="bg-[#121212] border-[#27272A] text-white rounded-sm">
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
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Project</Label>
                    <Select value={formData.project_id} onValueChange={(v) => setFormData({ ...formData, project_id: v })}>
                      <SelectTrigger data-testid="document-project-select" className="bg-[#121212] border-[#27272A] text-white rounded-sm">
                        <SelectValue placeholder="No project" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A0A0A] border-[#27272A]">
                        <SelectItem value="" className="text-white hover:bg-[#121212]">No project</SelectItem>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-white hover:bg-[#121212]">
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  data-testid="document-submit-btn" 
                  disabled={uploading}
                  className="w-full bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm"
                >
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Uploading...
                    </span>
                  ) : (
                    'Upload Document'
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Category Stats */}
      {categoryStats.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categoryStats.map(cat => (
            <button
              key={cat.name}
              onClick={() => setCategoryFilter(categoryFilter === cat.name ? 'all' : cat.name)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
                categoryFilter === cat.name
                  ? 'bg-[#D4AF37] text-black'
                  : 'bg-[#121212] text-[#A1A1AA] hover:text-white border border-[#27272A]'
              }`}
            >
              <Folder size={12} />
              <span>{cat.name}</span>
              <span className="px-1.5 py-0.5 bg-black/20 rounded-sm">{cat.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]" />
          <Input
            data-testid="document-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="pl-9 bg-[#121212] border-[#27272A] text-white placeholder:text-[#52525B] focus:border-[#D4AF37] rounded-sm"
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger data-testid="document-filter-project" className="w-full sm:w-48 bg-[#121212] border-[#27272A] text-white rounded-sm">
            <SelectValue placeholder="All Projects" />
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

      {/* Documents Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-32 bg-[#0A0A0A] rounded-sm border border-[#27272A] animate-pulse" />
          ))}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={48} className="mx-auto text-[#27272A] mb-4" />
          <p className="text-[#52525B]">No documents found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocuments.map(doc => (
            <div
              key={doc.id}
              data-testid={`document-card-${doc.id}`}
              className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4 hover:border-[#D4AF37]/40 transition-colors duration-300 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-[#121212] rounded-sm">
                  {getFileIcon(doc.filename)}
                </div>
                {canDelete() && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    data-testid={`delete-document-${doc.id}`}
                    className="p-1.5 text-[#A1A1AA] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <h3 className="font-medium text-white mb-1 truncate" title={doc.title}>{doc.title}</h3>
              <p className="text-[#52525B] text-xs truncate mb-2">{doc.filename}</p>
              <div className="flex items-center justify-between text-xs text-[#52525B]">
                <span className="px-2 py-0.5 bg-[#121212] rounded-sm">{doc.category}</span>
                <span>{formatFileSize(doc.file_size)}</span>
              </div>
              {doc.project_id && (
                <p className="mt-2 pt-2 border-t border-[#27272A] text-xs text-[#A1A1AA] truncate">
                  <Folder size={10} className="inline mr-1" />
                  {getProjectName(doc.project_id)}
                </p>
              )}
              <p className="text-[#52525B] text-xs mt-2">{formatDate(doc.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
