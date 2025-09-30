import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-huberman-dark to-huberman-primary flex items-center justify-center">
      <div className="text-center space-y-8">
        <h1 className="text-4xl font-bold text-white mb-12">
          Huberman Lab Voice Assistant
        </h1>

        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Link
            href="/widget"
            className="group relative bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all px-8 py-6 rounded-xl text-white"
          >
            <div className="flex flex-col items-center space-y-2">
              <svg
                className="w-8 h-8 text-huberman-secondary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <span className="font-semibold text-lg">Widget Demo</span>
              <span className="text-sm text-white/70">Try the voice assistant</span>
            </div>
          </Link>

          <Link
            href="/admin"
            className="group relative bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all px-8 py-6 rounded-xl text-white"
          >
            <div className="flex flex-col items-center space-y-2">
              <svg
                className="w-8 h-8 text-huberman-secondary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span className="font-semibold text-lg">Admin Dashboard</span>
              <span className="text-sm text-white/70">View analytics & get embed code</span>
            </div>
          </Link>
        </div>
      </div>
    </main>
  )
}