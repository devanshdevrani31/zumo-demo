'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Employee {
  id: string
  name: string
  role: string
  runtime: string
  modelProvider: string
  tools: string
  autonomyMode: string
  status: string
  teamId: string | null
  createdAt: string
  updatedAt: string
}

const statusColors: Record<string, string> = {
  running: 'bg-green-500',
  paused: 'bg-yellow-500',
  stopped: 'bg-red-500',
  provisioning: 'bg-blue-500',
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

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchEmployees() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/employees')
        if (!res.ok) throw new Error('Failed to fetch employees')
        const data = await res.json()
        setEmployees(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load employees')
      } finally {
        setLoading(false)
      }
    }

    fetchEmployees()
  }, [])

  const filteredEmployees = employees.filter((emp) => {
    const query = search.toLowerCase()
    return (
      emp.name.toLowerCase().includes(query) ||
      emp.role.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading employees...</p>
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-slate-400 mt-1">
            Manage your AI employees ({employees.length} total)
          </p>
        </div>
        <Link
          href="/employees/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create New Employee
        </Link>
      </div>

      {/* Search/Filter Bar */}
      <div className="mb-6">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Employee Grid */}
      {filteredEmployees.length === 0 ? (
        <div className="text-center py-16 bg-slate-800 rounded-lg border border-slate-700">
          {employees.length === 0 ? (
            <>
              <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-slate-400 text-lg">No employees yet</p>
              <p className="text-slate-500 text-sm mt-1">Create your first AI employee to get started</p>
              <Link
                href="/employees/new"
                className="inline-block mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Create Employee
              </Link>
            </>
          ) : (
            <>
              <p className="text-slate-400 text-lg">No employees match your search</p>
              <p className="text-slate-500 text-sm mt-1">Try a different search term</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => {
            let tools: string[] = []
            try {
              tools = JSON.parse(employee.tools)
            } catch {
              tools = []
            }

            return (
              <Link
                key={employee.id}
                href={`/employees/${employee.id}`}
                className="block bg-slate-800 rounded-lg shadow-lg border border-slate-700 p-6 hover:border-slate-600 hover:bg-slate-750 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold group-hover:text-blue-400 transition-colors">
                      {employee.name}
                    </h3>
                    <p className="text-slate-400 text-sm">{employee.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${statusColors[employee.status] || 'bg-gray-500'}`}
                    />
                    <span className="text-xs text-slate-400 capitalize">
                      {employee.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Runtime</span>
                    <span className="text-slate-200">
                      {runtimeLabels[employee.runtime] || employee.runtime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Model</span>
                    <span className="text-slate-200">
                      {modelProviderLabels[employee.modelProvider] || employee.modelProvider}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Autonomy</span>
                    <span className="text-slate-200 capitalize">
                      {employee.autonomyMode.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {tools.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1">
                    {tools.slice(0, 4).map((tool) => (
                      <span
                        key={tool}
                        className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300"
                      >
                        {tool}
                      </span>
                    ))}
                    {tools.length > 4 && (
                      <span className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400">
                        +{tools.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-700">
                  <p className="text-xs text-slate-500">
                    Created {new Date(employee.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
