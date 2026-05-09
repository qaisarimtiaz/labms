'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/ui/Modal';

interface TemplateParameter {
  _id?: string;
  name: string;
  unit: string;
  referenceRange: string;
  minReferenceRange: string;
  maxReferenceRange: string;
  sequenceOrder: number;
}

interface TestTemplate {
  _id: string;
  templateName: string;
  category: string;
  parameters: TemplateParameter[];
  isActive: boolean;
  createdAt: string;
}

const EMPTY_PARAMETER: TemplateParameter = {
  name: '',
  unit: '',
  referenceRange: '',
  minReferenceRange: '',
  maxReferenceRange: '',
  sequenceOrder: 0
};

export default function TemplateManagement() {
  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TestTemplate | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({ templateName: '', category: '' });
  const [parameters, setParameters] = useState<TemplateParameter[]>([{ ...EMPTY_PARAMETER }]);

  const fetchTemplates = useCallback(async (search = searchTerm) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const response = await fetch(`/api/admin/templates?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => { fetchTemplates(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timeout = setTimeout(() => fetchTemplates(searchTerm), 400);
    return () => clearTimeout(timeout);
  }, [searchTerm, fetchTemplates]);

  const resetForm = () => {
    setForm({ templateName: '', category: '' });
    setParameters([{ ...EMPTY_PARAMETER }]);
    setEditingTemplate(null);
    setError('');
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (template: TestTemplate) => {
    setEditingTemplate(template);
    setForm({ templateName: template.templateName, category: template.category });
    const sorted = [...template.parameters].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    setParameters(sorted.length > 0 ? sorted : [{ ...EMPTY_PARAMETER }]);
    setShowModal(true);
  };

  const addParameter = () => {
    setParameters(prev => [
      ...prev,
      { ...EMPTY_PARAMETER, sequenceOrder: prev.length }
    ]);
  };

  const removeParameter = (index: number) => {
    if (parameters.length <= 1) return;
    setParameters(prev =>
      prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, sequenceOrder: i }))
    );
  };

  const updateParameter = (index: number, field: keyof TemplateParameter, value: string) => {
    setParameters(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const moveParameter = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= parameters.length) return;
    setParameters(prev => {
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated.map((p, i) => ({ ...p, sequenceOrder: i }));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.templateName.trim()) {
      setError('Template name is required');
      return;
    }
    const validParams = parameters.filter(p => p.name.trim());
    if (validParams.length === 0) {
      setError('At least one parameter with a name is required');
      return;
    }

    setSubmitting(true);
    try {
      const url = editingTemplate
        ? `/api/admin/templates/${editingTemplate._id}`
        : '/api/admin/templates';
      const method = editingTemplate ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: form.templateName.trim(),
          category: form.category.trim(),
          parameters: validParams.map((p, i) => ({ ...p, sequenceOrder: i }))
        })
      });

      if (response.ok) {
        setSuccess(editingTemplate ? 'Template updated successfully!' : 'Template created successfully!');
        setShowModal(false);
        resetForm();
        fetchTemplates();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save template');
      }
    } catch {
      setError('Error saving template');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteTemplate = async (template: TestTemplate) => {
    if (!confirm(`Delete "${template.templateName}"? This will also unlink it from any tests that use it.`)) return;
    try {
      const response = await fetch(`/api/admin/templates/${template._id}`, { method: 'DELETE' });
      if (response.ok) {
        setSuccess('Template deleted successfully!');
        if (expandedId === template._id) setExpandedId(null);
        fetchTemplates();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to delete template');
      }
    } catch {
      setError('Error deleting template');
    }
  };

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="bg-muted/30 px-6 py-6 border-b border-border">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Test Templates</h3>
            <p className="text-sm text-gray-600">Define parameter structures for lab tests</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={openCreate}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:outline-none shadow-lg transition-all duration-200 hover:shadow-xl"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Template
            </button>
            <button
              onClick={() => fetchTemplates()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          </div>
        )}
        {success && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {success}
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-6 py-4 bg-white/50 border-b border-gray-200">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-sm font-medium text-gray-900 mb-1">No templates found</h3>
          <p className="text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search.' : 'Create your first template to get started.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 bg-white">
          {templates.map((template) => (
            <div key={template._id} className="hover:bg-blue-50/30 transition-colors duration-150">
              {/* Row */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4 min-w-0">
                  <button
                    onClick={() => setExpandedId(expandedId === template._id ? null : template._id)}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg
                      className={`w-5 h-5 transition-transform duration-200 ${expandedId === template._id ? 'rotate-90' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900">{template.templateName}</span>
                      {!template.isActive && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">Inactive</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 mt-0.5">
                      {template.category && (
                        <span className="text-xs text-blue-600 font-medium">{template.category}</span>
                      )}
                      <span className="text-xs text-gray-400">{template.parameters.length} parameter{template.parameters.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(template)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-sm transition-all duration-200"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTemplate(template)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-sm transition-all duration-200"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>

              {/* Expanded parameters preview */}
              {expandedId === template._id && (
                <div className="px-6 pb-4">
                  <div className="ml-9 overflow-x-auto">
                    <table className="min-w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600 w-8">#</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Parameter</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Unit</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Reference Range</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {[...template.parameters]
                          .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
                          .map((param, idx) => (
                            <tr key={param._id || idx}>
                              <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                              <td className="px-3 py-2 font-medium text-gray-800">{param.name}</td>
                              <td className="px-3 py-2 text-gray-500">{param.unit || '—'}</td>
                              <td className="px-3 py-2 text-gray-500">{param.referenceRange || '—'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stats footer */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
        <span className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{templates.length}</span> template{templates.length !== 1 ? 's' : ''}
          {searchTerm && <span className="text-blue-600 ml-2">(filtered by &quot;{searchTerm}&quot;)</span>}
        </span>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingTemplate ? `Edit — ${editingTemplate.templateName}` : 'New Test Template'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Template info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Template Name *</label>
              <input
                type="text"
                value={form.templateName}
                onChange={(e) => setForm({ ...form, templateName: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., CBC Report"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">— None —</option>
                <option value="BIO-CHEMISTRY">BIO-CHEMISTRY</option>
                <option value="HEAMATOLOGY">HEAMATOLOGY</option>
                <option value="HISTO PATHOLOGY">HISTO PATHOLOGY</option>
                <option value="IMMUNOLOGY">IMMUNOLOGY</option>
                <option value="MICRO BIOLOGY">MICRO BIOLOGY</option>
                <option value="PARASITOLOGY">PARASITOLOGY</option>
                <option value="MOLECULAR DEPT">MOLECULAR DEPT</option>
              </select>
            </div>
          </div>

          {/* Parameters */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-medium text-gray-700">
                Parameters <span className="text-gray-400 font-normal">({parameters.filter(p => p.name.trim()).length} defined)</span>
              </label>
              <button
                type="button"
                onClick={addParameter}
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Row
              </button>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Column headers */}
              <div className="grid grid-cols-12 gap-0 bg-gray-50 border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <div className="col-span-1 text-center">Order</div>
                <div className="col-span-3 pl-2">Parameter Name *</div>
                <div className="col-span-2 pl-2">Unit</div>
                <div className="col-span-3 pl-2">Reference Range</div>
                <div className="col-span-1 pl-2">Min</div>
                <div className="col-span-1 pl-2">Max</div>
                <div className="col-span-1"></div>
              </div>

              <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {parameters.map((param, index) => (
                  <div key={index} className="grid grid-cols-12 gap-0 items-center px-3 py-2 hover:bg-gray-50">
                    {/* Reorder arrows */}
                    <div className="col-span-1 flex flex-col items-center space-y-0.5">
                      <button
                        type="button"
                        onClick={() => moveParameter(index, 'up')}
                        disabled={index === 0}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <span className="text-xs text-gray-400 leading-none">{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => moveParameter(index, 'down')}
                        disabled={index === parameters.length - 1}
                        className="text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    <div className="col-span-3 pr-1">
                      <input
                        type="text"
                        placeholder="e.g., Hemoglobin"
                        value={param.name}
                        onChange={(e) => updateParameter(index, 'name', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-2 px-1">
                      <input
                        type="text"
                        placeholder="e.g., g/dL"
                        value={param.unit}
                        onChange={(e) => updateParameter(index, 'unit', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-3 px-1">
                      <input
                        type="text"
                        placeholder="e.g., 13.5–17.5"
                        value={param.referenceRange}
                        onChange={(e) => updateParameter(index, 'referenceRange', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-1 px-1">
                      <input
                        type="text"
                        placeholder="13.5"
                        value={param.minReferenceRange}
                        onChange={(e) => updateParameter(index, 'minReferenceRange', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-1 px-1">
                      <input
                        type="text"
                        placeholder="17.5"
                        value={param.maxReferenceRange}
                        onChange={(e) => updateParameter(index, 'maxReferenceRange', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => removeParameter(index)}
                        disabled={parameters.length <= 1}
                        className="text-red-400 hover:text-red-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Use Min/Max for numeric ranges (powers auto-flagging). Reference Range is the display string shown on the report.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowModal(false); resetForm(); }}
              className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                editingTemplate ? 'Update Template' : 'Create Template'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
