'use client'

import { useEffect, useState } from 'react'

interface Employee {
  id: string
  name: string
  role: string
  status: string
}

interface WorkflowRule {
  id: string
  teamId: string
  trigger: string
  steps: string
}

interface Team {
  id: string
  name: string
  description: string
  employees: Employee[]
  workflowRules: WorkflowRule[]
}

interface TimelineStep {
  id: number
  title: string
  agent: string
  description: string
  status: 'pending' | 'active' | 'completed'
  timestamp?: string
}

const DEMO_TIMELINE: TimelineStep[] = [
  {
    id: 1,
    title: 'Customer Complaint Received',
    agent: 'System',
    description: 'Incoming complaint detected via Slack integration: "App crashes on login page"',
    status: 'pending',
  },
  {
    id: 2,
    title: 'Support Agent Picks Up',
    agent: 'Support Agent',
    description: 'Triages the issue, categorizes as high-priority bug, acknowledges customer',
    status: 'pending',
  },
  {
    id: 3,
    title: 'Developer Agent Investigates',
    agent: 'Developer',
    description: 'Pulls Sentry logs, identifies null pointer exception in auth module, creates fix branch',
    status: 'pending',
  },
  {
    id: 4,
    title: 'Fix Applied & Tested',
    agent: 'Developer',
    description: 'Commits fix, runs test suite (47/47 passing), opens PR for review',
    status: 'pending',
  },
  {
    id: 5,
    title: 'Reply to Customer',
    agent: 'Support Agent',
    description: 'Sends resolution update to customer with fix details and ETA for deployment',
    status: 'pending',
  },
]

const statusColors: Record<string, string> = {
  running: 'bg-green-500',
  paused: 'bg-yellow-500',
  stopped: 'bg-red-500',
}

