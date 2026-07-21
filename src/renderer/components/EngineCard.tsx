import { useState } from 'react'
import { ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, HardDrive, FileJson, Fingerprint } from 'lucide-react'
import type { EngineInstall, ToolchainReport } from '../../shared/types'
import DependencyList from './DependencyList'

interface EngineCardProps {
  engine: EngineInstall
  report: ToolchainReport | undefined
  selected: boolean
  onToggle: () => void
  onInstall: (componentId: string, vsInstallPath?: string) => Promise<void>
}

const SOURCE_ICONS: Record<string, React.FC<{ size: number }>> = {
  registry: Fingerprint,
  manifest: FileJson,
  manual: HardDrive
}

export default function EngineCard({ engine, report, selected, onToggle, onInstall }: EngineCardProps) {
  const [expanded, setExpanded] = useState(false)
  const missingCount = report?.missing.length || 0
  const isReady = missingCount === 0
  const SourceIcon = SOURCE_ICONS[engine.source] || SOURCE_ICONS.manual

  return (
    <div className={`glass-card p-4 overflow-hidden ${selected ? 'ring-2 ring-primary border-transparent' : 'hover:border-primary/30'}`}>
      <div
        className="flex items-center gap-4 cursor-pointer select-none"
        onClick={onToggle}
      >
        {/* Checkbox */}
        <div className="flex-shrink-0 relative flex items-center justify-center w-5 h-5">
          <input
            type="checkbox"
            className="peer appearance-none w-5 h-5 border-2 border-muted-foreground/30 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 checked:bg-primary checked:border-primary transition-all duration-200 cursor-pointer"
            checked={selected}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
          />
          <CheckCircle2 size={14} className="absolute text-primary-foreground opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity duration-200" strokeWidth={3} />
        </div>

        {/* Version Badge */}
        <div
          className={`px-3 py-1.5 rounded-md text-sm font-bold font-mono tracking-tight transition-colors duration-200 ${
            selected 
              ? 'bg-primary text-primary-foreground shadow-sm' 
              : 'bg-muted text-foreground'
          }`}
        >
          {engine.version}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="truncate text-xs font-mono text-muted-foreground" title={engine.path}>
            {engine.path}
          </div>
        </div>

        {/* Source tag */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-secondary/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          <SourceIcon size={12} />
          {engine.source}
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
          isReady 
            ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' 
            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
        }`}>
          {isReady ? (
            <>
              <CheckCircle2 size={14} />
              Ready
            </>
          ) : (
            <>
              <AlertTriangle size={14} />
              {missingCount} Missing
            </>
          )}
        </div>

        {/* Expand/collapse toggle for dependencies */}
        {!isReady && (
          <button
            className="btn btn-ghost btn-sm px-2 text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {/* Dependency list (expanded) */}
      {expanded && report && report.missing.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border animate-in slide-in-from-top-2 fade-in duration-200">
          <DependencyList
            components={report.missing}
            vsInstallPath={report.vsInstallPath}
            onInstall={onInstall}
          />
        </div>
      )}
    </div>
  )
}
