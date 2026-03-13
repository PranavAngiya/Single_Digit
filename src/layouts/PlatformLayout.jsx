import { Link, Outlet } from 'react-router-dom'
import { Grid3X3, ChevronLeft } from 'lucide-react'

export default function PlatformLayout({ moduleName }) {
  return (
    <div className="min-h-screen flex flex-col bg-sidebar">
      <header className="h-15 bg-white border-b border-border flex items-center justify-between px-6 shrink-0" style={{ height: 60 }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Grid3X3 className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-primary">AI Demo Platform</span>
          {moduleName && (
            <>
              <span className="text-border mx-1">/</span>
              <span className="text-sm font-medium text-secondary">{moduleName}</span>
            </>
          )}
        </div>
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Portal
        </Link>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
