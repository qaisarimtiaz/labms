'use client';

import { useState, useEffect } from 'react';
import { getParameterTemplate } from '@/lib/testParameterTemplates';
import { getReportFormat } from '@/lib/reportFormats';

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
  parameters: TemplateParameter[];
}

interface TestOrder {
  _id: string;
  orderNumber: string;
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    patientId: string;
    email: string;
  };
  tests: {
    _id: string;
    code: string;
    name: string;
    normalRange?: string;
    sampleType?: string;
    reportFormat?: string;
  }[];
  orderStatus: 'pending' | 'confirmed' | 'in_progress' | 'partially_reported' | 'completed' | 'cancelled';
  priority: 'normal' | 'urgent' | 'stat';
  createdAt: string;
}

interface ResultData {
  parameter: string;
  value: string;
  unit?: string;
  normalRange?: string;
  flag?: 'normal' | 'high' | 'low' | 'critical';
}

interface TestResult {
  _id?: string;
  testOrder: string;
  test: string;
  patient: string;
  resultData: ResultData[];
  overallStatus: 'normal' | 'abnormal' | 'critical';
  comments: string;
}

export default function ResultEntry() {
  const [inProgressOrders, setInProgressOrders] = useState<TestOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<TestOrder | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestOrder['tests'][0] | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<TestTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [resultForm, setResultForm] = useState<TestResult>({
    testOrder: '',
    test: '',
    patient: '',
    resultData: [{ parameter: '', value: '', unit: '', normalRange: '', flag: 'normal' }],
    overallStatus: 'normal',
    comments: ''
  });

  useEffect(() => {
    fetchInProgressOrders();
  }, []);

  const fetchInProgressOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/orders?orderStatus=in_progress,partially_reported&limit=50');
      if (response.ok) {
        const data = await response.json();
        setInProgressOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching in-progress orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectOrderAndTest = async (order: TestOrder, test: TestOrder['tests'][0]) => {
    setSelectedOrder(order);
    setSelectedTest(test);
    setActiveTemplate(null);

    // 1. Try to fetch a DB-backed template for this test
    let dbTemplate: TestTemplate | null = null;
    try {
      const res = await fetch(`/api/lab/template?testId=${test._id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.template && data.template.parameters?.length > 0) {
          dbTemplate = data.template;
          setActiveTemplate(data.template);
        }
      }
    } catch (err) {
      console.error('Error fetching template:', err);
    }

    // 2. Build default parameter rows — DB template takes priority, then static, then blank
    let defaultParameters: ResultData[];

    if (dbTemplate) {
      const sorted = [...dbTemplate.parameters].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      defaultParameters = sorted.map((p) => ({
        parameter: p.name,
        value: '',
        unit: p.unit || '',
        normalRange: p.referenceRange || '',
        flag: 'normal' as const
      }));
    } else {
      const formatType = getReportFormat(test.reportFormat);
      const staticParams = getParameterTemplate(formatType);
      defaultParameters = staticParams.length > 0
        ? staticParams.map((p) => ({
            parameter: p.parameter,
            value: '',
            unit: p.unit || '',
            normalRange: p.normalRange || '',
            flag: 'normal' as const
          }))
        : [{
            parameter: test.name || 'Test Result',
            value: '',
            unit: '',
            normalRange: test.normalRange || '',
            flag: 'normal' as const
          }];
    }

    // 3. Check if a result already exists for this test+order
    try {
      const res = await fetch(`/api/results?testOrderId=${order._id}&test=${test._id}`);
      if (res.ok) {
        const data = await res.json();
        const existing = data.results?.[0];
        setResultForm({
          testOrder: order._id,
          test: test._id,
          patient: order.patient._id,
          resultData: existing?.resultData?.length > 0 ? existing.resultData : defaultParameters,
          overallStatus: existing?.overallStatus || 'normal',
          comments: existing?.comments || ''
        });
        return;
      }
    } catch (err) {
      console.error('Error checking existing result:', err);
    }

    setResultForm({
      testOrder: order._id,
      test: test._id,
      patient: order.patient._id,
      resultData: defaultParameters,
      overallStatus: 'normal',
      comments: ''
    });
  };

  // Only used when no DB template is active (free-form mode)
  const addResultParameter = () => {
    setResultForm((prev) => ({
      ...prev,
      resultData: [...prev.resultData, { parameter: '', value: '', unit: '', normalRange: '', flag: 'normal' }]
    }));
  };

  const removeResultParameter = (index: number) => {
    if (resultForm.resultData.length > 1) {
      setResultForm((prev) => ({
        ...prev,
        resultData: prev.resultData.filter((_, i) => i !== index)
      }));
    }
  };

  const updateResultValue = (index: number, value: string) => {
    const updated = [...resultForm.resultData];
    updated[index] = { ...updated[index], value };

    // Auto-flag based on min/max if DB template is active
    if (activeTemplate) {
      const sorted = [...activeTemplate.parameters].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      const templateParam = sorted[index];
      if (templateParam) {
        const num = parseFloat(value);
        const min = parseFloat(templateParam.minReferenceRange);
        const max = parseFloat(templateParam.maxReferenceRange);
        if (!isNaN(num) && !isNaN(min) && !isNaN(max)) {
          updated[index].flag = num < min ? 'low' : num > max ? 'high' : 'normal';
        }
      }
    }

    setResultForm((prev) => ({ ...prev, resultData: updated }));
  };

  const updateResultParameter = (index: number, field: keyof ResultData, value: string) => {
    const updated = [...resultForm.resultData];
    updated[index] = { ...updated[index], [field]: value };
    setResultForm((prev) => ({ ...prev, resultData: updated }));
  };

  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedTest) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...resultForm,
          resultData: resultForm.resultData.filter((item) => item.parameter && item.value)
        })
      });

      if (response.ok) {
        // Let the order status reflect however many of its tests now have a
        // result, instead of leaving it stuck — this test alone shouldn't
        // close the order, but it also shouldn't leave a fully-reported
        // order sitting in in_progress forever.
        await fetch(`/api/orders/${selectedOrder._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recomputeStatus: true })
        });

        alert('Test result submitted successfully');
        clearForm();
        fetchInProgressOrders();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit result');
      }
    } catch (error) {
      console.error('Error submitting result:', error);
      alert('Error submitting result');
    } finally {
      setSubmitting(false);
    }
  };

  const clearForm = () => {
    setSelectedOrder(null);
    setSelectedTest(null);
    setActiveTemplate(null);
    setResultForm({
      testOrder: '',
      test: '',
      patient: '',
      resultData: [{ parameter: '', value: '', unit: '', normalRange: '', flag: 'normal' }],
      overallStatus: 'normal',
      comments: ''
    });
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      stat: 'text-red-600 bg-red-100',
      urgent: 'text-orange-600 bg-orange-100',
      normal: 'text-gray-600 bg-gray-100'
    };
    return colors[priority] || 'text-gray-600 bg-gray-100';
  };

  const getFlagColor = (flag?: string) => {
    const colors: Record<string, string> = {
      high: 'text-red-600',
      low: 'text-blue-600',
      critical: 'text-red-800 font-bold',
      normal: 'text-green-600'
    };
    return colors[flag || 'normal'] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
              ))}
            </div>
            <div className="bg-gray-200 rounded-lg h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="bg-muted/30 px-6 py-6 border-b border-border">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-1">Result Entry</h3>
            <p className="text-sm text-muted-foreground">Enter structured test results for in-progress orders</p>
          </div>
          <button
            onClick={fetchInProgressOrders}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <svg className="w-4 h-4 mr-1.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left — Orders List */}
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-4">In-Progress Orders</h4>

            {inProgressOrders.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No orders in progress</h3>
                <p className="text-sm text-gray-500">Start processing orders from the Work Queue first.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {inProgressOrders.map((order) => (
                  <div key={order._id} className="bg-white rounded-lg shadow border p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h5 className="font-semibold text-gray-900">#{order.orderNumber}</h5>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                            {order.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {order.patient.firstName} {order.patient.lastName}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Tests to Complete:</p>
                      <div className="grid gap-2">
                        {order.tests.map((test) => (
                          <button
                            key={test._id}
                            onClick={() => selectOrderAndTest(order, test)}
                            className={`p-3 text-left rounded-lg border transition-all duration-200 ${
                              selectedOrder?._id === order._id && selectedTest?._id === test._id
                                ? 'bg-blue-50 border-blue-500 shadow-md'
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-sm font-medium text-gray-900">{test.name}</div>
                            <div className="text-xs text-gray-500">{test.code}</div>
                            {test.normalRange && (
                              <div className="text-xs text-gray-400 mt-1">Normal: {test.normalRange}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right — Result Entry Form */}
          <div>
            <h4 className="text-lg font-semibold text-foreground mb-4">Result Entry Form</h4>

            {!selectedOrder || !selectedTest ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-sm font-medium text-gray-900 mb-1">Select a test to enter results</h3>
                <p className="text-sm text-gray-500">Choose an order and test from the left panel to begin entering results.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitResult} className="bg-white rounded-lg shadow border p-6">
                {/* Test Info Header */}
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-medium">Patient:</span> {selectedOrder.patient.firstName} {selectedOrder.patient.lastName}</div>
                    <div><span className="font-medium">Order:</span> #{selectedOrder.orderNumber}</div>
                    <div><span className="font-medium">Test:</span> {selectedTest.name}</div>
                    <div><span className="font-medium">Code:</span> {selectedTest.code}</div>
                  </div>
                </div>

                {/* Template badge */}
                {activeTemplate && (
                  <div className="mb-4 flex items-center space-x-2 text-xs">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Template: {activeTemplate.templateName}
                    </span>
                    <span className="text-gray-400">Parameters are pre-filled — enter values only</span>
                  </div>
                )}

                {/* Parameters */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">Test Parameters</label>
                    {!activeTemplate && (
                      <button
                        type="button"
                        onClick={addResultParameter}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        + Add Parameter
                      </button>
                    )}
                  </div>

                  {/* Column headers */}
                  <div className={`grid gap-2 mb-1 px-3 text-xs font-semibold text-gray-500 uppercase ${activeTemplate ? 'grid-cols-10' : 'grid-cols-11'}`}>
                    <div className="col-span-3">Parameter</div>
                    <div className="col-span-2">Result *</div>
                    <div className="col-span-2">Unit</div>
                    <div className="col-span-2">Ref. Range</div>
                    <div className="col-span-1">Flag</div>
                    {!activeTemplate && <div className="col-span-1"></div>}
                  </div>

                  <div className="space-y-2">
                    {resultForm.resultData.map((param, index) => (
                      <div
                        key={index}
                        className={`grid gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-200 ${activeTemplate ? 'grid-cols-10' : 'grid-cols-11'}`}
                      >
                        {/* Parameter name — read-only if template active */}
                        <div className="col-span-3">
                          {activeTemplate ? (
                            <span className="block text-sm font-medium text-gray-800 px-1 py-1 truncate" title={param.parameter}>
                              {param.parameter}
                            </span>
                          ) : (
                            <input
                              type="text"
                              placeholder="Parameter"
                              value={param.parameter}
                              onChange={(e) => updateResultParameter(index, 'parameter', e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              required
                            />
                          )}
                        </div>

                        {/* Value — always editable */}
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Value"
                            value={param.value}
                            onChange={(e) => updateResultValue(index, e.target.value)}
                            className={`w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium ${
                              param.flag === 'high' || param.flag === 'critical'
                                ? 'border-red-300 bg-red-50'
                                : param.flag === 'low'
                                ? 'border-blue-300 bg-blue-50'
                                : 'border-gray-300'
                            }`}
                            required
                          />
                        </div>

                        {/* Unit — read-only if template active */}
                        <div className="col-span-2">
                          {activeTemplate ? (
                            <span className="block text-sm text-gray-600 px-1 py-1 truncate">{param.unit || '—'}</span>
                          ) : (
                            <input
                              type="text"
                              placeholder="Unit"
                              value={param.unit}
                              onChange={(e) => updateResultParameter(index, 'unit', e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          )}
                        </div>

                        {/* Reference Range — read-only if template active */}
                        <div className="col-span-2">
                          {activeTemplate ? (
                            <span className="block text-sm text-gray-600 px-1 py-1 truncate">{param.normalRange || '—'}</span>
                          ) : (
                            <input
                              type="text"
                              placeholder="Ref. Range"
                              value={param.normalRange}
                              onChange={(e) => updateResultParameter(index, 'normalRange', e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          )}
                        </div>

                        {/* Flag */}
                        <div className="col-span-1">
                          <select
                            value={param.flag || 'normal'}
                            onChange={(e) => updateResultParameter(index, 'flag', e.target.value)}
                            className={`w-full border border-gray-200 rounded px-1 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 ${getFlagColor(param.flag)}`}
                          >
                            <option value="normal">N</option>
                            <option value="high">H</option>
                            <option value="low">L</option>
                            <option value="critical">C</option>
                          </select>
                        </div>

                        {/* Remove button — only in free-form mode */}
                        {!activeTemplate && (
                          <div className="col-span-1 flex justify-center">
                            {resultForm.resultData.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeResultParameter(index)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Overall Status */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Overall Status</label>
                  <select
                    value={resultForm.overallStatus}
                    onChange={(e) => setResultForm({ ...resultForm, overallStatus: e.target.value as 'normal' | 'abnormal' | 'critical' })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="abnormal">Abnormal</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                {/* Comments */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Comments & Observations</label>
                  <textarea
                    value={resultForm.comments}
                    onChange={(e) => setResultForm({ ...resultForm, comments: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional comments, observations, or technical notes..."
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={clearForm}
                    disabled={submitting}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors duration-200"
                  >
                    Clear Form
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !resultForm.resultData.some((p) => p.parameter && p.value)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Submitting...
                      </span>
                    ) : (
                      'Submit Result'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