export default function OrchestrationPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [demoRunning, setDemoRunning] = useState(false)
  const [demoCompleted, setDemoCompleted] = useState(false)
  const [timeline, setTimeline] = useState<TimelineStep[]>([])

  useEffect(() => {
    fetchTeams()
  }, [])

  async function fetchTeams() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/orchestration')
      if (!res.ok) throw new Error('Failed to fetch teams')
      const data = await res.json()
      const teamList = Array.isArray(data) ? data : []
      setTeams(teamList)
      if (teamList.length > 0 && !selectedTeamId) {
        setSelectedTeamId(teamList[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams')
    } finally {
      setLoading(false)
    }
  }

  async function handleRunDemo() {
    try {
      setDemoRunning(true)
      setDemoCompleted(false)
      // Clear timeline first, then reset to initial state to ensure clean slate
      setTimeline([])
      await new Promise((resolve) => setTimeout(resolve, 50))
      setTimeline(DEMO_TIMELINE.map((s) => ({ ...s, status: 'pending', timestamp: undefined })))

      // Try to call the demo API
      try {
        await fetch('/api/orchestration/demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId: selectedTeamId }),
        })
      } catch {
        // Demo endpoint may not exist yet - continue with simulation
      }

      // Animate timeline progression
      for (let i = 0; i < DEMO_TIMELINE.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1500))
        setTimeline((prev) =>
          prev.map((step, idx) => ({
            ...step,
            status: idx < i ? 'completed' : idx === i ? 'active' : 'pending',
            timestamp: idx <= i ? new Date().toLocaleTimeString() : undefined,
          }))
        )
        // Small delay for the active step to show before completing
        await new Promise((resolve) => setTimeout(resolve, 500))
        setTimeline((prev) =>
          prev.map((step, idx) => ({
            ...step,
            status: idx <= i ? 'completed' : idx === i + 1 ? 'active' : 'pending',
            timestamp: idx <= i ? step.timestamp || new Date().toLocaleTimeString() : undefined,
          }))
        )
      }

      setDemoCompleted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo failed')
    } finally {
      setDemoRunning(false)
    }
  }

  const selectedTeam = teams.find((t) => t.id === selectedTeamId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading orchestration...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Orchestration</h1>
          <p className="text-slate-400 mt-1">Manage teams and run multi-agent workflows</p>
        </div>
        <button
          onClick={handleRunDemo}
          disabled={demoRunning}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors font-medium disabled:opacity-60"
        >
          {demoRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Running Demo...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Run Demo Scenario
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Demo Timeline */}
      {timeline.length > 0 && (
        <div className="mb-8 bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Demo Scenario: Customer Complaint Resolution</h2>
            {demoCompleted && (
              <span className="px-3 py-1 bg-green-900/30 text-green-400 border border-green-800 rounded text-sm font-medium">
                Completed
              </span>
            )}
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-700" />

            <div className="space-y-6">
              {timeline.map((step) => (
                <div key={step.id} className="relative flex gap-4">
                  {/* Step indicator */}
                  <div
                    className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                      step.status === 'completed'
                        ? 'bg-green-600'
                        : step.status === 'active'
                        ? 'bg-blue-600 animate-pulse'
                        : 'bg-slate-700'
                    }`}
                  >
                    {step.status === 'completed' ? (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : step.status === 'active' ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-sm text-slate-400">{step.id}</span>
                    )}
                  </div>

                  {/* Step content */}
                  <div
                    className={`flex-1 p-4 rounded-lg border transition-all duration-500 ${
                      step.status === 'completed'
                        ? 'bg-green-900/10 border-green-800/50'
                        : step.status === 'active'
                        ? 'bg-blue-900/20 border-blue-700'
                        : 'bg-slate-700/30 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium">{step.title}</h3>
                      {step.timestamp && (
                        <span className="text-xs text-slate-500">{step.timestamp}</span>
                      )}
                    </div>
                    <p className="text-xs text-blue-400 mb-1">{step.agent}</p>
                    <p className="text-sm text-slate-400">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Split Layout: Teams + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams List */}
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
          <h2 className="text-lg font-semibold mb-4">Teams</h2>
          {teams.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm">No teams configured</p>
              <p className="text-slate-500 text-xs mt-1">
                Teams are created via the API
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedTeamId === team.id
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-slate-700 bg-slate-700/30 hover:border-slate-600'
                  }`}
                >
                  <h3 className="font-medium text-sm">{team.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {team.employees?.length || 0} employee{(team.employees?.length || 0) !== 1 ? 's' : ''}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Team Detail */}
        <div className="lg:col-span-2 space-y-6">
          {selectedTeam ? (
            <>
              {/* Team Info */}
              <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
                <h2 className="text-lg font-semibold mb-2">{selectedTeam.name}</h2>
                {selectedTeam.description && (
                  <p className="text-slate-400 text-sm mb-4">{selectedTeam.description}</p>
                )}

                <h3 className="text-sm font-medium text-slate-300 mb-3">Team Members</h3>
                {(!selectedTeam.employees || selectedTeam.employees.length === 0) ? (
                  <p className="text-slate-500 text-sm">No employees in this team</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedTeam.employees.map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${statusColors[emp.status] || 'bg-gray-500'}`}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{emp.name}</p>
                          <p className="text-xs text-slate-400">{emp.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Workflow Rules */}
              <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
                <h3 className="text-lg font-semibold mb-4">Workflow Rules</h3>
                {(!selectedTeam.workflowRules || selectedTeam.workflowRules.length === 0) ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-sm">No workflow rules configured</p>
                    <p className="text-slate-500 text-xs mt-1">
                      Workflow rules define how tasks flow between team members
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedTeam.workflowRules.map((rule) => {
                      let steps: Array<{ agent?: string; action?: string; order?: number }> = []
                      try {
                        steps = JSON.parse(rule.steps)
                      } catch {
                        steps = []
                      }

                      return (
                        <div
                          key={rule.id}
                          className="p-4 bg-slate-700/50 rounded-lg border border-slate-700"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="text-sm font-medium">Trigger: {rule.trigger.replace(/_/g, ' ')}</span>
                          </div>
                          {steps.length > 0 && (
                            <div className="ml-6 space-y-1">
                              {steps.map((s, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs text-slate-400">
                                  <span className="w-4 h-4 bg-slate-600 rounded-full flex items-center justify-center text-[10px]">
                                    {idx + 1}
                                  </span>
                                  <span className="text-blue-400 font-medium">{s.agent}</span>
                                  <span className="text-slate-500">→</span>
                                  <span>{s.action?.replace(/_/g, ' ')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6 text-center py-16">
              <p className="text-slate-400">Select a team to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
