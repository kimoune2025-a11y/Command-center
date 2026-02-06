import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { eventsAPI, projectsAPI } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Calendar } from '../components/ui/calendar';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Calendar as CalendarIcon, MapPin, CheckCircle, Circle, Clock } from 'lucide-react';
import { format, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';

const statusOptions = [
  { value: 'upcoming', label: 'Upcoming', color: 'bg-[#D4AF37]' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-[#3B82F6]' },
  { value: 'completed', label: 'Completed', color: 'bg-[#10B981]' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-[#EF4444]' }
];

export default function EventsPage() {
  const { canCreate, canDelete } = useAuth();
  const [events, setEvents] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [checklistInput, setChecklistInput] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    location: '',
    checklist: [],
    project_id: '',
    status: 'upcoming'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [eventsRes, projectsRes] = await Promise.all([
        eventsAPI.getAll(),
        projectsAPI.getAll()
      ]);
      setEvents(eventsRes.data);
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
      if (!data.end_date) data.end_date = null;
      
      if (editingEvent) {
        await eventsAPI.update(editingEvent.id, data);
        toast.success('Event updated');
      } else {
        await eventsAPI.create(data);
        toast.success('Event created');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      date: event.date.split('T')[0],
      end_date: event.end_date?.split('T')[0] || '',
      location: event.location,
      checklist: event.checklist || [],
      project_id: event.project_id || '',
      status: event.status
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await eventsAPI.delete(id);
      toast.success('Event deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete event');
    }
  };

  const resetForm = () => {
    setEditingEvent(null);
    setChecklistInput('');
    setFormData({
      title: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      location: '',
      checklist: [],
      project_id: '',
      status: 'upcoming'
    });
  };

  const addChecklistItem = () => {
    if (checklistInput.trim()) {
      setFormData({
        ...formData,
        checklist: [...formData.checklist, checklistInput.trim()]
      });
      setChecklistInput('');
    }
  };

  const removeChecklistItem = (index) => {
    setFormData({
      ...formData,
      checklist: formData.checklist.filter((_, i) => i !== index)
    });
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      try {
        const eventDate = parseISO(event.date);
        return isSameDay(eventDate, date);
      } catch {
        return false;
      }
    });
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      return format(parseISO(dateString), 'h:mm a');
    } catch {
      return '';
    }
  };

  const getStatusBadge = (status) => {
    const opt = statusOptions.find(o => o.value === status);
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium uppercase tracking-wider ${opt?.color} text-white`}>
        {opt?.label}
      </span>
    );
  };

  // Custom day renderer to show event indicators
  const modifiers = {
    hasEvent: (date) => events.some(event => {
      try {
        return isSameDay(parseISO(event.date), date);
      } catch {
        return false;
      }
    })
  };

  const modifiersStyles = {
    hasEvent: {
      position: 'relative'
    }
  };

  return (
    <div className="space-y-6" data-testid="events-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-rajdhani font-bold tracking-wider text-white">EVENTS</h1>
          <p className="text-[#A1A1AA] text-sm mt-1">{events.length} total events</p>
        </div>
        {canCreate() && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="create-event-btn" className="bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm">
                <Plus size={16} className="mr-2" />
                New Event
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0A0A0A] border-[#27272A] text-white max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-rajdhani text-xl tracking-wider">
                  {editingEvent ? 'EDIT EVENT' : 'NEW EVENT'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Title</Label>
                  <Input
                    data-testid="event-title-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Description</Label>
                  <Textarea
                    data-testid="event-description-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm min-h-[60px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Start Date</Label>
                    <Input
                      type="date"
                      data-testid="event-date-input"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">End Date</Label>
                    <Input
                      type="date"
                      data-testid="event-end-date-input"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Location</Label>
                    <Input
                      data-testid="event-location-input"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger data-testid="event-status-select" className="bg-[#121212] border-[#27272A] text-white rounded-sm">
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
                    <SelectTrigger data-testid="event-project-select" className="bg-[#121212] border-[#27272A] text-white rounded-sm">
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
                <div className="space-y-2">
                  <Label className="text-[#A1A1AA] text-xs uppercase tracking-wider">Checklist</Label>
                  <div className="flex gap-2">
                    <Input
                      data-testid="event-checklist-input"
                      value={checklistInput}
                      onChange={(e) => setChecklistInput(e.target.value)}
                      placeholder="Add checklist item"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                      className="bg-[#121212] border-[#27272A] text-white focus:border-[#D4AF37] rounded-sm"
                    />
                    <Button type="button" onClick={addChecklistItem} className="bg-[#121212] border border-[#27272A] text-white hover:border-[#D4AF37] rounded-sm px-3">
                      <Plus size={16} />
                    </Button>
                  </div>
                  {formData.checklist.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {formData.checklist.map((item, index) => (
                        <div key={index} className="flex items-center justify-between px-2 py-1 bg-[#121212] rounded-sm">
                          <span className="text-sm text-white">{item}</span>
                          <button type="button" onClick={() => removeChecklistItem(index)} className="text-[#EF4444] hover:text-white">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Button type="submit" data-testid="event-submit-btn" className="w-full bg-[#D4AF37] text-black font-bold uppercase tracking-wider hover:bg-[#B5952F] rounded-sm">
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Calendar and Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="events-calendar">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-sm"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4 w-full",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-lg font-rajdhani font-bold tracking-wider",
              nav: "space-x-1 flex items-center",
              nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-[#A1A1AA] rounded-md w-9 font-normal text-[0.8rem] flex-1 text-center",
              row: "flex w-full mt-2",
              cell: "h-9 w-9 text-center text-sm p-0 relative flex-1 focus-within:relative focus-within:z-20",
              day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-[#D4AF37]/20 rounded-sm mx-auto flex items-center justify-center",
              day_range_end: "day-range-end",
              day_selected: "bg-[#D4AF37] text-black hover:bg-[#B5952F] hover:text-black focus:bg-[#D4AF37] focus:text-black",
              day_today: "border border-[#D4AF37] text-[#D4AF37]",
              day_outside: "text-[#52525B] opacity-50",
              day_disabled: "text-[#52525B] opacity-50",
              day_hidden: "invisible",
            }}
            components={{
              DayContent: ({ date }) => {
                const hasEvents = events.some(event => {
                  try {
                    return isSameDay(parseISO(event.date), date);
                  } catch {
                    return false;
                  }
                });
                return (
                  <div className="relative w-full h-full flex items-center justify-center">
                    {date.getDate()}
                    {hasEvents && (
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#D4AF37] rounded-full" />
                    )}
                  </div>
                );
              }
            }}
          />
        </div>

        {/* Selected Date Events */}
        <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="selected-date-events">
          <h3 className="text-lg font-rajdhani font-bold tracking-wider text-white mb-4">
            {format(selectedDate, 'MMMM d, yyyy')}
          </h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-[#121212] rounded-sm animate-pulse" />
              ))}
            </div>
          ) : selectedDateEvents.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon size={32} className="mx-auto text-[#27272A] mb-2" />
              <p className="text-[#52525B] text-sm">No events on this day</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateEvents.map(event => (
                <div
                  key={event.id}
                  data-testid={`event-card-${event.id}`}
                  className="bg-[#121212] border border-[#27272A] rounded-sm p-3 hover:border-[#D4AF37]/40 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-2">
                    {getStatusBadge(event.status)}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canCreate() && (
                        <button
                          onClick={() => handleEdit(event)}
                          data-testid={`edit-event-${event.id}`}
                          className="p-1 text-[#A1A1AA] hover:text-[#D4AF37]"
                        >
                          <Edit size={12} />
                        </button>
                      )}
                      {canDelete() && (
                        <button
                          onClick={() => handleDelete(event.id)}
                          data-testid={`delete-event-${event.id}`}
                          className="p-1 text-[#A1A1AA] hover:text-[#EF4444]"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <h4 className="font-medium text-white mb-1">{event.title}</h4>
                  {event.location && (
                    <p className="flex items-center gap-1 text-[#52525B] text-xs mb-2">
                      <MapPin size={12} />
                      {event.location}
                    </p>
                  )}
                  {event.checklist?.length > 0 && (
                    <div className="space-y-1 mt-2 pt-2 border-t border-[#27272A]">
                      {event.checklist.slice(0, 3).map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-[#A1A1AA]">
                          <Circle size={10} className="text-[#52525B]" />
                          <span className="truncate">{item}</span>
                        </div>
                      ))}
                      {event.checklist.length > 3 && (
                        <p className="text-[#52525B] text-xs">+{event.checklist.length - 3} more items</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All Events List */}
      <div className="bg-[#0A0A0A] border border-[#27272A] rounded-sm p-4" data-testid="all-events-list">
        <h3 className="text-lg font-rajdhani font-bold tracking-wider text-white mb-4">ALL EVENTS</h3>
        {events.length === 0 ? (
          <p className="text-[#52525B] text-center py-8">No events yet</p>
        ) : (
          <div className="space-y-2">
            {events.sort((a, b) => new Date(a.date) - new Date(b.date)).map(event => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 bg-[#121212] rounded-sm hover:bg-[#D4AF37]/5 transition-colors group cursor-pointer"
                onClick={() => setSelectedDate(parseISO(event.date))}
              >
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[50px]">
                    <p className="text-[#D4AF37] font-mono text-lg font-bold">
                      {format(parseISO(event.date), 'd')}
                    </p>
                    <p className="text-[#52525B] text-xs uppercase">
                      {format(parseISO(event.date), 'MMM')}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-white">{event.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-[#52525B]">
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {event.location}
                        </span>
                      )}
                      {event.checklist?.length > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckCircle size={10} />
                          {event.checklist.length} items
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(event.status)}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canCreate() && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(event); }}
                        className="p-1.5 text-[#A1A1AA] hover:text-[#D4AF37]"
                      >
                        <Edit size={14} />
                      </button>
                    )}
                    {canDelete() && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }}
                        className="p-1.5 text-[#A1A1AA] hover:text-[#EF4444]"
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
    </div>
  );
}
