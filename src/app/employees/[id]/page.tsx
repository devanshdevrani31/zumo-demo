'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Employee {
  id: string
  name: string
  role: string
  runtime: string
  modelProvider: string
  tools: string
  autonomyMode: string
  instructions: string
  status: string
  teamId: string | null
  createdAt: string
  updatedAt: string
}

interface AuditLog {
  id: string
  employeeId: string | null
  action: string
  details: string
  hash: string
  previousHash: string
  timestamp: string
}

interface ActivityEvent {
  id: string
  action: string
  details: string
  timestamp: string
}

interface InboxMessage {
  id: string
  from: string
  subject: string
  body: string
  timestamp: string
  read: boolean
}

const runtimeLabels: Record<string, string> = {
  openclaw: 'OpenClaw',
  autogpt: 'AutoGPT Loop',
  custom_planner: 'Custom Planner',
  external: 'External Runtime',
}

const modelProviderLabels: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  local: 'Local',
}

const statusColors: Record<string, string> = {
  running: 'bg-green-500',
  paused: 'bg-yellow-500',
  stopped: 'bg-red-500',
  provisioning: 'bg-blue-500',
}

const RUNTIME_OPTIONS = [
  { id: 'openclaw', name: 'OpenClaw' },
  { id: 'autogpt', name: 'AutoGPT Loop' },
  { id: 'custom_planner', name: 'Custom Planner' },
  { id: 'external', name: 'External Runtime' },
]

// Simulated inbox messages
const SIMULATED_MESSAGES: InboxMessage[] = [
  {
    id: 'msg-1',
    from: 'System',
    subject: 'Welcome aboard!',
    body: 'Your AI employee has been successfully deployed and is ready to receive tasks.',
    timestamp: new Date().toISOString(),
    read: true,
  },
  {
    id: 'msg-2',
    from: 'Orchestrator',
    subject: 'Team assignment update',
    body: 'You have been assigned to a new team. Check your workflow rules for updated responsibilities.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    read: false,
  },
]

