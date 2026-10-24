'use client'

import React, { useEffect, useState } from 'react'

interface Banner {
  _id: string
  title: string
  subtitle?: string
  imageUrl: string
  ctaText?: string
  targetType: string
  targetPayload: string
  gradientColors?: string[]
  badge?: string
  displayOrder: number
  active: boolean
}

export default function BannersManagementPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [activePreviewIndex, setActivePreviewIndex] = useState(0)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    ctaText: 'Explore',
    targetType: 'category',
    targetPayload: 'model',
    badge: 'Trending Now',
    gradientColors: ['#00204B', '#0877E8'],
    displayOrder: 1,
    active: true,
  })

  const fetchBanners = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/admin/banners')
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setBanners(data.data)
      }
    } catch (e) {
      console.error('Failed to load banners', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBanners()
  }, [])

  const handleToggleActive = async (banner: Banner) => {
    try {
      const res = await fetch(`/api/v1/admin/banners/${banner._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !banner.active }),
      })
      if (res.ok) {
        fetchBanners()
      }
    } catch (e) {
      console.error('Failed to toggle banner status', e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hero banner?')) return
    try {
      const res = await fetch(`/api/v1/admin/banners/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchBanners()
      }
    } catch (e) {
      console.error('Failed to delete banner', e)
    }
  }

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingBanner
        ? `/api/v1/admin/banners/${editingBanner._id}`
        : '/api/v1/admin/banners'
      const method = editingBanner ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setIsCreateOpen(false)
        setEditingBanner(null)
        fetchBanners()
      } else {
        const err = await res.json()
        alert(err.message || 'Validation error while saving banner')
      }
    } catch (e) {
      console.error('Error saving banner', e)
    }
  }

  const currentPreviewBanner = banners[activePreviewIndex] || banners[0]

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#00204B] tracking-tight">
            App Banners & Hero Carousel
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time synchronization with Flutter iOS & Android Home Screen
          </p>
        </div>
        <button
          onClick={() => {
            setEditingBanner(null)
            setFormData({
              title: '',
              subtitle: '',
              imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80',
              ctaText: 'Explore',
              targetType: 'category',
              targetPayload: 'model',
              badge: 'Trending Now',
              gradientColors: ['#00204B', '#0877E8'],
              displayOrder: banners.length + 1,
              active: true,
            })
            setIsCreateOpen(true)
          }}
          className="bg-[#0877E8] hover:bg-[#0661be] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-[#0877E8]/20 transition flex items-center justify-center space-x-2 shrink-0"
        >
          <span>+ Create Banner</span>
        </button>
      </div>

      {/* Main Grid: Smartphone Simulator on left, Banner Cards on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Smartphone Simulator (Stitch Design Reference) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              📱 Live Mobile Simulator
            </span>
            <span className="text-[11px] bg-blue-50 text-[#0877E8] font-bold px-2.5 py-0.5 rounded-full">
              BookShoot App
            </span>
          </div>

          {/* Smartphone Frame */}
          <div className="w-[310px] rounded-[36px] bg-[#00142D] p-3 shadow-2xl border-4 border-slate-800">
            {/* Phone Screen */}
            <div className="bg-[#F8F9FF] rounded-[28px] overflow-hidden min-h-[460px] flex flex-col justify-between p-4">
              {/* App Status Bar */}
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 px-2 pt-1 pb-3">
                <span>9:41</span>
                <span>BookShoot ✨</span>
                <span>100%</span>
              </div>

              {/* Home Header Mock */}
              <div className="px-2 mb-3">
                <p className="text-[11px] text-slate-500 font-medium">Hi, Creative Pro ✨</p>
                <p className="text-sm font-extrabold text-[#00204B]">Explore Commercial Shoots</p>
              </div>

              {/* The Live Hero Banner Card Simulator */}
              {currentPreviewBanner ? (
                <div
                  className="rounded-2xl p-4 text-white shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[170px]"
                  style={{
                    background: `linear-gradient(135deg, ${
                      currentPreviewBanner.gradientColors?.[0] || '#00204B'
                    }, ${currentPreviewBanner.gradientColors?.[1] || '#0877E8'})`,
                  }}
                >
                  <div className="relative z-10">
                    <span className="inline-block bg-white/20 backdrop-blur-md text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mb-2">
                      {currentPreviewBanner.badge || 'FEATURED'}
                    </span>
                    <h4 className="font-black text-sm leading-tight text-white line-clamp-2">
                      {currentPreviewBanner.title}
                    </h4>
                    {currentPreviewBanner.subtitle && (
                      <p className="text-[11px] text-white/80 line-clamp-2 mt-1 leading-snug">
                        {currentPreviewBanner.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="relative z-10 flex items-center justify-between mt-3 pt-2 border-t border-white/10">
                    <span className="text-[10px] font-bold bg-white text-[#00204B] px-3 py-1 rounded-full shadow-sm">
                      {currentPreviewBanner.ctaText || 'Explore'} →
                    </span>
                    <span className="text-[10px] text-white/70 font-mono">
                      Target: {currentPreviewBanner.targetPayload}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-2xl">
                  No active banners found. Create one to preview.
                </div>
              )}

              {/* Slider Dots */}
              {banners.length > 1 && (
                <div className="flex justify-center space-x-1.5 my-3">
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActivePreviewIndex(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        activePreviewIndex === i
                          ? 'w-6 bg-[#0877E8]'
                          : 'w-2 bg-slate-300'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Bottom Nav Mock */}
              <div className="bg-white rounded-xl p-2.5 flex justify-around text-slate-400 text-xs shadow-sm mt-auto">
                <span className="text-[#0877E8] font-bold">🏠 Home</span>
                <span>🎬 Castings</span>
                <span>💬 Messages</span>
                <span>👤 Profile</span>
              </div>
            </div>
          </div>
        </div>

        {/* Banner Management List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-[#00204B] text-base">
                Published Banners ({banners.length})
              </h3>
              <span className="text-xs text-slate-500">Live on production app</span>
            </div>

            {loading ? (
              <p className="text-xs text-slate-400 py-8 text-center">Loading banners...</p>
            ) : banners.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No banners available.</p>
            ) : (
              <div className="space-y-3">
                {banners.map((b, idx) => (
                  <div
                    key={b._id}
                    className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      activePreviewIndex === idx
                        ? 'border-[#0877E8] bg-blue-50/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center font-bold text-white shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, ${
                            b.gradientColors?.[0] || '#00204B'
                          }, ${b.gradientColors?.[1] || '#0877E8'})`,
                        }}
                      >
                        #{b.displayOrder}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-xs text-slate-800 line-clamp-1">
                            {b.title}
                          </h4>
                          {b.badge && (
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
                              {b.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {b.subtitle}
                        </p>
                        <p className="text-[10px] text-[#0877E8] font-mono mt-1">
                          Action: {b.ctaText} → {b.targetType} ({b.targetPayload})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => setActivePreviewIndex(idx)}
                        className="text-xs font-semibold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                      >
                        Preview
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(b)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition ${
                          b.active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {b.active ? 'Active' : 'Hidden'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingBanner(b)
                          setFormData({
                            title: b.title,
                            subtitle: b.subtitle || '',
                            imageUrl: b.imageUrl,
                            ctaText: b.ctaText || 'Explore',
                            targetType: b.targetType,
                            targetPayload: b.targetPayload,
                            badge: b.badge || '',
                            gradientColors: b.gradientColors || ['#00204B', '#0877E8'],
                            displayOrder: b.displayOrder,
                            active: b.active,
                          })
                          setIsCreateOpen(true)
                        }}
                        className="text-xs font-semibold px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(b._id)}
                        className="text-xs font-semibold px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create / Edit Banner Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-base font-extrabold text-[#00204B]">
                {editingBanner ? 'Edit Banner' : 'Create New Hero Banner'}
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Banner Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Summer High Fashion Casting 2025"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subtitle / Hook</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. Now casting runway models for Mumbai & Delhi shoots"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Badge Text</label>
                  <input
                    type="text"
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="e.g. 🔥 TRENDING NOW"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">CTA Button Text</label>
                  <input
                    type="text"
                    value={formData.ctaText}
                    onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                    placeholder="e.g. View Castings"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Action</label>
                  <select
                    value={formData.targetType}
                    onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none bg-white font-medium"
                  >
                    <option value="category">Category Filter</option>
                    <option value="casting">Casting Opportunity</option>
                    <option value="creator">Creator Profile</option>
                    <option value="external">External Link</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Payload</label>
                  <select
                    value={formData.targetPayload}
                    onChange={(e) => setFormData({ ...formData, targetPayload: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none bg-white font-medium"
                  >
                    <option value="model">Models (Runway/Commercial)</option>
                    <option value="camera">Videographers & Cine Crew</option>
                    <option value="drone">DGCA Drone Pilots</option>
                    <option value="business">Studio & Brand Desk</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Hero Image URL *</label>
                <input
                  type="url"
                  required
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gradient Start Color</label>
                  <input
                    type="text"
                    value={formData.gradientColors[0]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gradientColors: [e.target.value, formData.gradientColors[1]],
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gradient End Color</label>
                  <input
                    type="text"
                    value={formData.gradientColors[1]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gradientColors: [formData.gradientColors[0], e.target.value],
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0877E8] hover:bg-[#0661be] text-white rounded-xl font-bold transition shadow"
                >
                  Save Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
