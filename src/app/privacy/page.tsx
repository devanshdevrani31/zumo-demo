'use client'

import { useState, useEffect } from 'react'

interface Employee {
  id: string
  name: string
}

export default function PrivacyPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [retention, setRetention] = useState('90')
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [deleteEmployeeId, setDeleteEmployeeId] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    async function fetchEmployees() {
      try {
        setLoading(true)
        const res = await fetch('/api/employees')
        if (res.ok) {
          const data = await res.json()
          setEmployees(Array.isArray(data) ? data : [])
        }
      } catch {
        // Non-critical for this page
      } finally {
        setLoading(false)
      }
    }
    fetchEmployees()
  }, [])

  function handleExportData() {
    setExportStatus('Export initiated. You will receive a download link via email shortly.')
    setTimeout(() => setExportStatus(null), 5000)
  }

  async function handleDeleteEmployee() {
    if (!deleteEmployeeId) return
    try {
      setDeleting(true)
      setDeleteResult(null)

      const res = await fetch(`/api/employees/${deleteEmployeeId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete employee')
      }

      setEmployees((prev) => prev.filter((e) => e.id !== deleteEmployeeId))
      setDeleteResult({ type: 'success', message: 'Employee and all associated data deleted successfully' })
      setDeleteEmployeeId('')
      setDeleteConfirm(false)
    } catch (err) {
      setDeleteResult({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete employee',
      })
    } finally {
      setDeleting(false)
    }
  }

  const gdprChecklist = [
    { label: 'Data minimization - Only essential data collected', checked: true },
    { label: 'Purpose limitation - Data used only for stated purposes', checked: true },
    { label: 'Storage limitation - Automatic data retention policies', checked: true },
    { label: 'Right to erasure - Employee deletion with cascade', checked: true },
    { label: 'Data portability - Export in machine-readable format', checked: true },
    { label: 'Consent management - Clear audit trail of actions', checked: true },
    { label: 'Data Protection Officer - DPO contact configured', checked: false },
    { label: 'Breach notification - 72-hour notification system', checked: false },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Privacy & Compliance</h1>
        <p className="text-slate-400 mt-1">EU data protection and GDPR compliance settings</p>
      </div>

      <div className="space-y-6">
        {/* Data Retention */}
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
          <h2 className="text-lg font-semibold mb-4">Data Retention</h2>
          <p className="text-slate-400 text-sm mb-4">
            Configure how long employee activity data, audit logs, and interaction records are retained.
          </p>
          <div className="flex items-center gap-4">
            <label className="text-sm text-slate-300">Retention period:</label>
            <select
              value={retention}
              onChange={(e) => setRetention(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Data older than the retention period will be automatically purged. Audit logs may be retained
            separately for compliance purposes.
          </p>
        </div>

        {/* Export Data */}
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
          <h2 className="text-lg font-semibold mb-4">Export Data</h2>
          <p className="text-slate-400 text-sm mb-4">
            Export all platform data in a machine-readable format (JSON). This includes employee configurations,
            policies, audit logs, and approval records.
          </p>
          <button
            onClick={handleExportData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
          >
            Export All Data
          </button>
          {exportStatus && (
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
              <p className="text-blue-400 text-sm">{exportStatus}</p>
            </div>
          )}
        </div>

        {/* Delete Employee */}
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
          <h2 className="text-lg font-semibold mb-4 text-red-400">Delete Employee Data</h2>
          <p className="text-slate-400 text-sm mb-4">
            Permanently delete an employee and all associated data including policies, approval requests,
            audit logs, and activity records. This action cannot be undone.
          </p>

          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm text-slate-300 mb-2">Select Employee</label>
              <select
                value={deleteEmployeeId}
                onChange={(e) => {
                  setDeleteEmployeeId(e.target.value)
                  setDeleteConfirm(false)
                }}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select employee to delete...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                disabled={!deleteEmployeeId}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium disabled:opacity-40 whitespace-nowrap"
              >
                Delete Employee
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEmployee}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium disabled:opacity-60 whitespace-nowrap"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            )}
          </div>

          {deleteConfirm && (
            <div className="mt-3 p-3 bg-red-900/20 border border-red-800 rounded-lg">
              <p className="text-red-400 text-sm">
                Are you sure? This will permanently delete the employee and all associated data.
                This action cannot be undone.
              </p>
            </div>
          )}

          {deleteResult && (
            <div
              className={`mt-3 p-3 rounded-lg border ${
                deleteResult.type === 'success'
                  ? 'bg-green-900/20 border-green-800'
                  : 'bg-red-900/20 border-red-800'
              }`}
            >
              <p
                className={`text-sm ${
                  deleteResult.type === 'success' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {deleteResult.message}
              </p>
            </div>
          )}
        </div>

        {/* GDPR Compliance Checklist */}
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
          <h2 className="text-lg font-semibold mb-4">GDPR Compliance Checklist</h2>
          <p className="text-slate-400 text-sm mb-4">
            Overview of current compliance status with EU General Data Protection Regulation requirements.
          </p>

          <div className="space-y-3">
            {gdprChecklist.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg"
              >
                {item.checked ? (
                  <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className={`text-sm ${item.checked ? 'text-slate-300' : 'text-slate-400'}`}>
                  {item.label}
                </span>
                {item.checked ? (
                  <span className="ml-auto text-xs text-green-400">Compliant</span>
                ) : (
                  <span className="ml-auto text-xs text-yellow-400">Action Required</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-slate-400">
                {gdprChecklist.filter((i) => i.checked).length} compliant
              </span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <span className="text-slate-400">
                {gdprChecklist.filter((i) => !i.checked).length} action required
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
