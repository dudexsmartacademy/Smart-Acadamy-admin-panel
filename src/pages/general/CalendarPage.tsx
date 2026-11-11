import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Clock,
  MapPin,
  Tag,
  ArrowUpRight,
  Layers,
  GraduationCap,
  BookOpen,
  Briefcase,
  AlertTriangle,
  Sun,
  List,
  Grid,
} from 'lucide-react';
import { CalendarEvent } from '../../types';
import { calendarService } from '../../services/calendarService';
import { useToast } from '../../context/ToastContext';

type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';

export const CalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [events, setEvents] = useState<CalendarEvent[]>(() => calendarService.getCalendarEvents());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    calendarService.fetchCalendarEvents().then((evs) => {
      if (evs) setEvents([...evs]);
    });
    const handleUpdate = () => {
      setEvents([...calendarService.getCalendarEvents()]);
    };
    window.addEventListener('dudex_calendar_events_changed', handleUpdate);
    return () => {
      window.removeEventListener('dudex_calendar_events_changed', handleUpdate);
    };
  }, []);

  // New Event Form state
  const [formData, setFormData] = useState({
    title: '',
    type: 'Class' as CalendarEvent['type'],
    startDate: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    location: '',
    courseName: '',
    batchName: '',
    description: '',
    targetLink: '',
  });

  const handleOpenCreate = () => {
    setFormData({
      title: '',
      type: 'Class',
      startDate: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      location: '',
      courseName: '',
      batchName: '',
      description: '',
      targetLink: '',
    });
    setIsCreateOpen(true);
  };

  const eventTypes: CalendarEvent['type'][] = [
    'Class',
    'Exam',
    'Assignment',
    'Teacher Leave',
    'Student Event',
    'Announcement',
    'Deadline',
    'Academic Event',
    'Holiday',
  ];

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (selectedType === 'all') return true;
      return e.type === selectedType;
    });
  }, [events, selectedType]);

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Please provide an event title', 'error');
      return;
    }

    const created = await calendarService.createCalendarEvent({
      title: formData.title,
      type: formData.type,
      startDate: formData.startDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      location: formData.location,
      courseName: formData.courseName || undefined,
      batchName: formData.batchName || undefined,
      description: formData.description || undefined,
      targetLink: formData.targetLink || undefined,
    });

    setEvents(calendarService.getCalendarEvents());
    setIsCreateOpen(false);
    showToast(`Event "${created.title}" scheduled successfully`, 'success');
  };

  const getEventBadgeClass = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'Class':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Exam':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Assignment':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Teacher Leave':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Holiday':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Academic Event':
        return 'bg-dudex-gold/10 text-dudex-gold border-dudex-gold/20';
      default:
        return 'bg-neutral-800 text-neutral-300 border-white/10';
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleNavigateToTarget = (event: CalendarEvent) => {
    if (event.targetLink) {
      navigate(event.targetLink);
      return;
    }
    // Fallback default routing based on event type
    switch (event.type) {
      case 'Class':
        navigate('/admin/classes');
        break;
      case 'Exam':
        navigate('/admin/students/exams');
        break;
      case 'Assignment':
        navigate('/admin/students/assignments');
        break;
      case 'Teacher Leave':
        navigate('/admin/teachers/leave');
        break;
      case 'Announcement':
        navigate('/admin/announcements');
        break;
      default:
        break;
    }
  };

  // Generate calendar days for month view
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Padding from previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: null, isCurrentMonth: false, dateStr: '' });
    }
    // Days in current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const monthFormatted = String(month + 1).padStart(2, '0');
      const dayFormatted = String(d).padStart(2, '0');
      const dateStr = `${year}-${monthFormatted}-${dayFormatted}`;
      days.push({ dayNumber: d, isCurrentMonth: true, dateStr });
    }
    return days;
  }, [currentDate]);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-dudex-gold/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-dudex-gold/10 border border-dudex-gold/20 text-dudex-gold">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                Institutional Master Calendar
              </h1>
              <p className="text-sm text-neutral-400 mt-0.5">
                Centralized timetable for lectures, exams, assignment deadlines, faculty leaves, and holidays.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-neutral-900 border border-white/10">
            {(['month', 'week', 'day', 'agenda'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  viewMode === mode
                    ? 'bg-dudex-gold text-black shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-dudex-gold to-amber-600 hover:from-dudex-gold/90 text-black font-semibold text-xs shadow-lg shadow-dudex-gold/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Schedule Event
          </button>
        </div>
      </div>

      {/* Filter and Date Navigation Controls */}
      <div className="p-4 rounded-2xl bg-neutral-900/80 border border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 border border-white/5"
          >
            Today
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-lg font-bold text-white tracking-wide ml-2">{monthName}</h2>
        </div>

        {/* Event Type Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-neutral-400" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full md:w-auto px-3 py-1.5 rounded-xl bg-neutral-950 border border-white/10 text-neutral-300 text-xs focus:outline-none focus:border-dudex-gold"
          >
            <option value="all">All Event Types ({events.length})</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Calendar View */}
      {viewMode === 'month' ? (
        <div className="rounded-2xl bg-neutral-900/60 border border-white/5 p-4 shadow-xl overflow-x-auto">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 min-w-[700px] mb-2 text-center text-xs font-bold text-neutral-400 uppercase tracking-wider">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 gap-2 min-w-[700px]">
            {monthDays.map((cell, index) => {
              const dayEvents = cell.isCurrentMonth
                ? filteredEvents.filter((e) => e.startDate === cell.dateStr)
                : [];
              const isToday = cell.dateStr === todayStr;

              return (
                <div
                  key={index}
                  className={`min-h-[110px] p-2 rounded-xl border flex flex-col justify-between transition-all ${
                    cell.isCurrentMonth
                      ? isToday
                        ? 'bg-dudex-gold/5 border-dudex-gold/40'
                        : 'bg-neutral-950/60 border-white/5 hover:border-white/20'
                      : 'bg-neutral-950/20 border-transparent opacity-30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                        isToday
                          ? 'bg-dudex-gold text-black font-extrabold'
                          : 'text-neutral-400'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-bold text-dudex-gold">
                        {dayEvents.length} ev
                      </span>
                    )}
                  </div>

                  {/* Events in Day */}
                  <div className="space-y-1 my-1 overflow-y-auto max-h-[80px]">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => handleEventClick(ev)}
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded border truncate cursor-pointer transition-all hover:scale-[1.02] ${getEventBadgeClass(
                          ev.type
                        )}`}
                      >
                        {ev.startTime && <span className="opacity-75 mr-1">{ev.startTime}</span>}
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <button
                        onClick={() => setViewMode('agenda')}
                        className="text-[10px] text-neutral-400 hover:text-white font-semibold pl-1"
                      >
                        +{dayEvents.length - 2} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Agenda / Simplified Responsive List View */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <List className="w-4 h-4 text-dudex-gold" />
              Scheduled Agenda & Deadlines
            </h3>

            {filteredEvents.length === 0 ? (
              <div className="p-12 text-center text-neutral-500">
                No events found for this filter.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => handleEventClick(ev)}
                    className="p-4 rounded-2xl bg-neutral-950 border border-white/5 hover:border-dudex-gold/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group shadow-lg"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-xl border text-center min-w-[70px] ${getEventBadgeClass(
                          ev.type
                        )}`}
                      >
                        <span className="text-[10px] font-bold block uppercase tracking-wider">
                          {ev.type}
                        </span>
                        <span className="text-sm font-extrabold mt-0.5 block">
                          {ev.startDate.split('-').slice(1).join('/')}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-dudex-gold transition-colors">
                          {ev.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 mt-1">
                          {ev.startTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-neutral-500" />
                              {ev.startTime} {ev.endTime ? `- ${ev.endTime}` : ''}
                            </span>
                          )}
                          {ev.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                              {ev.location}
                            </span>
                          )}
                          {ev.courseName && (
                            <span className="text-dudex-gold font-medium">
                              • {ev.courseName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateToTarget(ev);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 w-fit"
                    >
                      Open Details <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-gradient-to-b from-neutral-900 to-neutral-950 border border-dudex-gold/30 rounded-3xl p-6 lg:p-8 shadow-2xl relative">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-6 right-6 text-neutral-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-3">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getEventBadgeClass(
                  selectedEvent.type
                )}`}
              >
                {selectedEvent.type}
              </span>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">{selectedEvent.title}</h2>
            {selectedEvent.description && (
              <p className="text-xs text-neutral-300 leading-relaxed mb-6 bg-neutral-950 p-3.5 rounded-xl border border-white/5">
                {selectedEvent.description}
              </p>
            )}

            <div className="space-y-2 text-xs text-neutral-400 mb-6">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-dudex-gold" />
                <span>Date: <strong className="text-white">{selectedEvent.startDate}</strong></span>
              </div>
              {selectedEvent.startTime && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-dudex-gold" />
                  <span>Time: <strong className="text-white">{selectedEvent.startTime} - {selectedEvent.endTime}</strong></span>
                </div>
              )}
              {selectedEvent.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-dudex-gold" />
                  <span>Location: <strong className="text-white">{selectedEvent.location}</strong></span>
                </div>
              )}
              {selectedEvent.courseName && (
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-dudex-gold" />
                  <span>Course: <strong className="text-white">{selectedEvent.courseName}</strong></span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <button
                onClick={() => {
                  calendarService.deleteCalendarEvent(selectedEvent.id);
                  setEvents(calendarService.getCalendarEvents());
                  setSelectedEvent(null);
                  showToast('Event removed from calendar', 'info');
                }}
                className="text-xs text-rose-400 hover:underline font-semibold"
              >
                Remove Event
              </button>

              <button
                onClick={() => {
                  const ev = selectedEvent;
                  setSelectedEvent(null);
                  handleNavigateToTarget(ev);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-dudex-gold text-black text-xs font-bold hover:bg-dudex-gold/90 transition-all shadow-lg"
              >
                Go to Associated Module <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Event Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-gradient-to-b from-neutral-900 to-neutral-950 border border-dudex-gold/30 rounded-3xl p-6 lg:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-6 right-6 text-neutral-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Schedule New Calendar Event</h2>
            <p className="text-xs text-neutral-400 mb-6">
              Create an academic milestone, test, lecture block, or holiday notice.
            </p>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1 font-medium">Event Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Masterclass: Distributed Raft Clusters"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-dudex-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">Event Category</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-dudex-gold"
                  >
                    {eventTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-dudex-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">Start Time</label>
                  <input
                    type="text"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    placeholder="10:00 AM"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-dudex-gold"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">End Time</label>
                  <input
                    type="text"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    placeholder="11:30 AM"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-dudex-gold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-medium">Location / Room</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Room 204, Lab 3, Auditorium, Online"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-dudex-gold"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-medium">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed agenda or notes..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-dudex-gold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-dudex-gold to-amber-600 hover:from-dudex-gold/90 text-black font-semibold shadow-lg shadow-dudex-gold/20"
                >
                  Schedule Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
