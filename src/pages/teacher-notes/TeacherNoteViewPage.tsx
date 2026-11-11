import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Loader2,
  Paperclip,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { teacherNoteService, type TeacherNote } from '../../services/teacherNoteService';

const TeacherNoteViewPage: React.FC = () => {
  const params = useParams<{ teacherId?: string; noteId?: string }>();
  const navigate = useNavigate();

  // Support both /teachers/notes/:teacherId/view/:noteId and /teachers/notes/view/:noteId
  const effectiveNoteId = params.noteId || params.teacherId;
  const teacherId = params.noteId ? params.teacherId : undefined;

  const [note, setNote] = useState<TeacherNote | null>(() => (effectiveNoteId ? teacherNoteService.getNoteById(effectiveNoteId) || null : null));
  const [loading, setLoading] = useState<boolean>(!note);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadNoteAndSignedUrls() {
      if (!effectiveNoteId) {
        setLoading(false);
        return;
      }

      // 1. Fetch note if not present or refresh
      let currentNote = note;
      if (!currentNote) {
        setLoading(true);
        currentNote = await teacherNoteService.fetchNoteById(effectiveNoteId);
        if (!currentNote) {
          const allNotes = await teacherNoteService.fetchTeacherNotes();
          currentNote = allNotes.find((n) => n.id === effectiveNoteId) || null;
        }
        if (active) {
          setNote(currentNote);
          setLoading(false);
        }
      }

      // 2. Sign attachment URLs if any
      if (currentNote && currentNote.attachments && currentNote.attachments.length > 0) {
        const urlMap: Record<string, string> = {};
        for (const att of currentNote.attachments) {
          if (att.url) {
            const signed = await teacherNoteService.getSignedUrl(att.url);
            if (signed) {
              urlMap[att.id] = signed;
            }
          }
        }
        if (active) {
          setSignedUrls(urlMap);
        }
      }
    }

    loadNoteAndSignedUrls();

    return () => {
      active = false;
    };
  }, [effectiveNoteId]);

  const handleDownload = async (attachment: { id: string; name: string; url?: string }) => {
    const downloadUrl = signedUrls[attachment.id] || attachment.url;
    if (!downloadUrl) return;

    setDownloadingId(attachment.id);
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = attachment.name || 'note_attachment';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch {
      // Fallback: direct window download
      window.open(downloadUrl, '_blank');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleBack = () => {
    if (teacherId) {
      navigate(`/admin/teachers/notes/${teacherId}`);
    } else if (note?.teacherId) {
      navigate(`/admin/teachers/notes/${note.teacherId}`);
    } else {
      navigate('/admin/teachers/notes');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[#151515] p-8 text-[#F5F0EA]">
        <Loader2 className="h-8 w-8 animate-spin text-[#C07A4D]" />
        <p className="mt-4 text-sm text-[#A89A91]">Loading note details...</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-full bg-[#151515] p-8 text-[#F5F0EA]">
        <h1 className="text-xl font-semibold">Note not found</h1>
        <p className="mt-2 text-sm text-[#A89A91]">The requested teacher note could not be retrieved.</p>
        <button
          type="button"
          onClick={handleBack}
          className="mt-4 flex items-center gap-2 text-[#C07A4D] hover:text-[#D89A70]"
        >
          <ArrowLeft size={16} />
          Back to Notes
        </button>
      </div>
    );
  }

  const effectiveTeacherId = teacherId || note.teacherId;

  return (
    <div className="min-h-full bg-[#151515] px-6 py-6">
      <button
        type="button"
        onClick={handleBack}
        className="mb-5 flex items-center gap-2 text-sm text-[#C07A4D] hover:text-[#D89A70]"
      >
        <ArrowLeft size={16} />
        Back to Notes
      </button>

      {/* HEADER */}
      <div className="rounded-xl border border-[#4A3428] bg-[#1C1917] p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#946246]">
              Teacher Note
            </p>
            <h1 className="mt-2 text-xl font-semibold text-[#F5F0EA]">
              {note.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#2A1710] px-3 py-1 text-xs font-medium text-[#D8B59C]">
                {note.subject}
              </span>
              {note.topic && note.topic !== note.title && (
                <span className="rounded-full border border-[#4A3428] bg-[#1C1917] px-3 py-1 text-xs text-[#A89A91]">
                  {note.topic}
                </span>
              )}
              <span className="rounded-full border border-[#4A3428] bg-[#1C1917] px-3 py-1 text-xs text-[#A89A91]">
                {note.batch}
              </span>
              <span
                className={
                  note.status === 'Published'
                    ? 'rounded-full bg-[#1A2E1F] px-3 py-1 text-xs font-medium text-[#56C77C]'
                    : 'rounded-full bg-[#2E2810] px-3 py-1 text-xs font-medium text-[#D4AA44]'
                }
              >
                {note.status}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(`/admin/teachers/notes/${effectiveTeacherId}/edit/${note.id}`)
            }
            className="flex items-center gap-2 rounded-lg bg-[#5A321F] px-4 py-2 text-sm font-medium text-[#F1E5D8] hover:bg-[#7A4930]"
          >
            <Edit3 size={15} />
            Edit
          </button>
        </div>
      </div>

      {/* META */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#4A3428] bg-[#1C1917] p-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#756E67]">
            Faculty
          </p>
          <p className="mt-2 font-semibold text-[#F5F0EA]">
            {note.teacherName}
          </p>
          <p className="mt-1 text-xs text-[#A89A91]">
            {note.teacherDesignation}
          </p>
        </div>

        <div className="rounded-xl border border-[#4A3428] bg-[#1C1917] p-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#756E67]">
            Department
          </p>
          <p className="mt-2 font-semibold text-[#F5F0EA]">
            {note.department || 'Academics'}
          </p>
        </div>

        <div className="rounded-xl border border-[#4A3428] bg-[#1C1917] p-5">
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className="text-[#756E67]" />
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#756E67]">
              Date
            </p>
          </div>
          <p className="mt-2 font-semibold text-[#F5F0EA]">{note.noteDate}</p>
        </div>
      </div>

      {/* DESCRIPTION */}
      <div className="mt-5 rounded-xl border border-[#4A3428] bg-[#1C1917] p-6">
        <h2 className="text-sm font-semibold text-[#F5F0EA]">Description</h2>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#A89A91]">
          {note.description || 'No description provided.'}
        </p>
      </div>

      {/* ATTACHMENTS */}
      {note.attachments && note.attachments.length > 0 && (
        <div className="mt-5 rounded-xl border border-[#4A3428] bg-[#1C1917] p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#F5F0EA]">
            <Paperclip size={15} />
            Attachments ({note.attachments.length})
          </h2>

          <div className="mt-4 space-y-3">
            {note.attachments.map((att) => {
              const activeUrl = signedUrls[att.id] || att.url;
              const isDownloading = downloadingId === att.id;

              return (
                <div
                  key={att.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#3A2922] bg-[#231E1B] px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={18} className="text-[#C07A4D] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#F5F0EA] truncate" title={att.name}>
                        {att.name}
                      </p>
                      <p className="text-xs text-[#756E67]">
                        {att.type} {att.size ? `· ${att.size}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeUrl && (
                      <button
                        type="button"
                        onClick={() => window.open(activeUrl, '_blank')}
                        className="flex items-center gap-1.5 rounded-md border border-[#4A3428] bg-[#1C1917] px-3 py-1.5 text-xs font-medium text-[#D8B59C] hover:bg-[#2A1710] hover:text-[#F5F0EA] transition"
                        title="Open file in browser"
                      >
                        <ExternalLink size={13} />
                        View
                      </button>
                    )}

                    {activeUrl && (
                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={() => handleDownload(att)}
                        className="flex items-center gap-1.5 rounded-md bg-[#5A321F] px-3 py-1.5 text-xs font-medium text-[#F1E5D8] hover:bg-[#7A4930] disabled:opacity-50 transition"
                        title="Download file to device"
                      >
                        {isDownloading ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Download size={13} />
                        )}
                        Download
                      </button>
                    )}
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

export default TeacherNoteViewPage;
