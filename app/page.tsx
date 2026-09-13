import Link from 'next/link'

export default function Page() {
  const endpoints = [
    { method: 'GET', path: '/api/v1/opportunities', desc: 'Browse active casting calls and filter by tag/budget' },
    { method: 'POST', path: '/api/v1/auth/register', desc: 'Create a new Model or Business Owner account' },
    { method: 'POST', path: '/api/v1/auth/login', desc: 'Authenticate and receive JWT access tokens' },
    { method: 'GET', path: '/api/v1/me', desc: 'Fetch currently authenticated user and active profile' },
    { method: 'GET', path: '/api/v1/profiles/me', desc: 'Retrieve model attributes or business profile' },
    { method: 'PUT', path: '/api/v1/profiles/me', desc: 'Update model portfolio, rates, social handle or company info' },
    { method: 'POST', path: '/api/v1/opportunities', desc: 'Post a new casting opportunity (Business only)' },
    { method: 'GET', path: '/api/v1/creators', desc: 'Search and filter models by specialty and location' },
    { method: 'GET', path: '/api/v1/notifications', desc: 'Retrieve unread user alerts and application updates' },
  ]

  return (
    <main className="min-h-screen bg-[#090D16] text-[#F1F5F9] font-sans antialiased selection:bg-[#6366F1] selection:text-white">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-indigo-500/15 via-purple-500/10 to-transparent blur-3xl rounded-full" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-12 sm:py-16">
        {/* Top Navbar */}
        <header className="flex items-center justify-between pb-8 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="text-white font-extrabold text-xl tracking-wider">M</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                ModelConnect
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  Backend API
                </span>
              </h1>
              <p className="text-xs text-slate-400">Two-Sided Talent Marketplace Service</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Server Operational
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-12 sm:py-14 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-medium mb-6">
            <span>🚀</span> Next.js 16 + MongoDB Atlas Connected
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            High-Performance API for <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Models & Business Owners
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed">
            The core backend microservice powering the ModelConnect Flutter mobile app. Handles authentication, casting opportunities, proposed-rate applications, and talent profiles.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/api/v1/opportunities"
              target="_blank"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all duration-150 active:scale-95"
            >
              Test GET /api/v1/opportunities →
            </Link>
            <span className="text-xs text-slate-500 font-mono bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800">
              API Base: http://localhost:3000/api/v1
            </span>
          </div>
        </section>

        {/* System Status Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Database</div>
            <div className="mt-2 text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400 text-sm">●</span> MongoDB Atlas
            </div>
            <p className="mt-1 text-xs text-slate-400">Cluster connected & authenticated</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Client Support</div>
            <div className="mt-2 text-xl font-bold text-white flex items-center gap-2">
              <span className="text-indigo-400 text-sm">●</span> Flutter App
            </div>
            <p className="mt-1 text-xs text-slate-400">Android, iOS & Web compatible</p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Security & Auth</div>
            <div className="mt-2 text-xl font-bold text-white flex items-center gap-2">
              <span className="text-purple-400 text-sm">●</span> JWT + Bcrypt
            </div>
            <p className="mt-1 text-xs text-slate-400">Bearer token authorization active</p>
          </div>
        </section>

        {/* API Endpoints Directory */}
        <section className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 sm:p-8 backdrop-blur-sm">
          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white">Available API Endpoints</h3>
              <p className="text-xs text-slate-400 mt-0.5">RESTful v1 endpoints consumed by the ModelConnect mobile client</p>
            </div>
            <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
              v1.0.0
            </span>
          </div>

          <div className="mt-6 divide-y divide-slate-800/60">
            {endpoints.map((ep, i) => (
              <div key={i} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                      ep.method === 'GET'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : ep.method === 'POST'
                        ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {ep.method}
                  </span>
                  <span className="text-sm font-mono text-slate-200 font-semibold">{ep.path}</span>
                </div>
                <span className="text-xs text-slate-400 sm:text-right">{ep.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-slate-500">
          ModelConnect Backend &bull; Running on Node.js / Next.js &bull; Port 3000
        </footer>
      </div>
    </main>
  )
}
