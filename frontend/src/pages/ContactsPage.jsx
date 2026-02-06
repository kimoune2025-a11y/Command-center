import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { contactsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, Users, Mail, Phone, Building, User } from 'lucide-react';

const typeOptions = [
  { value: 'partner', label: 'Partner', color: 'bg-[#D4AF37]' },
  { value: 'sponsor', label: 'Sponsor', color: 'bg-[#10B981]' },
  { value: 'artist', label: 'Artist', color: 'bg-[#8B5CF6]' },
  { value: 'institution', label: 'Institution', color: 'bg-[#3B82F6]' },
  { value: 'investor', label: 'Investor', color: 'bg-[#F59E0B]' }
];

export default function ContactsPage() {
  const { canCreate, canDelete } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    type: 'partner',
    notes: ''
  });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await contactsAPI.getAll();
      setContacts(response.data);
    } catch (error) {
      toast.error('Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingContact) {
        await contactsAPI.update(editingContact.id, formData);
        toast.success('Contact updated');
      } else {
        await contactsAPI.create(formData);
        toast.success('Contact created');
      }
      setDialogOpen(false);
      resetForm();
      fetchContacts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      type: contact.type,
      notes: contact.notes
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await contactsAPI.delete(id);
      toast.success('Contact deleted');
      fetchContacts();
    } catch (error) {
      toast.error('Failed to delete contact');
    }
  };

  const resetForm = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      type: 'partner',
      notes: ''
    });
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(search.toLowerCase()) ||
                         contact.email?.toLowerCase().includes(search.toLowerCase()) ||
                         contact.company?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || contact.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type) => {
    const opt = typeOptions.find(o => o.value === type);
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium uppercase tracking-wider ${opt?.color} text-white`}>
        {opt?.label}
      </span>
    );
  };

  // Count by type
  const typeCounts = typeOptions.map(opt => ({
    ...opt,
    count: contacts.filter(c => c.type === opt.value).length
  }));

  return (
    <div className="space-y-6" data-testid="contacts-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-rajdhani font-bold tracking-wider text-white">CONTACTS CRM</h1>
          <p className="text-[#A1A1AA] text-sm mt-1">{contacts.length} total contacts</p>
        </div>
        {canCreate() && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="create-contact-btn" className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm">
                <Plus size={16} className="mr-2" />
                New Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="font-rajdhani text-xl tracking-wider">
                  {editingContact ? 'EDIT CONTACT' : 'NEW CONTACT'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Name</Label>
                  <Input
                    data-testid="contact-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Email</Label>
                    <Input
                      type="email"
                      data-testid="contact-email-input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Phone</Label>
                    <Input
                      data-testid="contact-phone-input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Company</Label>
                    <Input
                      data-testid="contact-company-input"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Type</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger data-testid="contact-type-select" className="bg-[#121212] border-[#27272A] text-white rounded-sm">
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
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Notes</Label>
                  <Textarea
                    data-testid="contact-notes-input"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm min-h-[80px]"
                  />
                </div>
                <Button type="submit" data-testid="contact-submit-btn" className="w-full bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm">
                  {editingContact ? 'Update Contact' : 'Create Contact'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Type Stats */}
      <div className="flex flex-wrap gap-2">
        {typeCounts.map(type => (
          <button
            key={type.value}
            onClick={() => setTypeFilter(typeFilter === type.value ? 'all' : type.value)}
            data-testid={`filter-${type.value}`}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
              typeFilter === type.value 
                ? `${type.color} text-white` 
                : 'bg-[#121212] text-[#A1A1AA] hover:text-white border border-[#27272A]'
            }`}
          >
            <span>{type.label}</span>
            <span className="px-1.5 py-0.5 bg-black/20 rounded-sm">{type.count}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]" />
        <Input
          data-testid="contact-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts..."
          className="pl-9 bg-[#121212] border-[#27272A] text-white placeholder:text-[#52525B] focus:border-[#D4AF37] rounded-sm"
        />
      </div>

      {/* Contacts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-40 bg-[#0A0A0A] rounded-sm border border-[#27272A] animate-pulse" />
          ))}
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="text-center py-12">
          <Users size={48} className="mx-auto text-[#27272A] mb-4" />
          <p className="text-[#52525B]">No contacts found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map(contact => (
            <div
              key={contact.id}
              data-testid={`contact-card-${contact.id}`}
              className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4 hover:border-[#D4AF37]/40 transition-colors duration-300 group"
            >
              <div className="flex items-start justify-between mb-3">
                {getTypeBadge(contact.type)}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {canCreate() && (
                    <button
                      onClick={() => handleEdit(contact)}
                      data-testid={`edit-contact-${contact.id}`}
                      className="p-1.5 text-[#A1A1AA] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-sm"
                    >
                      <Edit size={14} />
                    </button>
                  )}
                  {canDelete() && (
                    <button
                      onClick={() => handleDelete(contact.id)}
                      data-testid={`delete-contact-${contact.id}`}
                      className="p-1.5 text-[#A1A1AA] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-sm"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#121212] rounded-sm flex items-center justify-center">
                  <User size={20} className="text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="font-medium text-white">{contact.name}</h3>
                  {contact.company && (
                    <p className="text-[#52525B] text-xs">{contact.company}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-[#A1A1AA] hover:text-[#D4AF37] transition-colors">
                    <Mail size={14} />
                    <span className="truncate">{contact.email}</span>
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-[#A1A1AA] hover:text-[#D4AF37] transition-colors">
                    <Phone size={14} />
                    <span>{contact.phone}</span>
                  </a>
                )}
                {contact.company && (
                  <div className="flex items-center gap-2 text-[#52525B]">
                    <Building size={14} />
                    <span>{contact.company}</span>
                  </div>
                )}
              </div>

              {contact.notes && (
                <p className="mt-3 pt-3 border-t border-[#27272A] text-[#52525B] text-xs line-clamp-2">
                  {contact.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
