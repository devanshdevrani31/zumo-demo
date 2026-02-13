'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Team {
  id: string
  name: string
  description: string
}

const ROLE_TEMPLATES = [
  'Support Agent',
  'Developer',
  'Security Analyst',
  'Data Analyst',
  'DevOps Engineer',
  'Custom',
]

const RUNTIMES = [
  {
    id: 'openclaw',
    name: 'OpenClaw',
    description: 'Open-source agent runtime with built-in tool orchestration and memory management.',
  },
  {
    id: 'autogpt',
    name: 'AutoGPT Loop',
    description: 'Autonomous goal-driven loop with self-prompting and task decomposition.',
  },
  {
    id: 'custom_planner',
    name: 'Custom Planner',
    description: 'Custom planning runtime with configurable strategies and step-by-step execution.',
  },
  {
    id: 'external',
    name: 'External Runtime',
    description: 'Connect to an external agent runtime via API. Full control over execution.',
  },
]

const MODEL_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o and GPT-4 models with function calling support.',
    costEstimate: '$0.03-0.12 per 1K tokens',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 3.5 Sonnet and Claude 3 Opus for complex reasoning.',
    costEstimate: '$0.003-0.075 per 1K tokens',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Google Gemini Pro with multimodal capabilities.',
    costEstimate: '$0.0025-0.05 per 1K tokens',
  },
  {
    id: 'local',
    name: 'Local',
    description: 'Self-hosted models via Ollama or vLLM. Zero API costs.',
    costEstimate: 'Infrastructure costs only',
  },
]

const TOOLS = [
  { id: 'slack', name: 'Slack', icon: '#' },
  { id: 'sentry', name: 'Sentry', icon: '!' },
  { id: 'hubspot', name: 'HubSpot', icon: 'H' },
  { id: 'github', name: 'GitHub', icon: 'G' },
  { id: 'email', name: 'Email', icon: '@' },
  { id: 'database', name: 'Database', icon: 'D' },
  { id: 'filesystem', name: 'File System', icon: 'F' },
  { id: 'api_access', name: 'API Access', icon: 'A' },
]

const AUTONOMY_MODES = [
  {
    id: 'full_auto',
    name: 'Full Auto',
    description: 'Employee operates independently. Actions are logged but not gated.',
  },
  {
    id: 'supervised',
    name: 'Supervised',
    description: 'Employee can act freely on low-risk tasks. High-risk actions require approval.',
  },
  {
    id: 'manual_approval',
    name: 'Manual Approval',
    description: 'Every action requires explicit human approval before execution.',
  },
]

const PROVISIONING_STEPS = [
  'Provisioning isolated VM sandbox (gVisor)...',
  'Configuring egress-filtered network policy...',
  'Initializing OpenClaw runtime agent loop...',
  'Binding model provider API credentials...',
  'Applying capability policies & rate limits...',
  'Connecting tool integrations (mTLS)...',
  'Starting supervisor & heartbeat monitor...',
  'Employee deployed successfully!',
]

const TOTAL_STEPS = 7

