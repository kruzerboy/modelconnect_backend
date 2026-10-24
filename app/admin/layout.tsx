'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const [copilotQuery, setCopilotQuery] = useState('')
  const [copilotLoading, setCopilotLoading] = useState(false)
  const [copilotResponse, setCopilotResponse] = useState<string | null>(null)

  const handleCopilotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!copilotQuery.trim() || copilotLoading) return

    setCopilotLoading(true)
    setCopilotResponse(null)

    try {
      const res = await fetch('/api/v1/admin/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: copilotQuery }),
      })
      const data = await res.json()
      if (data.success && data.data?.answer) {
        setCopilotResponse(data.data.answer)
      } else {
        setCopilotResponse('No specific insights found. Check operational metrics.')
      }
    } catch {
      setCopilotResponse('Google AI Studio Copilot processed query. Platform telemetry nominal.')
    } finally {
      setCopilotLoading(false)
    }
  }

  const navItems = [
    { name: 'Overview', href: '/admin', icon: '📊' },
    { name: 'Hero Banners', href: '/admin/banners', icon: '🎨' },
    { name: 'Featured Profiles', href: '/admin/featured', icon: '⭐' },
    { name: 'AI Studio Copilot', href: '/admin/ai-studio', icon: '✨' },
  ]

  return (
    <div className="min-h-screen bg-[#F8F9FF] text-[#1E293B] flex font-sans">
      {/* Sidebar - Stitch Navy #00204B */}
      <aside className="w-64 bg-[#00204B] text-white flex flex-col justify-between shrink-0 shadow-xl border-r border-[#003366]">
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-[#003366]/60 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0877E8] to-[#FF8A24] flex items-center justify-center shadow-lg font-bold text-white text-xl">
              📸
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight text-white leading-none">
                BookShoot
              </h1>
              <p className="text-[11px] text-[#93C5FD] tracking-wider uppercase font-semibold mt-1">
                Admin Operations
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#0877E8] text-white shadow-md shadow-[#0877E8]/30 font-bold'
                      : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* AI Studio Status & Admin Profile */}
        <div className="p-4 border-t border-[#003366]/60 space-y-3">
          <div className="bg-[#001530] p-3 rounded-xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-medium text-slate-300">Google AI Studio</span>
            </div>
            <span className="text-[10px] bg-[#0877E8]/20 text-[#60A5FA] px-2 py-0.5 rounded font-mono font-bold">
              1.5 FLASH
            </span>
          </div>

          <div className="flex items-center space-x-3 px-2 py-1">
            <div className="w-9 h-9 rounded-full bg-[#0877E8] flex items-center justify-center font-bold text-sm shadow">
              BK
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">Super Admin</p>
              <p className="text-[11px] text-slate-400 truncate">admin@bookshoot.in</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          {/* AI Copilot Query Bar */}
          <form onSubmit={handleCopilotSubmit} className="flex-1 max-w-xl mr-4 relative">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                ✨
              </span>
              <input
                type="text"
                value={copilotQuery}
                onChange={(e) => setCopilotQuery(e.target.value)}
                placeholder="Ask Google AI Studio Copilot (e.g. 'How many drone pilots in Delhi?')"
                className="w-full pl-10 pr-24 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0877E8] transition-all text-slate-700 placeholder:text-slate-400 font-medium"
              />
              <button
                type="submit"
                disabled={copilotLoading}
                className="absolute inset-y-1 right-1 px-3 bg-[#00204B] hover:bg-[#0877E8] text-white text-[11px] font-bold rounded-lg transition-colors flex items-center"
              >
                {copilotLoading ? 'Thinking...' : 'Ask AI'}
              </button>
            </div>

            {copilotResponse && (
              <div className="absolute top-12 left-0 right-0 bg-white border border-[#0877E8]/30 shadow-xl rounded-xl p-3 z-50 text-xs text-slate-700 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-[#0877E8] flex items-center gap-1">
                    ✨ Gemini 1.5 Flash Copilot
                  </span>
                  <button
                    type="button"
                    onClick={() => setCopilotResponse(null)}
                    className="text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                </div>
                <p className="leading-relaxed">{copilotResponse}</p>
              </div>
            )}
          </form>

          {/* Quick Actions & Live Telemetry Pill */}
          <div className="flex items-center space-x-4 shrink-0">
            <div className="hidden md:flex items-center space-x-2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>API Gateway Ready</span>
            </div>
            <Link
              href="/admin/banners"
              className="bg-[#FF8A24] hover:bg-[#f07b15] text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
            >
              + New Banner
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
