'use client'

import React, { useEffect, useState } from 'react'

interface Plan {
  _id: string
  name: string
  code: string
  price: number
  billingCycle: 'one_time' | 'monthly' | 'yearly'
  includedPosts: number
  maxTalentsPerPost: number
  features: string[]
  badge?: string
  highlight: boolean
  active: boolean
  displayOrder: number
}

interface Coupon {
  _id: string
  code: string
  description?: string
  discountType: 'percentage' | 'flat' | 'free_pass'
  discountValue: number
  maxDiscountCap?: number
  minOrderAmount?: number
  applicablePlans?: string[]
  totalUsageLimit: number
  usedCount: number
  perUserLimit: number
  expiresAt?: string
  active: boolean
}

export default function PlansAndPromosPage() {
  const [activeTab, setActiveTab] = useState<'plans' | 'coupons'>('coupons')

  // Plans State
  const [plans, setPlans] = useState<Plan[]>([])
  const [plansLoading, setPlansLoading] = useState(true)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [planForm, setPlanForm] = useState({
    name: '',
    code: '',
    price: 999,
    billingCycle: 'one_time' as 'one_time' | 'monthly' | 'yearly',
    includedPosts: 1,
    maxTalentsPerPost: 2,
    featuresText: '',
    badge: '',
    highlight: false,
    active: true,
    displayOrder: 1,
  })

  // Coupons State
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [couponsLoading, setCouponsLoading] = useState(true)
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [couponForm, setCouponForm] = useState({
    code: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'flat' | 'free_pass',
    discountValue: 50,
    maxDiscountCap: 1000,
    minOrderAmount: 0,
    applicablePlansText: 'all',
    totalUsageLimit: 100,
    perUserLimit: 1,
    expiresAt: '',
    active: true,
  })

  // Live Simulator State
  const [simAmount, setSimAmount] = useState(2499)
  const [simCode, setSimCode] = useState('LAUNCH50')
  const [simResult, setSimResult] = useState<any>(null)
  const [simLoading, setSimLoading] = useState(false)

  // Fetch Plans
  const fetchPlans = async () => {
    setPlansLoading(true)
    try {
      const res = await fetch('/app/api/v1/plans' as any, { cache: 'no-store' }).catch(() => null)
      const direct = await fetch('/api/v1/admin/plans')
      const data = await direct.json()
      if (data.success && Array.isArray(data.data)) {
        setPlans(data.data)
      }
    } catch (e) {
      console.error('Failed to load plans', e)
    } finally {
      setPlansLoading(false)
    }
  }

  // Fetch Coupons
  const fetchCoupons = async () => {
    setCouponsLoading(true)
    try {
      const res = await fetch('/api/v1/admin/coupons')
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setCoupons(data.data)
      }
    } catch (e) {
      console.error('Failed to load coupons', e)
    } finally {
      setCouponsLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
    fetchCoupons()
  }, [])

  // Plan Handlers
  const handleTogglePlan = async (plan: Plan) => {
    try {
      const res = await fetch(`/api/v1/admin/plans/${plan._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !plan.active }),
      })
      if (res.ok) fetchPlans()
    } catch (e) {
      console.error('Failed to toggle plan', e)
    }
  }

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing plan?')) return
    try {
      const res = await fetch(`/api/v1/admin/plans/${id}`, { method: 'DELETE' })
      if (res.ok) fetchPlans()
    } catch (e) {
      console.error('Failed to delete plan', e)
    }
  }

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const features = planForm.featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.length > 0)

      const payload = {
        name: planForm.name,
        code: planForm.code.toLowerCase().trim(),
        price: Number(planForm.price),
        billingCycle: planForm.billingCycle,
        includedPosts: Number(planForm.includedPosts),
        maxTalentsPerPost: Number(planForm.maxTalentsPerPost),
        features,
        badge: planForm.badge,
        highlight: planForm.highlight,
        active: planForm.active,
        displayOrder: Number(planForm.displayOrder),
      }

      const url = editingPlan
        ? `/api/v1/admin/plans/${editingPlan._id}`
        : '/api/v1/admin/plans'
      const method = editingPlan ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setIsPlanModalOpen(false)
        setEditingPlan(null)
        fetchPlans()
      } else {
        const err = await res.json()
        alert(err.message || 'Validation error saving plan')
      }
    } catch (e) {
      console.error('Error saving plan', e)
    }
  }

  // Coupon Handlers
  const handleToggleCoupon = async (coupon: Coupon) => {
    try {
      const res = await fetch(`/api/v1/admin/coupons/${coupon._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !coupon.active }),
      })
      if (res.ok) fetchCoupons()
    } catch (e) {
      console.error('Failed to toggle coupon', e)
    }
  }

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return
    try {
      const res = await fetch(`/api/v1/admin/coupons/${id}`, { method: 'DELETE' })
      if (res.ok) fetchCoupons()
    } catch (e) {
      console.error('Failed to delete coupon', e)
    }
  }

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const applicablePlans = couponForm.applicablePlansText
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)

      const payload = {
        code: couponForm.code.toUpperCase().trim(),
        description: couponForm.description,
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue),
        maxDiscountCap: Number(couponForm.maxDiscountCap) || 0,
        minOrderAmount: Number(couponForm.minOrderAmount) || 0,
        applicablePlans: applicablePlans.length > 0 ? applicablePlans : ['all'],
        totalUsageLimit: Number(couponForm.totalUsageLimit) || 100,
        perUserLimit: Number(couponForm.perUserLimit) || 1,
        expiresAt: couponForm.expiresAt || null,
        active: couponForm.active,
      }

      const url = editingCoupon
        ? `/api/v1/admin/coupons/${editingCoupon._id}`
        : '/api/v1/admin/coupons'
      const method = editingCoupon ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setIsCouponModalOpen(false)
        setEditingCoupon(null)
        fetchCoupons()
      } else {
        const err = await res.json()
        alert(err.message || 'Validation error saving promo code')
      }
    } catch (e) {
      console.error('Error saving coupon', e)
    }
  }

  // Live Test Simulation
  const handleTestSimulation = async (e: React.FormEvent) => {
    e.preventDefault()
    setSimLoading(true)
    setSimResult(null)
    try {
      const res = await fetch('/api/v1/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: simCode.toUpperCase().trim(),
          amount: Number(simAmount),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSimResult(data.data)
      } else {
        setSimResult({ error: data.message || 'Invalid Promo Code' })
      }
    } catch (e: any) {
      setSimResult({ error: e.message || 'Network error' })
    } finally {
      setSimLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#00204B] tracking-tight">
            Plans & Promo Codes Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure casting opportunity pricing tiers and promotional discount codes
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center space-x-3">
          {activeTab === 'coupons' ? (
            <button
              onClick={() => {
                setEditingCoupon(null)
                setCouponForm({
                  code: '',
                  description: '',
                  discountType: 'percentage',
                  discountValue: 50,
                  maxDiscountCap: 1000,
                  minOrderAmount: 0,
                  applicablePlansText: 'all',
                  totalUsageLimit: 100,
                  perUserLimit: 1,
                  expiresAt: '',
                  active: true,
                })
                setIsCouponModalOpen(true)
              }}
              className="bg-[#0877E8] hover:bg-[#0661be] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-[#0877E8]/20 transition flex items-center space-x-2"
            >
              <span>+ Create Promo Code</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingPlan(null)
                setPlanForm({
                  name: '',
                  code: '',
                  price: 999,
                  billingCycle: 'one_time',
                  includedPosts: 1,
                  maxTalentsPerPost: 2,
                  featuresText: '1 Casting Post (Live 30 days)\nUp to 2 Talent Requirements\nUnlimited applications',
                  badge: '',
                  highlight: false,
                  active: true,
                  displayOrder: plans.length + 1,
                })
                setIsPlanModalOpen(true)
              }}
              className="bg-[#0877E8] hover:bg-[#0661be] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-[#0877E8]/20 transition flex items-center space-x-2"
            >
              <span>+ Create Pricing Plan</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('coupons')}
          className={`py-3 px-6 font-extrabold text-sm border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'coupons'
              ? 'border-[#0877E8] text-[#0877E8]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🏷️ Promo Codes & Special Offers</span>
          <span className="text-[11px] bg-blue-50 text-[#0877E8] px-2 py-0.5 rounded-full font-bold">
            {coupons.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('plans')}
          className={`py-3 px-6 font-extrabold text-sm border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'plans'
              ? 'border-[#0877E8] text-[#0877E8]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>📦 Pricing Tiers for Businesses</span>
          <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
            {plans.length}
          </span>
        </button>
      </div>

      {/* ── TAB 1: PROMO CODES ── */}
      {activeTab === 'coupons' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Promo Codes List */}
          <div className="lg:col-span-8 space-y-4">
            {couponsLoading ? (
              <p className="text-xs text-slate-400 py-12 text-center">Loading promo codes...</p>
            ) : coupons.length === 0 ? (
              <p className="text-xs text-slate-400 py-12 text-center">No promo codes found.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {coupons.map((c) => (
                  <div
                    key={c._id}
                    className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-black text-sm text-[#00204B] bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 tracking-wider">
                          {c.code}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            c.discountType === 'free_pass'
                              ? 'bg-purple-100 text-purple-700'
                              : c.discountType === 'percentage'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {c.discountType === 'free_pass'
                            ? '100% Free Pass'
                            : c.discountType === 'percentage'
                            ? `${c.discountValue}% Off`
                            : `₹${c.discountValue} Flat Off`}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            c.active
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {c.active ? '● Active' : '○ Paused'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 font-medium">
                        {c.description || 'Special promotional discount for studios'}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 font-medium pt-1">
                        <span>
                          Redemptions: <b className="text-slate-700">{c.usedCount || 0}</b> / {c.totalUsageLimit}
                        </span>
                        {c.minOrderAmount ? (
                          <span>Min Order: <b className="text-slate-700">₹{c.minOrderAmount}</b></span>
                        ) : null}
                        {c.maxDiscountCap ? (
                          <span>Max Cap: <b className="text-slate-700">₹{c.maxDiscountCap}</b></span>
                        ) : null}
                        {c.expiresAt && (
                          <span>Expires: {new Date(c.expiresAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => {
                          setSimCode(c.code)
                          navigator.clipboard.writeText(c.code)
                        }}
                        className="text-xs font-semibold px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                      >
                        Copy
                      </button>

                      <button
                        onClick={() => handleToggleCoupon(c)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                          c.active
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {c.active ? 'Pause' : 'Activate'}
                      </button>

                      <button
                        onClick={() => {
                          setEditingCoupon(c)
                          setCouponForm({
                            code: c.code,
                            description: c.description || '',
                            discountType: c.discountType,
                            discountValue: c.discountValue,
                            maxDiscountCap: c.maxDiscountCap || 0,
                            minOrderAmount: c.minOrderAmount || 0,
                            applicablePlansText: (c.applicablePlans || ['all']).join(', '),
                            totalUsageLimit: c.totalUsageLimit,
                            perUserLimit: c.perUserLimit || 1,
                            expiresAt: c.expiresAt ? c.expiresAt.substring(0, 10) : '',
                            active: c.active,
                          })
                          setIsCouponModalOpen(true)
                        }}
                        className="text-xs font-semibold px-2.5 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteCoupon(c._id)}
                        className="text-xs font-semibold px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Discount Calculator / Simulator */}
          <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm sticky top-24">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-4">
              <span className="text-lg">⚡</span>
              <div>
                <h3 className="font-extrabold text-[#00204B] text-sm">
                  Live Promo Simulator
                </h3>
                <p className="text-[11px] text-slate-400">
                  Test discount calculations before sharing with clients
                </p>
              </div>
            </div>

            <form onSubmit={handleTestSimulation} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Order Amount (₹)</label>
                <input
                  type="number"
                  value={simAmount}
                  onChange={(e) => setSimAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Promo Code</label>
                <input
                  type="text"
                  value={simCode}
                  onChange={(e) => setSimCode(e.target.value.toUpperCase())}
                  placeholder="e.g. LAUNCH100"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none font-mono font-bold text-[#0877E8]"
                />
              </div>

              <button
                type="submit"
                disabled={simLoading}
                className="w-full bg-[#00204B] hover:bg-[#0877E8] text-white py-2.5 rounded-xl font-bold transition shadow"
              >
                {simLoading ? 'Calculating...' : 'Test Promo Calculation'}
              </button>
            </form>

            {simResult && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                {simResult.error ? (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                    ❌ {simResult.error}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Original Price:</span>
                      <span className="font-bold">₹{simResult.originalAmount}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Discount:</span>
                      <span>-₹{simResult.discountAmount}</span>
                    </div>
                    <div className="flex justify-between text-[#00204B] text-sm font-black pt-2 border-t border-emerald-200">
                      <span>Payable Amount:</span>
                      <span>{simResult.finalPayable === 0 ? 'FREE (₹0)' : `₹${simResult.finalPayable}`}</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 font-semibold mt-1">
                      {simResult.message}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: PRICING PLANS ── */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          {plansLoading ? (
            <p className="text-xs text-slate-400 py-12 text-center">Loading pricing plans...</p>
          ) : plans.length === 0 ? (
            <p className="text-xs text-slate-400 py-12 text-center">No pricing plans found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((p) => (
                <div
                  key={p._id}
                  className={`bg-white rounded-3xl p-6 border transition flex flex-col justify-between ${
                    p.highlight
                      ? 'border-[#0877E8] shadow-lg shadow-blue-500/10 ring-2 ring-[#0877E8]/20'
                      : 'border-slate-200 shadow-sm'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        {p.badge && (
                          <span className="inline-block text-[10px] font-black uppercase tracking-wider bg-blue-50 text-[#0877E8] px-2.5 py-1 rounded-full mb-2">
                            {p.badge}
                          </span>
                        )}
                        <h3 className="font-black text-lg text-[#00204B]">{p.name}</h3>
                        <p className="text-xs text-slate-400 font-mono">Code: {p.code}</p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          p.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {p.active ? 'Active' : 'Hidden'}
                      </span>
                    </div>

                    {/* Price */}
                    <div className="my-4 pb-4 border-b border-slate-100">
                      <div className="flex items-baseline space-x-1">
                        <span className="text-3xl font-black text-[#00204B]">₹{p.price}</span>
                        <span className="text-xs text-slate-500 font-medium">
                          / {p.billingCycle === 'monthly' ? 'month' : 'pack'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Includes <b>{p.includedPosts} Casting Posts</b> (up to {p.maxTalentsPerPost} talents each)
                      </p>
                    </div>

                    {/* Features List */}
                    <ul className="space-y-2 text-xs text-slate-600 mb-6">
                      {p.features.map((f, i) => (
                        <li key={i} className="flex items-start space-x-2">
                          <span className="text-emerald-500 font-bold shrink-0">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleTogglePlan(p)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                        p.active ? 'text-slate-500 hover:bg-slate-100' : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {p.active ? 'Deactivate' : 'Activate'}
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingPlan(p)
                          setPlanForm({
                            name: p.name,
                            code: p.code,
                            price: p.price,
                            billingCycle: p.billingCycle,
                            includedPosts: p.includedPosts,
                            maxTalentsPerPost: p.maxTalentsPerPost,
                            featuresText: (p.features || []).join('\n'),
                            badge: p.badge || '',
                            highlight: p.highlight || false,
                            active: p.active,
                            displayOrder: p.displayOrder || 1,
                          })
                          setIsPlanModalOpen(true)
                        }}
                        className="text-xs font-semibold px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePlan(p._id)}
                        className="text-xs font-semibold px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: CREATE / EDIT PROMO CODE ── */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-base font-extrabold text-[#00204B]">
                {editingCoupon ? 'Edit Promo Code' : 'Create Special Offer Promo Code'}
              </h3>
              <button
                onClick={() => setIsCouponModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Promo Code *</label>
                  <input
                    type="text"
                    required
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. FOUNDER100"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Discount Type *</label>
                  <select
                    value={couponForm.discountType}
                    onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none bg-white font-medium"
                  >
                    <option value="percentage">Percentage Discount (% Off)</option>
                    <option value="flat">Flat Amount (₹ Off)</option>
                    <option value="free_pass">100% Free Special Pass (₹0 Pay)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Offer Description</label>
                <input
                  type="text"
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  placeholder="e.g. 50% discount for early bird production studios"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none"
                />
              </div>

              {couponForm.discountType !== 'free_pass' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {couponForm.discountType === 'percentage' ? 'Percentage Value (%)' : 'Flat Value (₹)'} *
                    </label>
                    <input
                      type="number"
                      required
                      value={couponForm.discountValue}
                      onChange={(e) => setCouponForm({ ...couponForm, discountValue: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Max Discount Cap (₹)</label>
                    <input
                      type="number"
                      value={couponForm.maxDiscountCap}
                      onChange={(e) => setCouponForm({ ...couponForm, maxDiscountCap: Number(e.target.value) })}
                      placeholder="0 for unlimited"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Redemptions Limit</label>
                  <input
                    type="number"
                    value={couponForm.totalUsageLimit}
                    onChange={(e) => setCouponForm({ ...couponForm, totalUsageLimit: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Min Order Amount (₹)</label>
                  <input
                    type="number"
                    value={couponForm.minOrderAmount}
                    onChange={(e) => setCouponForm({ ...couponForm, minOrderAmount: Number(e.target.value) })}
                    placeholder="0 for no minimum"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Expiry Date (Optional)</label>
                <input
                  type="date"
                  value={couponForm.expiresAt}
                  onChange={(e) => setCouponForm({ ...couponForm, expiresAt: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0877E8] hover:bg-[#0661be] text-white rounded-xl font-bold transition shadow"
                >
                  Save Promo Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE / EDIT PLAN ── */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-base font-extrabold text-[#00204B]">
                {editingPlan ? 'Edit Pricing Plan' : 'Create Pricing Plan'}
              </h3>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    placeholder="e.g. Production Pack"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Code / Identifier *</label>
                  <input
                    type="text"
                    required
                    value={planForm.code}
                    onChange={(e) => setPlanForm({ ...planForm, code: e.target.value.toLowerCase() })}
                    placeholder="e.g. production_pack"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Billing Cycle</label>
                  <select
                    value={planForm.billingCycle}
                    onChange={(e) => setPlanForm({ ...planForm, billingCycle: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none bg-white font-medium"
                  >
                    <option value="one_time">One-Time Pack</option>
                    <option value="monthly">Monthly Subscription</option>
                    <option value="yearly">Yearly Subscription</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Included Casting Posts</label>
                  <input
                    type="number"
                    value={planForm.includedPosts}
                    onChange={(e) => setPlanForm({ ...planForm, includedPosts: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Talents Per Post</label>
                  <input
                    type="number"
                    value={planForm.maxTalentsPerPost}
                    onChange={(e) => setPlanForm({ ...planForm, maxTalentsPerPost: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Features (One per line)</label>
                <textarea
                  rows={4}
                  value={planForm.featuresText}
                  onChange={(e) => setPlanForm({ ...planForm, featuresText: e.target.value })}
                  placeholder="3 Casting Opportunity Posts&#10;Up to 4 Talents per post&#10;Priority Comp Card Shortlist"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Badge Tag (Optional)</label>
                  <input
                    type="text"
                    value={planForm.badge}
                    onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value })}
                    placeholder="e.g. Most Popular"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0877E8] outline-none"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="highlightCheck"
                    checked={planForm.highlight}
                    onChange={(e) => setPlanForm({ ...planForm, highlight: e.target.checked })}
                    className="w-4 h-4 text-[#0877E8] rounded"
                  />
                  <label htmlFor="highlightCheck" className="font-bold text-slate-700">
                    Highlight (Featured Tier)
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0877E8] hover:bg-[#0661be] text-white rounded-xl font-bold transition shadow"
                >
                  Save Pricing Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