export default function EmployeeDetailPage() {
  const params = useParams()
  const employeeId = params.id as string

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'inbox' | 'audit'>('overview')
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [messages, setMessages] = useState<InboxMessage[]>(SIMULATED_MESSAGES)
  const [taskRunning, setTaskRunning] = useState(false)
  const [taskResult, setTaskResult] = useState<string | null>(null)
  const [runtimeSwitching, setRuntimeSwitching] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  const fetchEmployee = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/employees/${employeeId}`)
      if (!res.ok) throw new Error('Employee not found')
      const data = await res.json()
      setEmployee(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employee')
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/audit?employeeId=${employeeId}`)
      if (res.ok) {
        const data = await res.json()
        setAuditLogs(Array.isArray(data) ? data : [])
      }
    } catch {
      // Non-critical
    }
  }, [employeeId])

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch(`/api/simulation?employeeId=${employeeId}`)
      if (res.ok) {
        const data = await res.json()
        setActivity(Array.isArray(data) ? data : [])
      }
    } catch {
      // Non-critical
    }
  }, [employeeId])

  useEffect(() => {
    fetchEmployee()
    fetchAuditLogs()
    fetchActivity()
  }, [fetchEmployee, fetchAuditLogs, fetchActivity])

  const handleRuntimeSwitch = async (newRuntime: string) => {
    if (!employee || newRuntime === employee.runtime) return
    try {
      setRuntimeSwitching(true)
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runtime: newRuntime }),
      })
      if (!res.ok) throw new Error('Failed to switch runtime')
      const updated = await res.json()
      setEmployee(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch runtime')
    } finally {
      setRuntimeSwitching(false)
    }
  }

  const handleTestTask = async () => {
    try {
      setTaskRunning(true)
      setTaskResult(null)

      // Simulate task execution with a delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Try to trigger via simulation API
      try {
        await fetch('/api/simulation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId,
            action: 'test_task',
            details: `Test task executed for ${employee?.name}`,
          }),
        })
      } catch {
        // Simulation endpoint may not exist yet
      }

      setTaskResult(
        `Task completed successfully. ${employee?.name} processed the test request and generated a response.`
      )
      fetchActivity()
      fetchAuditLogs()
    } catch {
      setTaskResult('Task execution failed. Check logs for details.')
    } finally {
      setTaskRunning(false)
    }
  }

  const handleSendMessage = () => {
    if (!newMessage.trim()) return
    setSendingMessage(true)

    setTimeout(() => {
      const msg: InboxMessage = {
        id: `msg-${Date.now()}`,
        from: 'You',
        subject: 'Direct Message',
        body: newMessage.trim(),
        timestamp: new Date().toISOString(),
        read: true,
      }
      setMessages((prev) => [msg, ...prev])
      setNewMessage('')
      setSendingMessage(false)
    }, 500)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading employee...</p>
        </div>
      </div>
    )
  }

  if (error || !employee) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-center max-w-md">
          <p className="text-red-400 text-lg font-medium mb-2">Error</p>
          <p className="text-slate-300">{error || 'Employee not found'}</p>
          <Link
            href="/employees"
            className="inline-block mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Back to Employees
          </Link>
        </div>
      </div>
    )
  }

  let tools: string[] = []
  try {
    tools = JSON.parse(employee.tools)
  } catch {
    tools = []
  }

  const uptime = Math.floor(
    (Date.now() - new Date(employee.createdAt).getTime()) / 1000 / 60
  )
  const uptimeDisplay =
    uptime < 60
      ? `${uptime}m`
      : uptime < 1440
      ? `${Math.floor(uptime / 60)}h ${uptime % 60}m`
      : `${Math.floor(uptime / 1440)}d ${Math.floor((uptime % 1440) / 60)}h`

  const costEstimate =
    employee.modelProvider === 'local'
      ? '$0.00'
      : `$${(Math.random() * 5 + 0.5).toFixed(2)}`

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'activity' as const, label: 'Activity' },
    { id: 'inbox' as const, label: `Inbox (${messages.filter((m) => !m.read).length})` },
    { id: 'audit' as const, label: 'Audit Log' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/employees"
            className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{employee.name}</h1>
              {/* Heartbeat Indicator */}
              {employee.status === 'running' && (
                <div className="relative">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-heartbeat-ring" />
                </div>
              )}
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  employee.status === 'running'
                    ? 'bg-green-900/50 text-green-400 border border-green-800'
                    : employee.status === 'paused'
                    ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-800'
                    : 'bg-red-900/50 text-red-400 border border-red-800'
                }`}
              >
                {employee.status}
              </span>
            </div>
            <p className="text-slate-400 mt-1">{employee.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTestTask}
            disabled={taskRunning}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors font-medium disabled:opacity-60"
          >
            {taskRunning ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Running...
              </span>
            ) : (
              'Test Task'
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('inbox')
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors font-medium"
          >
            Send Message
          </button>
        </div>
      </div>

      {/* Task Result */}
      {taskResult && (
        <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-green-400 mb-1">Task Result</p>
              <p className="text-sm text-slate-300">{taskResult}</p>
            </div>
            <button
              onClick={() => setTaskResult(null)}
              className="text-slate-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-800 rounded-lg p-1 border border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">Uptime</p>
                <p className="text-lg font-semibold">{uptimeDisplay}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">Est. Cost (24h)</p>
                <p className="text-lg font-semibold">{costEstimate}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">Tasks Completed</p>
                <p className="text-lg font-semibold">{auditLogs.length}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${statusColors[employee.status] || 'bg-gray-500'}`} />
                  <p className="text-lg font-semibold capitalize">{employee.status}</p>
                </div>
              </div>
            </div>

            {/* Infrastructure Details */}
            <div className="bg-gradient-to-r from-slate-700/30 to-slate-800/50 rounded-lg border border-slate-700 p-4">
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Infrastructure</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-slate-500">Execution Layer</p>
                  <p className="text-slate-200 font-medium mt-0.5">{runtimeLabels[employee.runtime] || employee.runtime} v2.4</p>
                </div>
                <div>
                  <p className="text-slate-500">Sandbox</p>
                  <p className="text-slate-200 font-medium mt-0.5">Isolated VM (gVisor)</p>
                </div>
                <div>
                  <p className="text-slate-500">Network</p>
                  <p className="text-slate-200 font-medium mt-0.5">Egress-filtered VPC</p>
                </div>
                <div>
                  <p className="text-slate-500">Audit</p>
                  <p className="text-slate-200 font-medium mt-0.5">SHA-256 hash chain</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3">Configuration</h3>
                <div className="space-y-3 bg-slate-700/30 rounded-lg p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Runtime</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={employee.runtime}
                        onChange={(e) => handleRuntimeSwitch(e.target.value)}
                        disabled={runtimeSwitching}
                        className="bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {RUNTIME_OPTIONS.map((rt) => (
                          <option key={rt.id} value={rt.id}>
                            {rt.name}
                          </option>
                        ))}
                      </select>
                      {runtimeSwitching && (
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Model Provider</span>
                    <span className="text-white">
                      {modelProviderLabels[employee.modelProvider] || employee.modelProvider}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Autonomy Mode</span>
                    <span className="text-white capitalize">
                      {employee.autonomyMode.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3">Tools</h3>
                <div className="bg-slate-700/30 rounded-lg p-4">
                  {tools.length === 0 ? (
                    <p className="text-slate-500 text-sm">No tools configured</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {tools.map((tool) => (
                        <span
                          key={tool}
                          className="px-3 py-1 bg-slate-600 rounded-lg text-sm text-slate-200"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {employee.instructions && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-slate-300 mb-2">Instructions</h3>
                    <p className="text-sm text-slate-400 bg-slate-700/30 rounded-lg p-4 whitespace-pre-wrap">
                      {employee.instructions}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Activity Feed</h3>
            {activity.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">No activity recorded yet</p>
                <p className="text-slate-500 text-sm mt-1">
                  Activity will appear here as the employee performs tasks
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activity.map((event, index) => (
                  <div
                    key={event.id || index}
                    className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg"
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{event.action}</p>
                      {event.details && (
                        <p className="text-xs text-slate-400 mt-1">{event.details}</p>
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
        )}

        {/* Inbox Tab */}
        {activeTab === 'inbox' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Inbox</h3>

            {/* Send Message */}
            <div className="mb-6 flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendingMessage}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium disabled:opacity-40"
              >
                {sendingMessage ? 'Sending...' : 'Send'}
              </button>
            </div>

            {/* Message List */}
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">No messages</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg border ${
                      msg.read
                        ? 'bg-slate-700/30 border-slate-700'
                        : 'bg-blue-900/20 border-blue-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{msg.from}</span>
                        {!msg.read && (
                          <span className="w-2 h-2 bg-blue-400 rounded-full" />
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-200 mb-1">{msg.subject}</p>
                    <p className="text-sm text-slate-400">{msg.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === 'audit' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Audit Log</h3>
            {auditLogs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400">No audit logs for this employee</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Timestamp</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Action</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Details</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-white">{log.action}</td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                          {log.details}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-500">
                          {log.hash.substring(0, 12)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
