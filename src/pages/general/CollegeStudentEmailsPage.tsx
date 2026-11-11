import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2,
  Upload,
  Mail,
  FileText,
  Search,
  CheckCircle2,
  Trash2,
  Copy,
  Check,
  Download,
  Plus,
  AlertCircle,
  Users,
  ChevronDown,
  Sparkles,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  X,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { academicService, AcademicCollege } from '../../services/academicService';
import {
  collegeStudentEmailService,
  CollegeStudentEmail,
} from '../../services/collegeStudentEmailService';
import {
  parseRawTextFile,
  parseXlsxBuffer,
} from '../../utils/fileImportParser';

export const CollegeStudentEmailsPage: React.FC = () => {
  const { showToast } = useToast();

  const [colleges, setColleges] = useState<AcademicCollege[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dudex_selected_college_email_tab') || '';
    }
    return '';
  });
  const [emails, setEmails] = useState<CollegeStudentEmail[]>([]);
  const [allSystemEmails, setAllSystemEmails] = useState<CollegeStudentEmail[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // File upload state
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStats, setUploadStats] = useState<{
    added: number;
    duplicate: number;
    invalid: number;
    fileName: string;
  } | null>(null);

  // Modals
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');
  // Batch assigned to every email added now (single, CSV, paste). Students get it
  // automatically at registration.
  const [batchName, setBatchName] = useState('');

  // Bulk paste modal
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState('');

  // Confirmation dialogs
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load colleges on mount and subscribe to changes
  const loadColleges = () => {
    const list = academicService.getColleges();
    setColleges(list);
    if (list.length > 0) {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('dudex_selected_college_email_tab') : '';
      if (saved && list.some((c) => c.id === saved)) {
        setSelectedCollegeId(saved);
      } else if (!selectedCollegeId) {
        setSelectedCollegeId(list[0].id);
      }
    }
  };

  useEffect(() => {
    loadColleges();
    const unsub = academicService.onAcademicChange(loadColleges);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (selectedCollegeId && typeof window !== 'undefined') {
      localStorage.setItem('dudex_selected_college_email_tab', selectedCollegeId);
    }
  }, [selectedCollegeId]);

  // Reload emails when college selection changes
  const reloadEmails = async () => {
    if (!selectedCollegeId) {
      setEmails([]);
      setAllSystemEmails([]);
      return;
    }
    try {
      const [collegeEmails, allEmails] = await Promise.all([
        collegeStudentEmailService.getEmailsByCollege(selectedCollegeId),
        collegeStudentEmailService.getAllEmails(),
      ]);
      setEmails(collegeEmails);
      setAllSystemEmails(allEmails);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Could not load the student email roster.',
        'error'
      );
    }
  };

  useEffect(() => {
    void reloadEmails();
    setSelectedEmailIds([]);
    setUploadStats(null);
  }, [selectedCollegeId, colleges]);

  const selectedCollege = useMemo(() => {
    return colleges.find((c) => c.id === selectedCollegeId);
  }, [colleges, selectedCollegeId]);

  // All emails across system for aggregate KPI
  // Filtered emails
  const filteredEmails = useMemo(() => {
    let result = emails;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.email.toLowerCase().includes(q) ||
          (item.studentName && item.studentName.toLowerCase().includes(q))
      );
    }
    return result;
  }, [emails, searchQuery]);

  // Copy email helper
  const handleCopy = (emailText: string, id: string) => {
    navigator.clipboard.writeText(emailText);
    setCopiedId(id);
    showToast(`Copied ${emailText} to clipboard`, 'info');
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Core processor for parsed student email items
  const handleExtractedItems = async (
    items: {
      email: string;
      studentName?: string;
    }[],
    sourceName: string,
    inFileDataDuplicateCount: number = 0,
    inFileInvalidCount: number = 0
  ) => {
    if (!selectedCollege) {
      showToast('Please select a college first', 'error');
      setIsProcessing(false);
      return;
    }

    if (items.length === 0) {
      showToast('No valid email addresses were found in the uploaded file.', 'error');
      setIsProcessing(false);
      return;
    }

    try {
      const result = await collegeStudentEmailService.addEmails(
        selectedCollege.id,
        selectedCollege.collegeName,
        items,
        sourceName,
        batchName || undefined
      );

      const totalDuplicates = result.duplicateCount + inFileDataDuplicateCount;
      const totalInvalid = result.invalidCount + inFileInvalidCount;

      setUploadStats({
        added: result.addedCount,
        duplicate: totalDuplicates,
        invalid: totalInvalid,
        fileName: sourceName,
      });

      await reloadEmails();

      if (result.addedCount > 0) {
        showToast(
          `Successfully saved ${result.addedCount} student mail IDs for ${selectedCollege.collegeName}!`,
          'success'
        );
      } else {
        showToast(
          `All ${totalDuplicates} mail IDs were already registered or duplicate in file.`,
          'info'
        );
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Could not save student email roster entries.',
        'error'
      );
    }
  };

  // Helper to process uploaded file (supports XLSX, XLS, CSV, TXT)
  const processUploadedFile = async (file: File) => {
    if (!selectedCollege) {
      showToast('Please select a college first', 'error');
      return;
    }

    setIsProcessing(true);

    try {
      const isExcelByName = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      const buffer = await file.arrayBuffer();
      const firstBytes = new Uint8Array(buffer.slice(0, 4));
      // PK\x03\x04 indicates a zip file (such as .xlsx)
      const isZip = firstBytes[0] === 0x50 && firstBytes[1] === 0x4b && firstBytes[2] === 0x03 && firstBytes[3] === 0x04;

      if (isExcelByName || isZip) {
        const parseResult = await parseXlsxBuffer(buffer);
        if (parseResult.items.length > 0) {
          await handleExtractedItems(
            parseResult.items,
            file.name,
            parseResult.duplicateCountInFile,
            parseResult.invalidCount
          );
          return;
        }
      }

      // Read as text with fallback for UTF-16
      let text = '';
      try {
        const uint8 = new Uint8Array(buffer);
        // Check for UTF-16 LE BOM or null bytes
        if (uint8[0] === 0xFF && uint8[1] === 0xFE) {
          text = new TextDecoder('utf-16le').decode(uint8);
        } else {
          text = new TextDecoder('utf-8').decode(uint8);
        }
      } catch {
        text = await file.text();
      }

      const parseResult = parseRawTextFile(text);
      await handleExtractedItems(
        parseResult.items,
        file.name,
        parseResult.duplicateCountInFile,
        parseResult.invalidCount
      );
    } catch (err) {
      console.error('File parsing error:', err);
      showToast('Error reading and processing file. Please ensure valid file format.', 'error');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Helper to parse pasted raw text
  const processRawFileText = async (text: string, sourceName: string) => {
    setIsProcessing(true);
    try {
      const parseResult = parseRawTextFile(text);
      await handleExtractedItems(
        parseResult.items,
        sourceName,
        parseResult.duplicateCountInFile,
        parseResult.invalidCount
      );
    } catch (err) {
      console.error(err);
      showToast('Error processing text.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processUploadedFile(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processUploadedFile(file);
  };

  // Handle Manual Single Email Add
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollege) {
      showToast('Please select a college first', 'error');
      return;
    }
    if (!manualEmail.trim()) {
      showToast('Please enter an email address', 'error');
      return;
    }

    const cleanEmail = manualEmail.trim().toLowerCase();

    try {
      const res = await collegeStudentEmailService.addSingleEmail(
        selectedCollege.id,
        selectedCollege.collegeName,
        cleanEmail,
        manualName.trim() || undefined,
        batchName || undefined
      );

      if (res.success) {
        showToast(res.message, 'success');
        await reloadEmails();
        setIsManualModalOpen(false);
        setManualEmail('');
        setManualName('');
      } else {
        showToast(res.message, 'error');
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Could not add the student email.',
        'error'
      );
    }
  };

  // Handle Paste Block of Emails
  const handlePasteSubmit = async () => {
    if (!pasteContent.trim()) {
      showToast('Please paste email text or list', 'error');
      return;
    }
    await processRawFileText(pasteContent, 'Manual Paste / Block Input');
    setIsPasteModalOpen(false);
    setPasteContent('');
  };

  // Download Sample CSV template
  const handleDownloadSample = () => {
    const sampleCsv = `email,student_name
arjun.sharma@dit.dudex.edu,Arjun Sharma
priya.nair@dit.dudex.edu,Priya Nair
rohit.verma@dit.dudex.edu,Rohit Verma
sneha.patel@dit.dudex.edu,Sneha Patel
vikram.aditya@dit.dudex.edu,Vikram Aditya`;

    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_student_mail_ids_roster.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded sample student email CSV template', 'success');
  };

  // Export current college emails as CSV
  const handleExportCSV = async () => {
    if (!selectedCollege || emails.length === 0) {
      showToast('No emails to export for this college', 'error');
      return;
    }

    try {
      const csvContent = await collegeStudentEmailService.exportToCSV(selectedCollege.id);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${selectedCollege.code}_student_emails.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Exported ${emails.length} emails to CSV`, 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Could not export the student email roster.',
        'error'
      );
    }
  };

  // Single delete
  const handleDeleteEmail = async (id: string) => {
    try {
      await collegeStudentEmailService.deleteEmail(id);
      await reloadEmails();
      setDeleteConfirmId(null);
      showToast('Student mail ID removed', 'info');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not remove the roster entry.', 'error');
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedEmailIds.length === 0) return;
    try {
      await collegeStudentEmailService.deleteEmails(selectedEmailIds);
      await reloadEmails();
      setSelectedEmailIds([]);
      setIsBulkDeleteDialogOpen(false);
      showToast(`Removed ${selectedEmailIds.length} mail IDs`, 'info');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not remove the selected entries.', 'error');
    }
  };

  // Clear all for college
  const handleClearAllCollege = async () => {
    if (!selectedCollege) return;
    try {
      await collegeStudentEmailService.clearEmailsByCollege(selectedCollege.id);
      await reloadEmails();
      setIsClearAllDialogOpen(false);
      showToast(`Cleared all student mail IDs for ${selectedCollege.collegeName}`, 'info');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not clear the college roster.', 'error');
    }
  };

  // Select all checkbox
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedEmailIds(filteredEmails.map((item) => item.id));
    } else {
      setSelectedEmailIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedEmailIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 pb-14 animate-fade-in">
      <PageHeader
        title="College Student Mail IDs"
        description="Select an affiliated college institution, upload email rosters (.csv, .xlsx, .txt), extract student mail IDs, and manage institutional records."
        breadcrumbs={[
          { label: 'Admin', path: '/admin/students/list' },
          { label: 'General Management', path: '/admin/academic' },
          { label: 'Student Mail IDs' },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSample}
              className="border-[#3A2922] bg-[#1A120E] text-[#F1E5D8] hover:bg-[#2A1710]"
            >
              <Download className="w-4 h-4 mr-1.5 text-amber-400" />
              Sample Template (.CSV)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPasteModalOpen(true)}
              className="border-[#3A2922] bg-[#1A120E] text-[#F1E5D8] hover:bg-[#2A1710]"
            >
              <FileText className="w-4 h-4 mr-1.5 text-blue-400" />
              Paste Multiple
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsManualModalOpen(true)}
              className="bg-[#5A321F] hover:bg-[#6D3D27] text-[#F5F0EA] border border-[#5A321F]/80 shadow-md"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Single Mail ID
            </Button>
          </div>
        }
      />

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-[#171311] border-[#3A2922]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#A89A91] uppercase tracking-wider">
                Colleges Configured
              </p>
              <h3 className="text-2xl font-bold text-[#F5F0EA] mt-1">
                {colleges.length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#2A1710] border border-[#5A321F]/40 flex items-center justify-center text-[#946246]">
              <Building2 className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <p className="text-[11px] text-[#A89A91] mt-2">
            Affiliated institutions in database
          </p>
        </Card>

        <Card className="p-4 bg-[#171311] border-[#3A2922]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#A89A91] uppercase tracking-wider">
                Selected College
              </p>
              <h3 className="text-lg font-bold text-[#F5F0EA] mt-1 truncate max-w-[180px]">
                {selectedCollege ? selectedCollege.code : 'None Selected'}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#2A1710] border border-[#5A321F]/40 flex items-center justify-center text-[#946246]">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <p className="text-[11px] text-[#A89A91] mt-2 truncate">
            {selectedCollege?.collegeName || 'Select a college'}
          </p>
        </Card>

        <Card className="p-4 bg-[#171311] border-[#3A2922]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#A89A91] uppercase tracking-wider">
                College Mail IDs
              </p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">
                {emails.length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#2A1710] border border-[#5A321F]/40 flex items-center justify-center text-[#946246]">
              <Mail className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <p className="text-[11px] text-[#A89A91] mt-2">
            Saved for {selectedCollege?.code || 'this college'}
          </p>
        </Card>

        <Card className="p-4 bg-[#171311] border-[#3A2922]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#A89A91] uppercase tracking-wider">
                Total System Roster
              </p>
              <h3 className="text-2xl font-bold text-[#F5F0EA] mt-1">
                {allSystemEmails.length}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#2A1710] border border-[#5A321F]/40 flex items-center justify-center text-[#946246]">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-[11px] text-[#A89A91] mt-2">
            Student mail IDs across all colleges
          </p>
        </Card>
      </div>

      {/* STEP 1: Select the College */}
      <Card className="p-5 bg-[#171311] border-[#3A2922]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#3A2922]">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-[#5A321F] text-[#F1E5D8] text-xs font-bold flex items-center justify-center">
              1
            </span>
            <div>
              <h3 className="text-base font-bold text-[#F5F0EA]">
                Select Target College Institution
              </h3>
              <p className="text-xs text-[#A89A91]">
                Choose the institution for which student email IDs should be retrieved and saved
              </p>
            </div>
          </div>

          <div className="w-full md:w-80">
            <select
              value={selectedCollegeId}
              onChange={(e) => setSelectedCollegeId(e.target.value)}
              className="w-full bg-[#201713] border border-[#3A2922] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F0EA] focus:outline-none focus:border-[#946246] transition-colors"
            >
              {colleges.map((c) => {
                const count = allSystemEmails.filter((email) => email.collegeId === c.id).length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.collegeName} ({c.code}) — {count} Mail IDs
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Batch assigned to emails added below */}
        <div className="mt-4 rounded-xl border border-[#3A2922] bg-[#1C1613] p-4">
          <label className="block text-xs font-semibold text-[#A89A91] uppercase tracking-wider mb-1.5">
            Assign batch to new student mail IDs
          </label>
          <select
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            className="w-full sm:w-80 bg-[#201713] border border-[#3A2922] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F0EA] focus:outline-none focus:border-[#946246]"
          >
            <option value="">No batch (student chooses at registration)</option>
            {(selectedCollege?.batches || []).map((b) => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-[#A89A91]">
            Applies to single adds, CSV/Excel uploads and pasted lists. Add batches to a college under Academic Setup.
          </p>
        </div>

        {/* Visual College Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {colleges.map((college) => {
            const isSelected = college.id === selectedCollegeId;
            const count = allSystemEmails.filter((email) => email.collegeId === college.id).length;

            return (
              <button
                key={college.id}
                type="button"
                onClick={() => setSelectedCollegeId(college.id)}
                className={`p-3.5 rounded-xl text-left transition-all border cursor-pointer relative ${
                  isSelected
                    ? 'bg-[#2A1710] border-amber-500/80 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/50'
                    : 'bg-[#1C1613] border-[#3A2922]/60 hover:border-[#5A321F] hover:bg-[#201713]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#3A2922] text-[#F1E5D8] uppercase tracking-wider">
                    {college.code}
                  </span>
                  <span className="text-[11px] font-semibold text-amber-400">
                    {count} emails
                  </span>
                </div>
                <h4 className="font-semibold text-sm text-[#F5F0EA] mt-2 line-clamp-1">
                  {college.collegeName}
                </h4>
                <p className="text-[11px] text-[#A89A91] line-clamp-1 mt-0.5">
                  {college.campusLocation || 'Main Campus'}
                </p>
                {isSelected && (
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] font-bold text-amber-400">
                    <Check className="w-3.5 h-3.5" />
                    <span>Active</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* STEP 2: File Upload Zone */}
      <Card className="p-5 bg-[#171311] border-[#3A2922]">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-7 h-7 rounded-full bg-[#5A321F] text-[#F1E5D8] text-xs font-bold flex items-center justify-center">
            2
          </span>
          <div>
            <h3 className="text-base font-bold text-[#F5F0EA]">
              Upload Student Mail ID Roster File
            </h3>
            <p className="text-xs text-[#A89A91]">
              The system extracts all student email IDs from the file, displays them, and permanently saves them for{' '}
              <span className="text-amber-400 font-semibold">
                {selectedCollege?.collegeName || 'the selected college'}
              </span>
            </p>
          </div>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
            isDragging
              ? 'border-amber-400 bg-amber-950/20 shadow-inner'
              : 'border-[#3A2922] bg-[#140F0D]/60 hover:border-[#5A321F] hover:bg-[#1C1613]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx, .xls, .txt, .json"
            onChange={handleFileChange}
            className="hidden"
            id="student-email-file-input"
          />

          <div className="max-w-md mx-auto flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-[#2A1710] border border-[#5A321F] flex items-center justify-center text-amber-400 mb-3 shadow-lg">
              {isProcessing ? (
                <RefreshCw className="w-7 h-7 animate-spin text-amber-400" />
              ) : (
                <Upload className="w-7 h-7" />
              )}
            </div>

            <h4 className="text-base font-bold text-[#F5F0EA]">
              {isProcessing
                ? 'Processing & Extracting Mail IDs...'
                : 'Drag & drop your student roster file here'}
            </h4>
            <p className="text-xs text-[#A89A91] mt-1 leading-relaxed">
              Supports <strong>.CSV</strong>, <strong>.XLSX</strong>, <strong>.TXT</strong>, or <strong>.JSON</strong>.
              Auto-detects email columns or extracts any email address formatting.
            </p>

            <div className="flex items-center gap-3 mt-4">
              <label
                htmlFor="student-email-file-input"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#5A321F] hover:bg-[#6D3D27] text-[#F1E5D8] transition-colors border border-[#5A321F]/80 shadow-md"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Browse File from Computer</span>
              </label>

              <button
                type="button"
                onClick={handleDownloadSample}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[#A89A91] hover:text-[#F5F0EA] border border-[#3A2922] hover:bg-[#2A1710]/40 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Get Sample CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Upload Success Alert / Summary */}
        {uploadStats && (
          <div className="mt-4 p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 flex items-start justify-between gap-3 animate-fade-in">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-bold text-[#F5F0EA]">
                  Processed File: {uploadStats.fileName}
                </h5>
                <p className="text-xs text-[#A89A91] mt-0.5">
                  <span className="text-emerald-400 font-semibold">{uploadStats.added} new student emails</span> successfully saved to{' '}
                  <span className="text-amber-300 font-medium">{selectedCollege?.collegeName}</span>.
                  {uploadStats.duplicate > 0 && ` (${uploadStats.duplicate} duplicate emails ignored).`}
                  {uploadStats.invalid > 0 && ` (${uploadStats.invalid} invalid formats skipped).`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setUploadStats(null)}
              className="text-[#A89A91] hover:text-[#F5F0EA] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </Card>

      {/* STEP 3: Display & Saved Records */}
      <Card className="bg-[#171311] border-[#3A2922] overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-[#3A2922] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-[#5A321F] text-[#F1E5D8] text-xs font-bold flex items-center justify-center">
              3
            </span>
            <div>
              <h3 className="text-base font-bold text-[#F5F0EA] flex items-center gap-2">
                <span>Saved Student Mail IDs</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#2A1710] text-amber-400 border border-[#5A321F]/60 font-semibold">
                  {emails.length} total
                </span>
              </h3>
              <p className="text-xs text-[#A89A91]">
                Roster for <span className="text-amber-400">{selectedCollege?.collegeName}</span> ({selectedCollege?.code})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A89A91]" />
              <input
                type="text"
                placeholder="Search mail ID, name, or student ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#201713] border border-[#3A2922] rounded-xl pl-9 pr-3 py-2 text-xs text-[#F5F0EA] placeholder-[#A89A91] focus:outline-none focus:border-[#946246]"
              />
            </div>

            {/* Bulk actions */}
            {selectedEmailIds.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkDeleteDialogOpen(true)}
                className="border-rose-900/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete Selected ({selectedEmailIds.length})
              </Button>
            )}

            {emails.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="border-[#3A2922] text-[#F1E5D8] hover:bg-[#2A1710]"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-amber-400" />
                  Export CSV
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsClearAllDialogOpen(true)}
                  className="border-rose-900/40 text-rose-400 hover:bg-rose-950/30"
                >
                  Clear All
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filteredEmails.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#2A1710] border border-[#5A321F]/40 flex items-center justify-center text-[#946246] mx-auto mb-3">
                <Mail className="w-7 h-7 text-[#A89A91]" />
              </div>
              <h4 className="text-base font-bold text-[#F5F0EA]">
                {searchQuery ? 'No matching student mail IDs' : 'No student emails saved for this college'}
              </h4>
              <p className="text-xs text-[#A89A91] max-w-md mx-auto mt-1 leading-relaxed">
                {searchQuery
                  ? 'Try adjusting your search query to find the mail ID.'
                  : `Upload a student roster file using Step 2 above to fetch and save all student emails for ${selectedCollege?.collegeName}.`}
              </p>
              {!searchQuery && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <label
                    htmlFor="student-email-file-input"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#5A321F] text-[#F1E5D8] hover:bg-[#6D3D27] transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Roster File</span>
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsManualModalOpen(true)}
                    className="border-[#3A2922] text-[#F1E5D8]"
                  >
                    Add Single Mail ID
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#1C1613] text-[#A89A91] uppercase tracking-wider text-[11px] border-b border-[#3A2922]">
                  <th className="py-3.5 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredEmails.length > 0 &&
                        selectedEmailIds.length === filteredEmails.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-[#3A2922] bg-[#140F0D] text-amber-500 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-3 font-semibold">#</th>
                  <th className="py-3.5 px-4 font-semibold">Student Mail ID</th>
                  <th className="py-3.5 px-4 font-semibold">Student Name</th>
                  <th className="py-3.5 px-4 font-semibold">Source File</th>
                  <th className="py-3.5 px-4 font-semibold">Date Saved</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3A2922]/50 text-[#F5F0EA]">
                {filteredEmails.map((item, index) => {
                  const isChecked = selectedEmailIds.includes(item.id);
                  const isCopied = copiedId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#2A1710]/30 transition-colors ${
                        isChecked ? 'bg-[#2A1710]/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSelectOne(item.id)}
                          className="rounded border-[#3A2922] bg-[#140F0D] text-amber-500 focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-3 text-[#A89A91] font-mono">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-amber-300 font-mono tracking-tight text-xs">
                            {item.email}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.email, item.id)}
                            title="Copy email address"
                            className="p-1 rounded hover:bg-[#3A2922] text-[#A89A91] hover:text-[#F5F0EA] transition-colors cursor-pointer"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-medium text-[#F5F0EA]">
                            {item.studentName || '—'}
                          </p>
                          {item.batchName && (
                            <p className="text-[11px] text-amber-300">{item.batchName}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#A89A91] truncate max-w-[140px]" title={item.sourceFileName}>
                        {item.sourceFileName || 'File Upload'}
                      </td>
                      <td className="py-3.5 px-4 text-[#A89A91]">
                        {new Date(item.uploadedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge
                          status={item.status === 'Verified' ? 'Active' : 'Active'}
                          size="sm"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(item.email, item.id)}
                            className="p-1.5 rounded-lg text-[#A89A91] hover:text-[#F5F0EA] hover:bg-[#2A1710] transition-colors"
                            title="Copy Email"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Manual Add Single Mail ID Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#171311] border border-[#3A2922] rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#3A2922]">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-[#F5F0EA]">
                  Add Student Mail ID
                </h3>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-[#A89A91] hover:text-[#F5F0EA] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualAdd} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-[#A89A91] uppercase tracking-wider mb-1.5">
                  Target College
                </label>
                <div className="p-2.5 rounded-xl bg-[#201713] border border-[#3A2922] text-sm text-[#F5F0EA] font-medium">
                  {selectedCollege?.collegeName} ({selectedCollege?.code})
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A89A91] uppercase tracking-wider mb-1.5">
                  Student Mail ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul.sharma@dit.dudex.edu"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="w-full bg-[#201713] border border-[#3A2922] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F0EA] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A89A91] uppercase tracking-wider mb-1.5">
                  Student Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full bg-[#201713] border border-[#3A2922] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F0EA] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#3A2922]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsManualModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="bg-[#5A321F] text-[#F1E5D8]"
                >
                  Save Mail ID
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Paste Block Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#171311] border border-[#3A2922] rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#3A2922]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base text-[#F5F0EA]">
                  Paste Student Mail IDs in Bulk
                </h3>
              </div>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="text-[#A89A91] hover:text-[#F5F0EA] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mt-4">
              <p className="text-xs text-[#A89A91] leading-relaxed">
                Paste any block of text, CSV content, or list of student emails below. All valid email addresses will be automatically parsed, deduplicated, and saved for{' '}
                <strong className="text-amber-400">{selectedCollege?.collegeName}</strong>.
              </p>

              <textarea
                rows={8}
                placeholder="Example:&#10;john.doe@dit.dudex.edu&#10;sarah.connor@dit.dudex.edu&#10;alex.chen@dit.dudex.edu, Alex Chen, STU-101&#10;..."
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                className="w-full bg-[#201713] border border-[#3A2922] rounded-xl p-3 text-xs text-[#F5F0EA] font-mono focus:outline-none focus:border-amber-500"
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#3A2922]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPasteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePasteSubmit}
                  className="bg-[#5A321F] text-[#F1E5D8]"
                >
                  Process & Save Emails
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Delete Single Email */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmId)}
        title="Delete Student Mail ID"
        message="Are you sure you want to remove this student mail ID from the college roster?"
        confirmText="Delete Email"
        onConfirm={() => deleteConfirmId && handleDeleteEmail(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {/* Confirmation Dialog: Bulk Delete */}
      <ConfirmDialog
        isOpen={isBulkDeleteDialogOpen}
        title="Delete Selected Mail IDs"
        message={`Are you sure you want to delete ${selectedEmailIds.length} selected student mail IDs?`}
        confirmText="Delete Selected"
        onConfirm={handleBulkDelete}
        onClose={() => setIsBulkDeleteDialogOpen(false)}
        onCancel={() => setIsBulkDeleteDialogOpen(false)}
      />

      {/* Confirmation Dialog: Clear All */}
      <ConfirmDialog
        isOpen={isClearAllDialogOpen}
        title={`Clear All Emails for ${selectedCollege?.collegeName}`}
        message="This will delete all saved student mail IDs for this college institution. This action cannot be undone."
        confirmText="Clear All Roster"
        onConfirm={handleClearAllCollege}
        onClose={() => setIsClearAllDialogOpen(false)}
        onCancel={() => setIsClearAllDialogOpen(false)}
      />
    </div>
  );
};
