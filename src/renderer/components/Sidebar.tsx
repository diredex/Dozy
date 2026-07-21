import { Box, Play, CheckCircle2, Settings, Puzzle } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import logo from '../assets/logo.png'

interface SidebarProps {
  activeView: string
  onViewChange: (view: 'engines' | 'build' | 'results' | 'settings') => void
  engineCount: number
  readyCount: number
  hasResults: boolean
  isBuilding: boolean
}

export default function Sidebar({
  activeView,
  onViewChange,
  engineCount,
  readyCount,
  hasResults,
  isBuilding
}: SidebarProps) {
  const navItems: Array<{
    id: 'engines' | 'build' | 'results' | 'settings'
    label: string
    icon: any
    badge?: string | null
    showSpinner?: boolean
    showDot?: boolean
  }> = [
    { id: 'engines', label: 'Engines', icon: Box, badge: engineCount > 0 ? `${readyCount}/${engineCount}` : null },
    { id: 'build', label: 'Build', icon: Play, showSpinner: isBuilding },
    { id: 'results', label: 'Results', icon: CheckCircle2, showDot: hasResults },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  return (
    <aside className="w-[var(--sidebar-width)] flex-shrink-0 bg-background border-r border-border flex flex-col h-full transition-colors duration-300">
      {/* Header */}
      <div className="h-14 flex items-center gap-3 px-6 border-b border-border/50 titlebar-drag-region">
        <div className="w-9 h-9 flex items-center justify-center titlebar-nodrag-region">
          <img src={logo} alt="Dozy Logo" className="w-full h-full object-contain drop-shadow-md" />
        </div>
        <div>
          <h1 className="font-bold text-xl tracking-tight text-foreground" style={{ fontFamily: "'Quicksand', sans-serif" }}>Dozy</h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
              <span>{item.label}</span>
              
              {item.badge && (
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {item.badge}
                </span>
              )}
              {item.showSpinner && (
                <span className="ml-auto w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              )}
              {item.showDot && (
                <span className="ml-auto w-2 h-2 rounded-full bg-[hsl(var(--brand-violet))]" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer Navigation */}
      <div className="mt-auto p-4 border-t border-border/50 flex items-center justify-between">
        <div className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider">
          Dozy v1.0.0
        </div>
        <ThemeToggle />
      </div>
    </aside>
  )
}
