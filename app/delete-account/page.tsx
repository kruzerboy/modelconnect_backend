import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Delete Account & Data | BookShoot (ModelConnect)',
  description:
    'Instructions and web request form for deleting your BookShoot / ModelConnect account and associated personal data per Google Play and App Store policies.',
}

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-[#090D16] text-[#F1F5F9] font-sans antialiased selection:bg-[#FF5353] selection:text-white">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-rose-500/15 via-purple-500/10 to-transparent blur-3xl rounded-full" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-12 sm:py-16">
        {/* Header */}
        <header className="flex items-center justify-between pb-8 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-500/25">
              <span className="text-white font-extrabold text-xl tracking-wider">B</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                BookShoot
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  Account Management
                </span>
              </h1>
              <p className="text-xs text-slate-400">ModelConnect Marketplace</p>
            </div>
          </div>

          <Link
            href="/"
            className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700"
          >
            ← Home
          </Link>
        </header>

        {/* Hero Banner */}
        <section className="py-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-4">
            <span>🛡️</span> Data Privacy & Account Deletion Policy
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Delete Your BookShoot Account & Data
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
            In compliance with Google Play Store and Apple App Store user data policies, BookShoot
            (ModelConnect) gives you full control to permanently delete your account and all associated personal data.
          </p>
        </section>

        {/* Two Deletion Methods Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
          {/* Method 1: In-App */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center font-bold text-sm mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Instant In-App Deletion</h3>
              <p className="text-xs sm:text-sm text-slate-300 mb-4 leading-relaxed">
                If you have the BookShoot mobile app installed on your Android or iOS device:
              </p>
              <ol className="text-xs sm:text-sm text-slate-300 space-y-2.5 list-decimal pl-4 mb-6">
                <li>Open the <strong>BookShoot</strong> app on your device.</li>
                <li>Tap the <strong>Profile</strong> tab in the bottom navigation bar.</li>
                <li>Scroll down to the bottom of the profile screen.</li>
                <li>Tap <strong>Delete Account</strong> (marked in red).</li>
                <li>Confirm the deletion prompt. Your account and data are purged immediately.</li>
              </ol>
            </div>
            <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              ✓ Recommended: Instant & automatic
            </div>
          </div>

          {/* Method 2: Web Deletion Request */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center font-bold text-sm mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Web / Email Request (Without App)</h3>
              <p className="text-xs sm:text-sm text-slate-300 mb-4 leading-relaxed">
                If you uninstalled the app or cannot sign in, submit a deletion request via email:
              </p>
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 mb-4 text-xs sm:text-sm text-slate-300 space-y-2">
                <p><strong>Send an email to:</strong></p>
                <p className="text-rose-400 font-mono text-sm">support@bookshoot.in</p>
                <p className="text-xs text-slate-400 pt-1">
                  <strong>Subject:</strong> Account Deletion Request - [Your Registered Email]
                </p>
                <p className="text-xs text-slate-400">
                  Please email from the registered address or include your registered phone number for verification.
                </p>
              </div>
            </div>
            <a
              href="mailto:support@bookshoot.in?subject=Account%20Deletion%20Request&body=Hello%20BookShoot%20Support,%0A%0APlease%20permanently%20delete%20my%20BookShoot%20account%20and%20associated%20data.%0A%0ARegistered%20Email:%20%0ARegistered%20Phone:%20%0ARole%20(Model/Business):%20"
              className="w-full text-center py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 transition-colors text-white font-semibold text-xs sm:text-sm shadow-lg shadow-rose-500/20"
            >
              Email support@bookshoot.in
            </a>
          </div>
        </div>

        {/* Data Retention & Deletion Details */}
        <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 mt-10">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>📋</span> What Data is Deleted vs. Retained
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>✕</span> Data Permanently Deleted
              </h4>
              <ul className="text-xs sm:text-sm text-slate-300 space-y-2 list-disc pl-5">
                <li><strong>Account Credentials:</strong> Full name, email address, password hash, role, and phone number.</li>
                <li><strong>Profile Details:</strong> Bio, experience, physical measurements, specialties, location, and rates.</li>
                <li><strong>Media & Photos:</strong> Lookbooks, portfolio images, uploaded headshots, and studio logos.</li>
                <li><strong>Marketplace Activity:</strong> All casting call applications, proposed price quotes, and candidate shortlists.</li>
                <li><strong>Published Opportunities:</strong> Casting calls created by your business account.</li>
                <li><strong>Device Tokens & Notifications:</strong> Push notification tokens (FCM) and user alerts.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>⏱</span> Retention & Processing Timeline
              </h4>
              <ul className="text-xs sm:text-sm text-slate-300 space-y-2 list-disc pl-5">
                <li><strong>In-app deletion:</strong> Processed immediately upon confirmation.</li>
                <li><strong>Email requests:</strong> Verified and executed within <strong>24–48 hours</strong> (maximum 30 days per statutory guidelines).</li>
                <li><strong>Compliance retention:</strong> Only records strictly mandated by financial, taxation, or legal dispute compliance (e.g. past tax invoices for paid transactions) are archived for the duration required by applicable law, after which they are permanently expunged.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-slate-800 text-center text-xs text-slate-400">
          <p>© {new Date().getFullYear()} BookShoot (ModelConnect). All rights reserved.</p>
          <p className="mt-1">
            Questions about your privacy? Contact{' '}
            <a href="mailto:support@bookshoot.in" className="text-rose-400 hover:underline">
              support@bookshoot.in
            </a>
          </p>
        </footer>
      </div>
    </main>
  )
}
