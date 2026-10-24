'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

interface AdminStats {
  overview: {
    totalUsers: number
    activeCastings: number
    totalApplications: number
    liveBanners: number
    featuredTalentCount: number
  }
  roleBreakdown: {
    models: number
    cinematographers: number
    dronePilots: number
    productionHouses: number
  }
  systemHealth: {
    dbConnected: boolean
    aiStudioConnected: boolean
    serverTime: string
    version: string
  }
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/v1/admin/stats')
        const data = await res.json()
        if (data.success) {
          setStats(data.data)
        }
      } catch (e) {
        console.error('Error fetching admin stats', e)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Welcome Card */}
      <div className="bg-gradient-to-r from-[#00204B] via-[#0877E8] to-[#00204B] rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-12 text-9xl">
          📸
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase text-amber-300 mb-4">
            ✨ Stitch Admin Operations • Google AI Studio Connected
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            BookShoot Platform Command Center
          </h2>
          <p className="text-blue-100 text-sm mt-2 leading-relaxed">
            Manage live mobile hero banners, curate verified talent for featured comp cards,
            and leverage Google AI Studio Gemini 1.5 Flash for multimodal portfolio verification.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/admin/banners"
              className="bg-[#FF8A24] hover:bg-[#e07519] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow"
            >
              🎨 Manage Hero Banners
            </Link>
            <Link
              href="/admin/featured"
              className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-5 py-2.5 rounded-xl backdrop-blur-md transition"
            >
              ⭐ Curate Featured Comp Cards
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Community
            </span>
            <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600 font-bold text-sm">
              👥
            </span>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-[#00204B]">
              {loading ? '...' : stats?.overview.totalUsers ?? 0}
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Verified creators and studio owners</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Commercial Shoots
            </span>
            <span className="p-2.5 rounded-xl bg-amber-50 text-amber-600 font-bold text-sm">
              🎬
            </span>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-[#00204B]">
              {loading ? '...' : stats?.overview.activeCastings ?? 0}
            </span>
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
              Casting
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Open production casting calls</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Live Hero Banners
            </span>
            <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 font-bold text-sm">
              🎨
            </span>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-[#00204B]">
              {loading ? '...' : stats?.overview.liveBanners ?? 3}
            </span>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              Carousel
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Synced to Flutter mobile app</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              AI Copilot & Verifier
            </span>
            <span className="p-2.5 rounded-xl bg-purple-50 text-purple-600 font-bold text-sm">
              ✨
            </span>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-[#00204B]">
              Gemini 1.5
            </span>
            <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
              Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Google AI Studio REST Service</p>
        </div>
      </div>

      {/* Role Breakdown & Quick Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creator Ecosystem Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div>
              <h3 className="font-extrabold text-[#00204B] text-base">
                Creative Marketplace Composition
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribution across 4 specialized professional roles
              </p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-lg">
              Live Database
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-2xl">💃</span>
              <p className="font-black text-xl text-[#00204B] mt-2">
                {stats?.roleBreakdown.models ?? 0}
              </p>
              <p className="text-xs font-bold text-slate-500">Models</p>
              <span className="text-[10px] text-blue-600 font-semibold">Runway & Ads</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-2xl">🎥</span>
              <p className="font-black text-xl text-[#00204B] mt-2">
                {stats?.roleBreakdown.cinematographers ?? 0}
              </p>
              <p className="text-xs font-bold text-slate-500">Videographers</p>
              <span className="text-[10px] text-purple-600 font-semibold">4K & Cine Rigs</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-2xl">🛸</span>
              <p className="font-black text-xl text-[#00204B] mt-2">
                {stats?.roleBreakdown.dronePilots ?? 0}
              </p>
              <p className="text-xs font-bold text-slate-500">Drone Pilots</p>
              <span className="text-[10px] text-cyan-600 font-semibold">DGCA Licensed</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-2xl">🏢</span>
              <p className="font-black text-xl text-[#00204B] mt-2">
                {stats?.roleBreakdown.productionHouses ?? 0}
              </p>
              <p className="text-xs font-bold text-slate-500">Studios / Brands</p>
              <span className="text-[10px] text-emerald-600 font-semibold">Commercial</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Production API Base: <code className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[#0877E8]">/api/v1/...</code></span>
            <Link href="/admin/featured" className="text-[#0877E8] font-bold hover:underline">
              Inspect Talent Directory →
            </Link>
          </div>
        </div>

        {/* Quick Operations & AI Studio Tools */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-lg">⚡</span>
              <h3 className="font-extrabold text-[#00204B] text-base">Quick Operations</h3>
            </div>
            <div className="space-y-3">
              <Link
                href="/admin/banners"
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-[#0877E8] hover:bg-blue-50/40 transition group"
              >
                <div>
                  <p className="font-bold text-xs text-slate-800 group-hover:text-[#0877E8]">
                    App Banners Carousel
                  </p>
                  <p className="text-[11px] text-slate-500">Reorder & publish hero banners</p>
                </div>
                <span className="text-slate-400 group-hover:text-[#0877E8] font-bold">→</span>
              </Link>

              <Link
                href="/admin/featured"
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-[#0877E8] hover:bg-blue-50/40 transition group"
              >
                <div>
                  <p className="font-bold text-xs text-slate-800 group-hover:text-[#0877E8]">
                    Featured Comp Cards
                  </p>
                  <p className="text-[11px] text-slate-500">Pin top talent on mobile home screen</p>
                </div>
                <span className="text-slate-400 group-hover:text-[#0877E8] font-bold">→</span>
              </Link>

              <Link
                href="/admin/ai-studio"
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-[#0877E8] hover:bg-blue-50/40 transition group"
              >
                <div>
                  <p className="font-bold text-xs text-slate-800 group-hover:text-[#0877E8]">
                    AI Studio Copilot Studio
                  </p>
                  <p className="text-[11px] text-slate-500">Natural language telemetry and verification</p>
                </div>
                <span className="text-slate-400 group-hover:text-[#0877E8] font-bold">→</span>
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Server: <b className="text-slate-600 font-mono">Next.js 16 + React 19</b></span>
              <span className="text-emerald-600 font-bold">● Healthy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
