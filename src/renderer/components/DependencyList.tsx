import { useState } from 'react'
import { Wrench, Box, Info } from 'lucide-react'
import type { ToolchainComponent } from '../../shared/types'

interface DependencyListProps {
  components: ToolchainComponent[]
  vsInstallPath?: string
  onInstall: (componentId: string, vsInstallPath?: string) => Promise<void>
}

export default function DependencyList({ components, vsInstallPath, onInstall }: DependencyListProps) {
  const [installing, setInstalling] = useState<Set<string>>(new Set())

  const handleInstall = async (componentId: string) => {
    setInstalling((prev) => new Set(prev).add(componentId))
    try {
      await onInstall(componentId, vsInstallPath)
    } finally {
      setInstalling((prev) => {
        const next = new Set(prev)
        next.delete(componentId)
        return next
      })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {components.map((comp) => {
        const isInstalling = installing.has(comp.id)
        return (
          <div
            key={comp.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border/50 transition-colors hover:border-border"
          >
            {/* Icon */}
            <div className={`p-2 rounded-md ${comp.kind === 'vs-component' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
              {comp.kind === 'vs-component' ? <Wrench size={16} /> : <Box size={16} />}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-foreground">
                {comp.displayName}
              </div>
              <div className="truncate font-mono text-[10px] text-muted-foreground mt-0.5">
                {comp.id}
              </div>
            </div>

            {/* Kind badge */}
            <span
              className={`hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                comp.kind === 'vs-component'
                  ? 'bg-blue-500/10 text-blue-500'
                  : 'bg-purple-500/10 text-purple-500'
              }`}
            >
              {comp.kind === 'vs-component' ? 'VS Component' : '.NET SDK'}
            </span>

            {/* Install button */}
            <button
              className="btn btn-default btn-sm min-w-[80px]"
              onClick={() => handleInstall(comp.id)}
              disabled={isInstalling}
            >
              {isInstalling ? (
                <span className="spinner spinner-sm" />
              ) : (
                'Install'
              )}
            </button>
          </div>
        )
      })}

      {/* Warning about install time */}
      <div className="flex items-start gap-2 mt-2 px-1 text-[11px] text-muted-foreground">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <p>
          Installing components will launch the Visual Studio Installer in the background. 
          This may require UAC elevation and can take a few minutes depending on your internet connection.
        </p>
      </div>
    </div>
  )
}
