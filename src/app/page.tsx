'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Employee {
  id: string
  name: string
  role: string
  status: string
}

interface ActivityEvent {
  id: string
  employeeId: string
  employeeName?: string
  action: string
  details: string
  timestamp: string
}

interface DashboardStats {
  totalEmployees: number
  running: number
  pendingApprovals: number
  totalAuditEvents: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    running: 0,
    pendingApprovals: 0,
    totalAuditEvents: 0,
  })
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)
        setError(null)

        const [employeesRes, approvalsRes, auditRes, activityRes] =
          await Promise.allSettled([
            fetch('/api/employees'),
            fetch('/api/approvals'),
            fetch('/api/audit'),
            fetch('/api/simulation?employeeId=all'),
          ])

        let employees: Employee[] = []
        if (employeesRes.status === 'fulfilled' && employeesRes.value.ok) {
          employees = await employeesRes.value.json()
        }

        let pendingApprovals = 0
        if (approvalsRes.status === 'fulfilled' && approvalsRes.value.ok) {
          const approvals = await approvalsRes.value.json()
          pendingApprovals = Array.isArray(approvals)
            ? approvals.filter((a: { status: string }) => a.status === 'pending').length
            : 0
        }

        let totalAuditEvents = 0
        if (auditRes.status === 'fulfilled' && auditRes.value.ok) {
          const auditLogs = await auditRes.value.json()
          totalAuditEvents = Array.isArray(auditLogs) ? auditLogs.length : 0
        }

        let activityData: ActivityEvent[] = []
        if (activityRes.status === 'fulfilled' && activityRes.value.ok) {
          activityData = await activityRes.value.json()
        }

        setStats({
          totalEmployees: employees.length,
          running: employees.filter((e) => e.status === 'running').length,
          pendingApprovals,
          totalAuditEvents,
        })
        setActivity(Array.isArray(activityData) ? activityData.slice(0, 10) : [])
      } catch (err) {
        setError('Failed to load dashboard data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-center max-w-md">
          <p className="text-red-400 text-lg font-medium mb-2">Error</p>
          <p className="text-slate-300">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Total Employees',
      value: stats.totalEmployees,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Running',
      value: stats.running,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'Audit Events',
      value: stats.totalAuditEvents,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-slate-400 mt-1">Overview of your AI employee platform</p>
      </div>

      {/* Hero / Value Proposition */}
      <div className="mb-6 bg-gradient-to-br from-blue-900/30 via-slate-800 to-purple-900/20 rounded-xl border border-slate-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-2">
          The simple, safe, and compliant way to run AI agents
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">
          Deploying agents like OpenClaw and AutoGPT is complex, risky, and a compliance nightmare.
          Zumo takes that away. We simplify deployment, secure it with sandboxed runtimes and policy
          controls, and keep you compliant with the EU AI Act, NIST AI RMF, ISO/IEC 42001, and
          OECD AI Principles.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            'EU AI Act',
            'NIST AI RMF',
            'ISO/IEC 42001',
            'OECD AI Principles',
            'Sandboxed runtimes',
            'Policy enforcement',
            'Audit logging',
            'Human-in-the-loop',
          ].map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 bg-slate-700/60 border border-slate-600 rounded-full text-xs text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Infrastructure Banner */}
      <div className="mb-6 bg-gradient-to-r from-slate-800 via-blue-900/20 to-slate-800 rounded-lg border border-slate-700 p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-slate-300">All systems operational</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              OpenClaw Runtime v2.4
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              Multi-Model Orchestration
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              SHA-256 Audit Chain
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Sandboxed Environments
            </span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-700"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <span className={card.color}>{card.icon}</span>
              </div>
            </div>
            <p className="text-3xl font-bold">{card.value}</p>
            <p className="text-slate-400 text-sm mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-700">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/employees/new"
              className="flex items-center gap-3 w-full p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-left"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Employee
            </Link>
            <Link
              href="/approvals"
              className="flex items-center gap-3 w-full p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-left"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View Approvals
              {stats.pendingApprovals > 0 && (
                <span className="ml-auto bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                  {stats.pendingApprovals}
                </span>
              )}
            </Link>
            <Link
              href="/orchestration"
              className="flex items-center gap-3 w-full p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-left"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Run Demo
            </Link>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-700">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          {activity.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400">No recent activity</p>
              <p className="text-slate-500 text-sm mt-1">
                Activity will appear here when employees start working
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {activity.map((event, index) => (
                <div
                  key={event.id || index}
                  className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg"
                >
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium text-blue-400">
                        {event.employeeName || event.employeeId}
                      </span>{' '}
                      {event.action}
                    </p>
                    {event.details && (
                      <p className="text-xs text-slate-400 mt-1 truncate">
                        {event.details}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
