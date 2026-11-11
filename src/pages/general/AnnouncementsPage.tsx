import React, { useState, useMemo, useEffect } from 'react';
import { BatchChecklist } from '../../components/common/BatchChecklist';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Users,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { Announcement } from '../../types';
import { announcementService } from '../../services/announcementService';
import { academicCourseService } from '../../services/academicCourseService';
import { academicBatchService } from '../../services/academicBatchService';
import { teacherService } from '../../services/teacherService';
import { studentService } from '../../services/studentService';
import { useToast } from '../../context/ToastContext';

export const AnnouncementsPage: React.FC = () => {
  const { showToast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [audienceFilter, setAudienceFilter] = useState<string>('all');

  // Modal / Workflow state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [previewStep, setPreviewStep] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  // Entities for dynamic audience dropdowns
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    audience: 'All Users' as Announcement['audience'],
    priority: 'Normal' as Announcement['priority'],
    courseId: '',
    courseName: '',
    batchId: '',
    batchName: '',
    section: '',
    publishDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Published' as Announcement['status'],
    author: 'Administrator',
  });

  useEffect(() => {
    loadData();
    // Load reference datasets for dynamic audience form
    const c = academicCourseService.getCourses();
    setCourses(c.map((x) => ({ id: x.id, name: x.name })));
    const b = academicBatchService.getBatches();
    setBatches(b.map((x) => ({ id: x.id, name: x.name })));
    const t = teacherService.getTeachers();
    setTeachers(t.map((x) => ({ id: x.id, name: x.fullName })));
    const s = studentService.getStudents();
    setStudents(s.map((x) => ({ id: x.id, name: x.fullName })));

    const handleChanged = () => {
      setAnnouncements(announcementService.getAnnouncements());
    };
    window.addEventListener('dudex_announcements_changed', handleChanged);
    return () => {
      window.removeEventListener('dudex_announcements_changed', handleChanged);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const live = await announcementService.fetchAnnouncements();
      setAnnouncements(live);
    } catch {
      setAnnouncements(announcementService.getAnnouncements());
    } finally {
      setLoading(false);
    }
  };

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((a) => {
      const matchesSearch =
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = priorityFilter === 'all' || a.priority === priorityFilter;
      const matchesAudience = audienceFilter === 'all' || a.audience === audienceFilter;
      return matchesSearch && matchesPriority && matchesAudience;
    });
  }, [announcements, searchQuery, priorityFilter, audienceFilter]);

  const stats = useMemo(() => {
    const total = announcements.length;
    const highPriority = announcements.filter((a) => a.priority === 'High').length;
    const totalViews = announcements.reduce((sum, a) => sum + a.viewsCount, 0);
    return { total, highPriority, totalViews };
  }, [announcements]);

  const [targetBatches, setTargetBatches] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);

  const handleOpenComposer = () => {
    setPreviewStep(false);
    setTargetBatches([]);
    setFormData({
      title: '',
      content: '',
      audience: 'All Users',
      priority: 'Normal',
      courseId: '',
      courseName: '',
      batchId: '',
      batchName: '',
      section: '',
      publishDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Published',
      author: 'Administrator',
    });
    setIsComposerOpen(true);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      showToast('Title and content are required', 'error');
      return;
    }
    if (formData.audience === 'Specific Batch' && targetBatches.length === 0) {
      showToast('Select at least one batch', 'error');
      return;
    }

    let finalCourseName = formData.courseName;
    if (formData.courseId && !finalCourseName) {
      const found = courses.find((c) => c.id === formData.courseId);
      if (found) finalCourseName = found.name;
    }

    setPublishing(true);
    try {
      await announcementService.createAnnouncement({
        title: formData.title,
        content: formData.content,
        audience: formData.audience,
        priority: formData.priority,
        publishDate: formData.publishDate,
        expiryDate: formData.expiryDate,
        status: formData.status,
        author: formData.author,
        courseId: formData.courseId || undefined,
        courseName: finalCourseName || undefined,
        batchName: formData.audience === 'Specific Batch' ? targetBatches.join(', ') : undefined,
        batches: formData.audience === 'Specific Batch' ? targetBatches : [],
        section: formData.section || undefined,
      });
      setIsComposerOpen(false);
      setPreviewStep(false);
      loadData();
      showToast('Announcement published and notifications sent', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not publish the announcement', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete announcement "${title}"?`)) return;
    try {
      await announcementService.deleteAnnouncement(id);
      loadData();
      showToast('Announcement deleted', 'info');
      if (selectedAnnouncement?.id === id) {
        setSelectedAnnouncement(null);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete the announcement', 'error');
    }
  };

  const getPriorityBadge = (priority: Announcement['priority']) => {
    switch (priority) {
      case 'High':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" /> High Priority
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Low Priority
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Normal Priority
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-dudex-gold/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-dudex-gold/10 border border-dudex-gold/20 text-dudex-gold">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                Announcement Management
              </h1>
              <p className="text-sm text-neutral-400 mt-0.5">
                Broadcast official circulars, timetables, and academic bulletins to target cohorts.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenComposer}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-dudex-gold to-amber-600 hover:from-dudex-gold/90 text-black font-semibold text-sm transition-all shadow-lg shadow-dudex-gold/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Create Announcement
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 border border-white/5 shadow-xl">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Total Bulletins</p>
          <h3 className="text-2xl lg:text-3xl font-extrabold text-white mt-2">{stats.total}</h3>
          <p className="text-xs text-neutral-500 mt-1">Active published notices</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 border border-white/5 shadow-xl">
          <p className="text-xs font-medium text-rose-400 uppercase tracking-wider">High Priority</p>
          <h3 className="text-2xl lg:text-3xl font-extrabold text-rose-400 mt-2">{stats.highPriority}</h3>
          <p className="text-xs text-neutral-500 mt-1">Requires immediate student action</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 border border-white/5 shadow-xl">
          <p className="text-xs font-medium text-dudex-gold uppercase tracking-wider">Total Views</p>
          <h3 className="text-2xl lg:text-3xl font-extrabold text-dudex-gold mt-2">{stats.totalViews}</h3>
          <p className="text-xs text-neutral-500 mt-1">Accumulated portal readership</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xl backdrop-blur-md">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search announcement titles or content..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-950 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-dudex-gold/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-400" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-neutral-300 text-sm focus:outline-none focus:border-dudex-gold/50"
            >
              <option value="all">All Priorities</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <select
            value={audienceFilter}
            onChange={(e) => setAudienceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-neutral-950 border border-white/10 text-neutral-300 text-sm focus:outline-none focus:border-dudex-gold/50"
          >
            <option value="all">All Audiences</option>
            <option value="All Users">All Users</option>
            <option value="Teachers Only">Teachers Only</option>
            <option value="Students Only">Students Only</option>
            <option value="Specific Course">Specific Course</option>
            <option value="Specific Batch">Specific Batch</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="p-16 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-dudex-gold mb-3"></div>
          <p className="text-sm text-neutral-400">Loading announcements...</p>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-neutral-900/40 border border-white/5">
          <Megaphone className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No announcements found</h3>
          <p className="text-sm text-neutral-400 mt-1">Create a new broadcast notice to inform users.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className="p-6 rounded-2xl bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 border border-white/5 hover:border-dudex-gold/30 transition-all shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 group"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  {getPriorityBadge(ann.priority)}
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-800 text-dudex-gold border border-white/5">
                    <Users className="w-3 h-3" /> {ann.audience}
                    {ann.batchName && ` (${ann.batchName})`}
                    {ann.courseName && ` (${ann.courseName})`}
                  </span>
                  <span className="text-xs text-neutral-500">
                    Published: {ann.publishDate}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-dudex-gold transition-colors">
                  {ann.title}
                </h3>
                <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                  {ann.content}
                </p>

                <div className="flex items-center gap-4 text-[11px] text-neutral-500 pt-1">
                  <span>Author: <strong className="text-neutral-300">{ann.author}</strong></span>
                  <span>•</span>
                  <span>Expires: {ann.expiryDate}</span>
                  <span>•</span>
                  <span>Views: <strong className="text-dudex-gold">{ann.viewsCount}</strong></span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end md:self-center">
                <button
                  onClick={() => setSelectedAnnouncement(ann)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition-all"
                >
                  <Eye className="w-3.5 h-3.5" /> Read Full
                </button>
                <button
                  onClick={() => handleDelete(ann.id, ann.title)}
                  className="p-2 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-white/5 transition-all"
                  title="Delete Announcement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Read Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-dudex-gold/30 rounded-3xl p-6 lg:p-8 shadow-2xl relative">
            <button
              onClick={() => setSelectedAnnouncement(null)}
              className="absolute top-6 right-6 text-neutral-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              {getPriorityBadge(selectedAnnouncement.priority)}
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-800 text-dudex-gold">
                {selectedAnnouncement.audience}
              </span>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">{selectedAnnouncement.title}</h2>
            <div className="text-xs text-neutral-400 mb-6 flex items-center gap-3">
              <span>By {selectedAnnouncement.author}</span>
              <span>•</span>
              <span>{selectedAnnouncement.publishDate}</span>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-950 border border-white/5 text-sm text-neutral-200 leading-relaxed max-h-[300px] overflow-y-auto mb-6">
              {selectedAnnouncement.content}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-neutral-400">
              <span>Expiry: {selectedAnnouncement.expiryDate}</span>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 text-white font-semibold hover:bg-neutral-700"
              >
                Close Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Step Announcement Composer Modal (Workflow) */}
      {isComposerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-dudex-gold/30 rounded-3xl p-6 lg:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsComposerOpen(false)}
              className="absolute top-6 right-6 text-neutral-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-dudex-gold mb-1">
              <Megaphone className="w-4 h-4" />
              {previewStep ? 'Step 2: Preview & Dispatch' : 'Step 1: Compose Announcement'}
            </div>
            <h2 className="text-xl font-bold text-white mb-4">
              {previewStep ? 'Confirm Broadcast Preview' : 'New Institutional Circular'}
            </h2>

            {!previewStep ? (
              /* Composer Step 1 */
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!formData.title || !formData.content) {
                    showToast('Title and content are required', 'error');
                    return;
                  }
                  setPreviewStep(true);
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">Notice Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Schedule of Term Examination 2026"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-dudex-gold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-400 mb-1 font-medium">Target Audience *</label>
                    <select
                      value={formData.audience}
                      onChange={(e) => setFormData({ ...formData, audience: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-dudex-gold"
                    >
                      <option value="All Users">All Users (Students + Faculty)</option>
                      <option value="Teachers Only">Teachers Only</option>
                      <option value="Students Only">Students Only</option>
                      <option value="Specific Course">Specific Course</option>
                      <option value="Specific Batch">Specific Batch</option>
                      <option value="Specific Section">Specific Section</option>
                      <option value="Specific Teacher">Specific Teacher</option>
                      <option value="Specific Student">Specific Student</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1 font-medium">Priority Level</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-dudex-gold"
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High (Immediate Alert)</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                {/* Dynamic Audience Sub-Selectors */}
                {formData.audience === 'Specific Course' && (
                  <div>
                    <label className="block text-neutral-400 mb-1 font-medium">Select Target Course</label>
                    <select
                      value={formData.courseId}
                      onChange={(e) => {
                        const c = courses.find((x) => x.id === e.target.value);
                        setFormData({ ...formData, courseId: e.target.value, courseName: c?.name || '' });
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-dudex-gold"
                    >
                      <option value="">Select Course...</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.audience === 'Specific Batch' && (
                  <div>
                    <label className="block text-neutral-400 mb-1 font-medium">Select Target Batches</label>
                    <BatchChecklist values={targetBatches} onChange={setTargetBatches} />
                  </div>
                )}

                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">Message Body *</label>
                  <textarea
                    rows={4}
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Enter complete circular text..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-dudex-gold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-neutral-400 mb-1 font-medium">Publish Date</label>
                    <input
                      type="date"
                      value={formData.publishDate}
                      onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-dudex-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1 font-medium">Expiry Date</label>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-white/10 text-white focus:outline-none focus:border-dudex-gold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsComposerOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-dudex-gold to-amber-600 hover:from-dudex-gold/90 text-black font-semibold shadow-lg shadow-dudex-gold/20"
                  >
                    Preview Broadcast <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              /* Preview Step 2 */
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-neutral-950 border border-dudex-gold/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-dudex-gold">
                      Live Portal Preview
                    </span>
                    {getPriorityBadge(formData.priority)}
                  </div>
                  <h3 className="text-base font-bold text-white">{formData.title}</h3>
                  <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap">
                    {formData.content}
                  </p>
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-500">
                    <span>Target: <strong className="text-neutral-300">{formData.audience}</strong></span>
                    <span>Valid: {formData.publishDate} to {formData.expiryDate}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-blue-400" />
                  <span>
                    Publishing will store in database, trigger direct notifications to mock accounts, and log audit trail.
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setPreviewStep(false)}
                    className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold"
                  >
                    Back to Edit
                  </button>
                  <button
                    type="button"
                    onClick={handlePublish}
                    disabled={publishing}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 text-black font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                    {publishing ? 'Publishing…' : 'Publish & Notify Now'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
