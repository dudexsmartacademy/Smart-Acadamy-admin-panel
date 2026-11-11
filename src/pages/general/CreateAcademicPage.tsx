import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  GraduationCap,
  Layers,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Users,
  Search,
  Sparkles,
  MapPin,
  Calendar,
  X,
  AlertCircle,
  Hash,
} from 'lucide-react';
import {
  academicService,
  AcademicCollege,
  BatchConfig,
} from '../../services/academicService';
import { useToast } from '../../context/ToastContext';

export const CreateAcademicPage: React.FC = () => {
  const { showToast } = useToast();

  const [colleges, setColleges] = useState<AcademicCollege[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [editingCollegeId, setEditingCollegeId] = useState<string | null>(null);

  // Form State
  const [collegeName, setCollegeName] = useState('');
  const [collegeCode, setCollegeCode] = useState('');
  const [campusLocation, setCampusLocation] = useState('');
  const [establishedYear, setEstablishedYear] = useState('2024');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  // Degrees
  const [degrees, setDegrees] = useState<string[]>([
    'B.Tech',
    'M.Tech',
    'BCA',
    'MCA',
  ]);
  const [customDegree, setCustomDegree] = useState('');

  // Specializations
  const [specializations, setSpecializations] = useState<string[]>([
    'CSE',
    'AI & DS',
    'Cyber Security',
    'Information Technology',
  ]);
  const [customSpec, setCustomSpec] = useState('');

  // Batches
  const [batchLimit, setBatchLimit] = useState<number>(60);
  // Batch names are global across colleges; numbers are assigned on save.
  const [batches, setBatches] = useState<BatchConfig[]>([
    { id: 'b-1', name: 'New batch 1', studentLimit: 60 },
    { id: 'b-2', name: 'New batch 2', studentLimit: 60 },
  ]);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchLimit, setNewBatchLimit] = useState<number>(60);

  // Load Colleges
  const loadData = () => {
    setColleges(academicService.getColleges());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = academicService.onAcademicChange(loadData);
    return () => unsubscribe();
  }, []);

  // Quick preset pills
  const degreePresets = ['B.Tech', 'M.Tech', 'BCA', 'MCA', 'B.Sc', 'M.Sc', 'MBA', 'Diploma'];
  const specPresets = [
    'CSE',
    'AI & DS',
    'Cyber Security',
    'Information Technology',
    'Data Science',
    'Cloud Computing',
    'Robotics & Automation',
    'VLSI & Embedded',
  ];

  const handleAddDegree = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (degrees.includes(trimmed)) {
      showToast(`${trimmed} is already added`, 'info');
      return;
    }
    setDegrees([...degrees, trimmed]);
    setCustomDegree('');
  };

  const handleRemoveDegree = (item: string) => {
    setDegrees(degrees.filter((d) => d !== item));
  };

  const handleAddSpec = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    if (specializations.includes(trimmed)) {
      showToast(`${trimmed} is already added`, 'info');
      return;
    }
    setSpecializations([...specializations, trimmed]);
    setCustomSpec('');
  };

  const handleRemoveSpec = (item: string) => {
    setSpecializations(specializations.filter((s) => s !== item));
  };

  const handleAddBatch = () => {
    const trimmed = newBatchName.trim() || `New batch ${batches.length + 1}`;
    if (batches.some((b) => b.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`${trimmed} already exists`, 'info');
      return;
    }
    const newConfig: BatchConfig = {
      id: `b-${Date.now()}`,
      name: trimmed,
      studentLimit: Number(newBatchLimit) || batchLimit || 60,
    };
    setBatches([...batches, newConfig]);
    setNewBatchName('');
  };

  const handleRemoveBatch = (id: string) => {
    if (batches.length <= 1) {
      showToast('At least one batch configuration is required', 'error');
      return;
    }
    setBatches(batches.filter((b) => b.id !== id));
  };

  const handleQuickGenerateBatches = (count: number) => {
    const generated: BatchConfig[] = Array.from({ length: count }, (_, idx) => ({
      id: `b-${Date.now()}-${idx + 1}`,
      name: `New batch ${idx + 1}`,
      studentLimit: batchLimit || 60,
    }));
    setBatches(generated);
    showToast(`Generated ${count} batches with limit ${batchLimit || 60}`, 'success');
  };

  const handleUpdateBatchLimit = (id: string, limitVal: number) => {
    setBatches(
      batches.map((b) => (b.id === id ? { ...b, studentLimit: limitVal } : b))
    );
  };

  const handleApplyGlobalLimit = (limitVal: number) => {
    setBatchLimit(limitVal);
    setBatches(batches.map((b) => ({ ...b, studentLimit: limitVal })));
    showToast(`Applied student limit ${limitVal} to all batches`, 'success');
  };

  const resetForm = () => {
    setCollegeName('');
    setCollegeCode('');
    setCampusLocation('');
    setEstablishedYear('2024');
    setStatus('Active');
    setDegrees(['B.Tech', 'M.Tech', 'BCA', 'MCA']);
    setSpecializations(['CSE', 'AI & DS', 'Cyber Security', 'Information Technology']);
    setBatchLimit(60);
    setBatches([
      { id: 'b-1', name: 'New batch 1', studentLimit: 60 },
      { id: 'b-2', name: 'New batch 2', studentLimit: 60 },
    ]);
    setEditingCollegeId(null);
  };

  const handleEditCollege = (col: AcademicCollege) => {
    setEditingCollegeId(col.id);
    setCollegeName(col.collegeName);
    setCollegeCode(col.code || '');
    setCampusLocation(col.campusLocation || '');
    setEstablishedYear(col.establishedYear || '2024');
    setStatus(col.status);
    setDegrees(col.degrees || []);
    setSpecializations(col.specializations || []);
    setBatchLimit(col.batchLimit || 60);
    setBatches(
      col.batches && col.batches.length > 0
        ? col.batches
        : [{ id: 'b-1', name: 'Batch 1', studentLimit: 60 }]
    );
    setActiveTab('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCollege = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}"?`)) {
      void academicService.deleteCollege(id).then((error) => {
        showToast(error ? `Could not remove "${name}": ${error}` : `Removed "${name}" from academic colleges`, error ? 'error' : 'success');
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!collegeName.trim()) {
      showToast('Please enter the college name', 'error');
      return;
    }

    if (degrees.length === 0) {
      showToast('Please specify at least one degree', 'error');
      return;
    }

    if (specializations.length === 0) {
      showToast('Please specify at least one specialization', 'error');
      return;
    }

    if (batches.length === 0) {
      showToast('Please configure at least one batch', 'error');
      return;
    }

    // New batches continue the global numbering (e.g. Batch 3, Batch 4 after
    // another college's Batch 1 and Batch 2).
    const numberedBatches = academicService.numberBatches(batches, editingCollegeId);

    const payload = {
      collegeName: collegeName.trim(),
      code: collegeCode.trim() || `COL-${Date.now().toString().slice(-4)}`,
      campusLocation: campusLocation.trim(),
      establishedYear: establishedYear.trim(),
      degrees,
      specializations,
      batches: numberedBatches,
      batchLimit: Number(batchLimit) || 60,
      status,
    };

    if (editingCollegeId) {
      const { error } = await academicService.updateCollege(editingCollegeId, payload);
      if (error) {
        showToast(error, 'error');
        return;
      }
      showToast(`Successfully updated ${collegeName}!`, 'success');
    } else {
      const { error } = await academicService.createCollege(payload);
      if (error) {
        showToast(error, 'error');
        return;
      }
      showToast(
        `Academic institution "${collegeName}" created! Now available across student & teacher modules.`,
        'success'
      );
    }

    resetForm();
    setActiveTab('list');
  };

  // Filtered colleges for list view
  const filteredColleges = useMemo(() => {
    if (!searchTerm.trim()) return colleges;
    const term = searchTerm.toLowerCase();
    return colleges.filter(
      (c) =>
        c.collegeName.toLowerCase().includes(term) ||
        c.code.toLowerCase().includes(term) ||
        (c.campusLocation && c.campusLocation.toLowerCase().includes(term)) ||
        c.degrees.some((d) => d.toLowerCase().includes(term)) ||
        c.specializations.some((s) => s.toLowerCase().includes(term))
    );
  }, [colleges, searchTerm]);

  // Aggregate stats
  const totalDegreesCount = useMemo(() => {
    const set = new Set<string>();
    colleges.forEach((c) => c.degrees.forEach((d) => set.add(d)));
    return set.size;
  }, [colleges]);

  const totalSpecsCount = useMemo(() => {
    const set = new Set<string>();
    colleges.forEach((c) => c.specializations.forEach((s) => set.add(s)));
    return set.size;
  }, [colleges]);

  const totalBatchesCount = useMemo(() => {
    return colleges.reduce((sum, c) => sum + (c.batches?.length || 0), 0);
  }, [colleges]);

  return (
    <div className="min-h-screen bg-[#140F0D] text-[#F5F0EA] p-6 lg:p-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#A89A91]">
        <span>Admin</span>
        <span>›</span>
        <span>General Management</span>
        <span>›</span>
        <span className="text-[#F1E5D8] font-medium">Create Academic</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#3A2922]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2A1E19] border border-[#5A321F] flex items-center justify-center text-[#D78B55] shadow-inner">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#FAF7F2]">
                Create Academic Institution
              </h1>
              <p className="text-xs text-[#A89A91] mt-0.5">
                Configure colleges, multiple degrees, specializations, and batch limits available across all system workflows.
              </p>
            </div>
          </div>
        </div>

        {/* Tab switch buttons */}
        <div className="flex items-center gap-2 bg-[#1A1412] p-1.5 rounded-xl border border-[#3A2922]">
          <button
            onClick={() => {
              setActiveTab('create');
              if (!editingCollegeId) resetForm();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'create'
                ? 'bg-[#8B4A28] text-[#FAF7F2] shadow-md'
                : 'text-[#A89A91] hover:text-[#FAF7F2]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            {editingCollegeId ? 'Edit Academic College' : 'Create Academic'}
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'list'
                ? 'bg-[#8B4A28] text-[#FAF7F2] shadow-md'
                : 'text-[#A89A91] hover:text-[#FAF7F2]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Registered Colleges ({colleges.length})
          </button>
        </div>
      </div>

      {/* Metric summary banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1C1512] border border-[#3A2922] rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-lg bg-[#2A1E19] text-[#D78B55]">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#A89A91] uppercase tracking-wider">
              Institutions
            </p>
            <p className="text-xl font-bold text-[#FAF7F2] mt-0.5">
              {colleges.length}
            </p>
          </div>
        </div>

        <div className="bg-[#1C1512] border border-[#3A2922] rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-lg bg-[#2A1E19] text-[#D78B55]">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#A89A91] uppercase tracking-wider">
              Degrees
            </p>
            <p className="text-xl font-bold text-[#FAF7F2] mt-0.5">
              {totalDegreesCount}
            </p>
          </div>
        </div>

        <div className="bg-[#1C1512] border border-[#3A2922] rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-lg bg-[#2A1E19] text-[#D78B55]">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#A89A91] uppercase tracking-wider">
              Specializations
            </p>
            <p className="text-xl font-bold text-[#FAF7F2] mt-0.5">
              {totalSpecsCount}
            </p>
          </div>
        </div>

        <div className="bg-[#1C1512] border border-[#3A2922] rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-lg bg-[#2A1E19] text-[#D78B55]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#A89A91] uppercase tracking-wider">
              Total Batches
            </p>
            <p className="text-xl font-bold text-[#FAF7F2] mt-0.5">
              {totalBatchesCount}
            </p>
          </div>
        </div>
      </div>

      {activeTab === 'create' ? (
        /* CREATE / EDIT FORM */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: College Basic Information */}
          <div className="bg-[#1A1412] border border-[#3A2922] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A1E19]">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#D78B55]" />
                <h2 className="text-sm font-bold text-[#FAF7F2] uppercase tracking-wide">
                  1. College & Institution Profile
                </h2>
              </div>
              {editingCollegeId && (
                <span className="text-xs bg-[#5A321F]/60 text-[#F1E5D8] px-2.5 py-1 rounded-full border border-[#8B4A28]">
                  Editing ID: {editingCollegeId}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* College Name */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-xs font-semibold text-[#D4C8BE]">
                  College / Institution Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DudeX Institute of Technology"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-[#140F0D] border border-[#3A2922] text-xs text-[#FAF7F2] placeholder-[#7D7068] focus:outline-none focus:border-[#8B4A28] focus:ring-1 focus:ring-[#8B4A28]"
                />
              </div>

              {/* College Code */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#D4C8BE]">
                  College Code / Acronym
                </label>
                <input
                  type="text"
                  placeholder="e.g. DIT-01"
                  value={collegeCode}
                  onChange={(e) => setCollegeCode(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-[#140F0D] border border-[#3A2922] text-xs text-[#FAF7F2] placeholder-[#7D7068] focus:outline-none focus:border-[#8B4A28]"
                />
              </div>

              {/* Campus Location */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-xs font-semibold text-[#D4C8BE]">
                  Campus Location / Address
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#7D7068] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="e.g. Innovation Tech Park, Campus A"
                    value={campusLocation}
                    onChange={(e) => setCampusLocation(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#140F0D] border border-[#3A2922] text-xs text-[#FAF7F2] placeholder-[#7D7068] focus:outline-none focus:border-[#8B4A28]"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#D4C8BE]">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
                  className="w-full h-11 px-4 rounded-xl bg-[#140F0D] border border-[#3A2922] text-xs text-[#FAF7F2] focus:outline-none focus:border-[#8B4A28]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: Multiple Degrees */}
          <div className="bg-[#1A1412] border border-[#3A2922] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A1E19]">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#D78B55]" />
                <h2 className="text-sm font-bold text-[#FAF7F2] uppercase tracking-wide">
                  2. Academic Degrees
                </h2>
              </div>
              <span className="text-xs text-[#A89A91]">
                {degrees.length} Degrees configured
              </span>
            </div>

            <p className="text-xs text-[#A89A91]">
              Provide all degree programs offered by this institution (e.g. B.Tech, M.Tech, BCA, MCA).
            </p>

            {/* Quick preset chips */}
            <div>
              <p className="text-[11px] font-semibold text-[#8C7D73] uppercase tracking-wider mb-2">
                Quick Add Presets:
              </p>
              <div className="flex flex-wrap gap-2">
                {degreePresets.map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => handleAddDegree(deg)}
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-[#140F0D] hover:bg-[#2A1E19] border border-[#3A2922] text-[#D4C8BE] hover:text-[#FAF7F2] transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3 h-3 text-[#D78B55]" />
                    {deg}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Degree Input */}
            <div className="flex items-center gap-2 max-w-md">
              <input
                type="text"
                placeholder="Enter custom degree (e.g. B.Arch, MBA)"
                value={customDegree}
                onChange={(e) => setCustomDegree(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDegree(customDegree);
                  }
                }}
                className="flex-1 h-10 px-4 rounded-xl bg-[#140F0D] border border-[#3A2922] text-xs text-[#FAF7F2] placeholder-[#7D7068] focus:outline-none focus:border-[#8B4A28]"
              />
              <button
                type="button"
                onClick={() => handleAddDegree(customDegree)}
                className="h-10 px-4 rounded-xl bg-[#2A1E19] hover:bg-[#3A2922] border border-[#5A321F] text-xs font-semibold text-[#FAF7F2] transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#D78B55]" />
                Add
              </button>
            </div>

            {/* Selected Degrees Badges */}
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-[#8C7D73] uppercase tracking-wider mb-2">
                Assigned Degrees to this College:
              </p>
              <div className="flex flex-wrap gap-2 min-h-10 p-3 rounded-xl bg-[#140F0D] border border-[#2E201B]">
                {degrees.map((deg) => (
                  <span
                    key={deg}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2A1E19] border border-[#5A321F] text-[#F1E5D8] group"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-[#D78B55]" />
                    {deg}
                    <button
                      type="button"
                      onClick={() => handleRemoveDegree(deg)}
                      className="ml-1 p-0.5 rounded-md hover:bg-[#3D251A] text-[#A89A91] hover:text-[#FF8A8A] transition-colors"
                      title="Remove degree"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {degrees.length === 0 && (
                  <span className="text-xs text-[#7D7068] italic self-center">
                    No degrees added yet. Select from presets above.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: Multiple Specializations */}
          <div className="bg-[#1A1412] border border-[#3A2922] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A1E19]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#D78B55]" />
                <h2 className="text-sm font-bold text-[#FAF7F2] uppercase tracking-wide">
                  3. Academic Specializations
                </h2>
              </div>
              <span className="text-xs text-[#A89A91]">
                {specializations.length} Specializations configured
              </span>
            </div>

            <p className="text-xs text-[#A89A91]">
              Provide all academic specializations (e.g. CSE, AI & DS, Cyber Security, IT).
            </p>

            {/* Quick preset chips */}
            <div>
              <p className="text-[11px] font-semibold text-[#8C7D73] uppercase tracking-wider mb-2">
                Quick Add Presets:
              </p>
              <div className="flex flex-wrap gap-2">
                {specPresets.map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => handleAddSpec(spec)}
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-[#140F0D] hover:bg-[#2A1E19] border border-[#3A2922] text-[#D4C8BE] hover:text-[#FAF7F2] transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3 h-3 text-[#D78B55]" />
                    {spec}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Specialization Input */}
            <div className="flex items-center gap-2 max-w-md">
              <input
                type="text"
                placeholder="Enter custom specialization (e.g. Blockchain, IoT)"
                value={customSpec}
                onChange={(e) => setCustomSpec(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSpec(customSpec);
                  }
                }}
                className="flex-1 h-10 px-4 rounded-xl bg-[#140F0D] border border-[#3A2922] text-xs text-[#FAF7F2] placeholder-[#7D7068] focus:outline-none focus:border-[#8B4A28]"
              />
              <button
                type="button"
                onClick={() => handleAddSpec(customSpec)}
                className="h-10 px-4 rounded-xl bg-[#2A1E19] hover:bg-[#3A2922] border border-[#5A321F] text-xs font-semibold text-[#FAF7F2] transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#D78B55]" />
                Add
              </button>
            </div>

            {/* Selected Specializations Badges */}
            <div className="pt-2">
              <p className="text-[11px] font-semibold text-[#8C7D73] uppercase tracking-wider mb-2">
                Assigned Specializations to this College:
              </p>
              <div className="flex flex-wrap gap-2 min-h-10 p-3 rounded-xl bg-[#140F0D] border border-[#2E201B]">
                {specializations.map((spec) => (
                  <span
                    key={spec}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2A1E19] border border-[#5A321F] text-[#F1E5D8]"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#D78B55]" />
                    {spec}
                    <button
                      type="button"
                      onClick={() => handleRemoveSpec(spec)}
                      className="ml-1 p-0.5 rounded-md hover:bg-[#3D251A] text-[#A89A91] hover:text-[#FF8A8A] transition-colors"
                      title="Remove specialization"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {specializations.length === 0 && (
                  <span className="text-xs text-[#7D7068] italic self-center">
                    No specializations added yet. Select from presets above.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 4: Batches & Batch Limits */}
          <div className="bg-[#1A1412] border border-[#3A2922] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A1E19]">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#D78B55]" />
                <h2 className="text-sm font-bold text-[#FAF7F2] uppercase tracking-wide">
                  4. Batches & Student Limits
                </h2>
              </div>
              <span className="text-xs text-[#A89A91]">
                {batches.length} Batches configured
              </span>
            </div>

            <p className="text-xs text-[#A89A91]">
              Specify the limit of all batches (max students allowed per batch) and configure individual batches.
            </p>
            <p className="rounded-lg border border-[#3A2922] bg-[#1A1412] px-3 py-2 text-xs text-[#E7A66D]">
              Batch numbers are global across all colleges. These will be saved as:{' '}
              <strong>
                {academicService
                  .numberBatches(batches, editingCollegeId)
                  .map((b) => b.name)
                  .join(', ')}
              </strong>
            </p>

            {/* Global Limit & Quick Generate */}
            <div className="p-4 rounded-xl bg-[#140F0D] border border-[#2E201B] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-[#D4C8BE]">
                    Default Student Limit Per Batch:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={batchLimit}
                    onChange={(e) => setBatchLimit(Number(e.target.value))}
                    className="w-24 h-9 px-3 rounded-lg bg-[#1C1512] border border-[#3A2922] text-xs font-bold text-[#FAF7F2] text-center focus:outline-none focus:border-[#8B4A28]"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyGlobalLimit(batchLimit)}
                    className="px-3 py-1.5 rounded-lg bg-[#2A1E19] hover:bg-[#3A2922] border border-[#5A321F] text-xs font-medium text-[#FAF7F2] transition-colors"
                  >
                    Apply to All
                  </button>
                </div>

                {/* Quick Generate */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#8C7D73]">Quick Generate:</span>
                  {[2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleQuickGenerateBatches(num)}
                      className="px-2.5 py-1 rounded-md bg-[#1C1512] hover:bg-[#2A1E19] border border-[#3A2922] text-xs font-semibold text-[#D78B55] hover:text-[#FAF7F2] transition-colors"
                    >
                      {num} Batches
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Add Custom Batch */}
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Batch Name (e.g. Batch 4)"
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                className="w-48 h-10 px-4 rounded-xl bg-[#140F0D] border border-[#3A2922] text-xs text-[#FAF7F2] placeholder-[#7D7068] focus:outline-none focus:border-[#8B4A28]"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8C7D73]">Limit:</span>
                <input
                  type="number"
                  min={1}
                  value={newBatchLimit}
                  onChange={(e) => setNewBatchLimit(Number(e.target.value))}
                  className="w-20 h-10 px-3 rounded-xl bg-[#140F0D] border border-[#3A2922] text-xs text-center font-bold text-[#FAF7F2] focus:outline-none focus:border-[#8B4A28]"
                />
              </div>
              <button
                type="button"
                onClick={handleAddBatch}
                className="h-10 px-4 rounded-xl bg-[#2A1E19] hover:bg-[#3A2922] border border-[#5A321F] text-xs font-semibold text-[#FAF7F2] transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#D78B55]" />
                Add Batch
              </button>
            </div>

            {/* Batches Table / Cards */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-[#8C7D73] uppercase tracking-wider mb-2">
                Configured Batches with Limits:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {batches.map((batch) => (
                  <div
                    key={batch.id}
                    className="p-3.5 rounded-xl bg-[#140F0D] border border-[#2E201B] flex items-center justify-between gap-3 shadow-inner"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#2A1E19] border border-[#5A321F] flex items-center justify-center text-[#D78B55]">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#FAF7F2]">
                          {batch.name}
                        </p>
                        <p className="text-[11px] text-[#A89A91]">
                          Max Limit: {batch.studentLimit} students
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={batch.studentLimit}
                        onChange={(e) =>
                          handleUpdateBatchLimit(batch.id, Number(e.target.value))
                        }
                        className="w-16 h-8 px-2 rounded-lg bg-[#1C1512] border border-[#3A2922] text-xs text-center font-bold text-[#D78B55] focus:outline-none focus:border-[#8B4A28]"
                        title="Edit limit"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveBatch(batch.id)}
                        className="p-1.5 rounded-lg hover:bg-[#3D251A] text-[#7D7068] hover:text-[#FF8A8A] transition-colors"
                        title="Remove batch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#3A2922]">
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2.5 rounded-xl bg-[#1A1412] hover:bg-[#2A1E19] border border-[#3A2922] text-xs font-semibold text-[#A89A91] hover:text-[#FAF7F2] transition-colors"
            >
              Reset Form
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#8B4A28] hover:bg-[#A35933] text-xs font-bold text-[#FAF7F2] shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {editingCollegeId
                ? 'Save College Changes'
                : 'Create Academic College'}
            </button>
          </div>
        </form>
      ) : (
        /* REGISTERED COLLEGES DIRECTORY */
        <div className="space-y-6">
          {/* Search bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1A1412] p-4 rounded-xl border border-[#3A2922]">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#7D7068] absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by college name, code, degree, or specialization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg bg-[#140F0D] border border-[#3A2922] text-xs text-[#FAF7F2] placeholder-[#7D7068] focus:outline-none focus:border-[#8B4A28]"
              />
            </div>

            <button
              onClick={() => {
                resetForm();
                setActiveTab('create');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8B4A28] hover:bg-[#A35933] text-xs font-bold text-[#FAF7F2] shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Add New College
            </button>
          </div>

          {/* Colleges List */}
          <div className="grid grid-cols-1 gap-5">
            {filteredColleges.map((college) => (
              <div
                key={college.id}
                className="bg-[#1A1412] border border-[#3A2922] rounded-2xl p-6 shadow-sm hover:border-[#5A321F] transition-all space-y-5"
              >
                {/* College Title Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2A1E19]">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-[#2A1E19] border border-[#5A321F] flex items-center justify-center text-[#D78B55] text-lg font-bold shadow-inner">
                      {college.collegeName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[#FAF7F2]">
                          {college.collegeName}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2A1E19] text-[#D78B55] border border-[#5A321F]">
                          {college.code || 'ID: ' + college.id}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            college.status === 'Active'
                              ? 'bg-[#183321] text-[#7AE39B] border border-[#235833]'
                              : 'bg-[#331C18] text-[#FFA69E] border border-[#542B23]'
                          }`}
                        >
                          {college.status}
                        </span>
                      </div>
                      {college.campusLocation && (
                        <p className="text-xs text-[#A89A91] flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-[#D78B55]" />
                          {college.campusLocation}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() => handleEditCollege(college)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2A1E19] hover:bg-[#3A2922] border border-[#5A321F] text-xs font-semibold text-[#FAF7F2] transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#D78B55]" />
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteCollege(college.id, college.collegeName)
                      }
                      className="p-2 rounded-lg bg-[#2A1E19] hover:bg-[#3D1A1A] border border-[#5A321F] text-[#A89A91] hover:text-[#FF8A8A] transition-colors"
                      title="Delete College"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Badges Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  {/* Degrees */}
                  <div className="bg-[#140F0D] border border-[#2E201B] rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#D4C8BE]">
                      <GraduationCap className="w-3.5 h-3.5 text-[#D78B55]" />
                      Degrees ({college.degrees.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {college.degrees.map((d) => (
                        <span
                          key={d}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#2A1E19] border border-[#4A2D1F] text-[#F1E5D8]"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Specializations */}
                  <div className="bg-[#140F0D] border border-[#2E201B] rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#D4C8BE]">
                      <BookOpen className="w-3.5 h-3.5 text-[#D78B55]" />
                      Specializations ({college.specializations.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {college.specializations.map((s) => (
                        <span
                          key={s}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#2A1E19] border border-[#4A2D1F] text-[#F1E5D8]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Batches with Limits */}
                  <div className="bg-[#140F0D] border border-[#2E201B] rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#D4C8BE]">
                      <Layers className="w-3.5 h-3.5 text-[#D78B55]" />
                      Batches & Limits ({college.batches?.length || 0})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {college.batches?.map((b) => (
                        <span
                          key={b.id}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#2A1E19] border border-[#4A2D1F] text-[#D78B55]"
                        >
                          {b.name}
                          <span className="ml-1 text-[10px] text-[#A89A91]">
                            [{b.studentLimit} max]
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredColleges.length === 0 && (
              <div className="text-center py-12 bg-[#1A1412] border border-[#3A2922] rounded-2xl p-6">
                <AlertCircle className="w-10 h-10 text-[#7D7068] mx-auto mb-3" />
                <p className="text-sm font-semibold text-[#FAF7F2]">
                  No colleges found
                </p>
                <p className="text-xs text-[#A89A91] mt-1">
                  Try adjusting your search criteria or create a new college institution.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default CreateAcademicPage;