export default function NewEmployeePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [provisioningStep, setProvisioningStep] = useState(-1)
  const [teams, setTeams] = useState<Team[]>([])
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [customRole, setCustomRole] = useState('')
  const [runtime, setRuntime] = useState('openclaw')
  const [modelProvider, setModelProvider] = useState('anthropic')
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [autonomyMode, setAutonomyMode] = useState('supervised')
  const [instructions, setInstructions] = useState('')
  const [teamId, setTeamId] = useState<string>('')

  useEffect(() => {
    async function fetchTeams() {
      try {
        const res = await fetch('/api/orchestration')
        if (res.ok) {
          const data = await res.json()
          setTeams(Array.isArray(data) ? data : [])
        }
      } catch {
        // Teams are optional, non-critical
      }
    }
    fetchTeams()
  }, [])

  const effectiveRole = role === 'Custom' ? customRole : role

  const toggleTool = (toolId: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolId) ? prev.filter((t) => t !== toolId) : [...prev, toolId]
    )
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return name.trim() && (role !== 'Custom' ? role : customRole.trim())
      case 2:
        return runtime
      case 3:
        return modelProvider
      case 4:
        return true // tools are optional
      case 5:
        return autonomyMode
      case 6:
        return true // team is optional
      case 7:
        return true
      default:
        return false
    }
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setError(null)

      // Start provisioning animation
      for (let i = 0; i < PROVISIONING_STEPS.length; i++) {
        setProvisioningStep(i)
        await new Promise((resolve) => setTimeout(resolve, 800))
      }

      const body = {
        name: name.trim(),
        role: effectiveRole,
        runtime,
        modelProvider,
        tools: JSON.stringify(selectedTools),
        autonomyMode,
        instructions,
        teamId: teamId || null,
      }

      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create employee')
      }

      const data = await res.json()
      const employeeId = data.employee?.id || data.id
      router.push(`/employees/${employeeId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee')
      setProvisioningStep(-1)
      setSubmitting(false)
    }
  }

  // Provisioning Animation
  if (provisioningStep >= 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-8 max-w-md w-full">
          <h2 className="text-xl font-bold mb-6 text-center">Deploying Employee</h2>
          <div className="space-y-3">
            {PROVISIONING_STEPS.map((stepText, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  index <= provisioningStep
                    ? 'animate-provision'
                    : 'opacity-0'
                } ${
                  index < provisioningStep
                    ? 'bg-green-900/20 border border-green-800'
                    : index === provisioningStep
                    ? 'bg-blue-900/20 border border-blue-800'
                    : ''
                }`}
              >
                {index < provisioningStep ? (
                  <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : index === provisioningStep ? (
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 flex-shrink-0" />
                )}
                <span
                  className={`text-sm ${
                    index < provisioningStep
                      ? 'text-green-400'
                      : index === provisioningStep
                      ? 'text-blue-400'
                      : 'text-slate-500'
                  }`}
                >
                  {stepText}
                </span>
              </div>
            ))}
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Employee</h1>
        <p className="text-slate-400 mt-1">Configure and deploy a new AI employee</p>
      </div>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div key={i} className="flex items-center flex-1">
              <button
                onClick={() => i + 1 < step && setStep(i + 1)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  i + 1 === step
                    ? 'bg-blue-600 text-white'
                    : i + 1 < step
                    ? 'bg-green-600 text-white cursor-pointer'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {i + 1 < step ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </button>
              {i < TOTAL_STEPS - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    i + 1 < step ? 'bg-green-600' : 'bg-slate-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>Name</span>
          <span>Runtime</span>
          <span>Model</span>
          <span>Tools</span>
          <span>Autonomy</span>
          <span>Team</span>
          <span>Review</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6">
        {/* Step 1: Name + Role */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Name & Role</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Employee Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex, Billing Bot, CodeReviewBot"
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Role Template
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a role...</option>
                  {ROLE_TEMPLATES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              {role === 'Custom' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Custom Role Name
                  </label>
                  <input
                    type="text"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder="Enter custom role..."
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Runtime */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Runtime</h2>
            <p className="text-slate-400 text-sm mb-4">
              Select the execution runtime for your AI employee.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {RUNTIMES.map((rt) => (
                <button
                  key={rt.id}
                  onClick={() => setRuntime(rt.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    runtime === rt.id
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  <h3 className="font-semibold mb-1">{rt.name}</h3>
                  <p className="text-sm text-slate-400">{rt.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Model Provider */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Model Provider</h2>
            <p className="text-slate-400 text-sm mb-4">
              Choose the LLM provider powering this employee.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MODEL_PROVIDERS.map((mp) => (
                <button
                  key={mp.id}
                  onClick={() => setModelProvider(mp.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    modelProvider === mp.id
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  <h3 className="font-semibold mb-1">{mp.name}</h3>
                  <p className="text-sm text-slate-400 mb-2">{mp.description}</p>
                  <p className="text-xs text-blue-400">{mp.costEstimate}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Tool Access */}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Tool Access</h2>
            <p className="text-slate-400 text-sm mb-4">
              Select the tools this employee can access. These can be restricted further with policies.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TOOLS.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => toggleTool(tool.id)}
                  className={`p-4 rounded-lg border text-center transition-all ${
                    selectedTools.includes(tool.id)
                      ? 'border-blue-500 bg-blue-900/20'
                      : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 text-lg font-bold ${
                      selectedTools.includes(tool.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-600 text-slate-300'
                    }`}
                  >
                    {tool.icon}
                  </div>
                  <span className="text-sm">{tool.name}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-4">
              {selectedTools.length} tool{selectedTools.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        )}

        {/* Step 5: Autonomy Mode */}
        {step === 5 && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Autonomy & Instructions</h2>
            <div className="space-y-4">
              <div>
                <p className="text-slate-400 text-sm mb-4">
                  How much independence should this employee have?
                </p>
                <div className="space-y-3">
                  {AUTONOMY_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setAutonomyMode(mode.id)}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        autonomyMode === mode.id
                          ? 'border-blue-500 bg-blue-900/20'
                          : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                      }`}
                    >
                      <h3 className="font-semibold mb-1">{mode.name}</h3>
                      <p className="text-sm text-slate-400">{mode.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Instructions (optional)
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={4}
                  placeholder="Add specific instructions for this employee..."
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Team Selection */}
        {step === 6 && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Team & Permissions</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Assign to Team (optional)
                </label>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No team (independent)</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Permissions Summary */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3">Permissions Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Autonomy Level</span>
                    <span className="text-white capitalize">
                      {autonomyMode.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tools Accessible</span>
                    <span className="text-white">{selectedTools.length} tools</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Team</span>
                    <span className="text-white">
                      {teamId
                        ? teams.find((t) => t.id === teamId)?.name || 'Selected'
                        : 'Independent'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Review */}
        {step === 7 && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Security Summary & Review</h2>
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3">Employee Configuration</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Name</span>
                    <span className="text-white">{name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Role</span>
                    <span className="text-white">{effectiveRole}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Runtime</span>
                    <span className="text-white">
                      {RUNTIMES.find((r) => r.id === runtime)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Model Provider</span>
                    <span className="text-white">
                      {MODEL_PROVIDERS.find((m) => m.id === modelProvider)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Autonomy</span>
                    <span className="text-white capitalize">
                      {autonomyMode.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3">Security Assessment</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-sm text-slate-300">Audit logging enabled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {autonomyMode === 'full_auto' ? (
                      <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    <span className="text-sm text-slate-300">
                      {autonomyMode === 'full_auto'
                        ? 'Full auto mode - actions not gated'
                        : autonomyMode === 'supervised'
                        ? 'High-risk actions require approval'
                        : 'All actions require approval'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-slate-300">
                      {selectedTools.length} tool{selectedTools.length !== 1 ? 's' : ''} with policy enforcement
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-slate-300">Blockchain-anchored audit trail</span>
                  </div>
                </div>
              </div>

              {instructions && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Instructions</h3>
                  <p className="text-sm text-slate-400 whitespace-pre-wrap">{instructions}</p>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-slate-700">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Back
          </button>
          {step < TOTAL_STEPS ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Deploying...' : 'Deploy Employee'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
