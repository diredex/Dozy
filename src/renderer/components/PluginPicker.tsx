import { useState, useCallback } from 'react'
import { Plug2, UploadCloud, File, RefreshCw } from 'lucide-react'
import type { PluginInfo } from '../../shared/types'

interface PluginPickerProps {
  plugin: PluginInfo | null
  onPluginSelected: (filePath: string) => void
}

export default function PluginPicker({ plugin, onPluginSelected }: PluginPickerProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)

      const files = Array.from(e.dataTransfer.files)
      const upluginFile = files.find((f) => f.name.endsWith('.uplugin'))
      if (upluginFile) {
        // Electron provides the full path via .path property
        const filePath = (upluginFile as File & { path: string }).path
        if (filePath) onPluginSelected(filePath)
      }
    },
    [onPluginSelected]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleBrowse = useCallback(async () => {
    const filePath = await window.api.browsePlugin()
    if (filePath) onPluginSelected(filePath)
  }, [onPluginSelected])

  if (plugin) {
    return (
      <div className="glass-card ring-1 ring-primary/30 flex items-center gap-5 p-4 animate-in slide-in-from-top-2 fade-in duration-300">
        {/* Plugin icon */}
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md flex-shrink-0">
          <Plug2 size={24} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-bold text-foreground tracking-tight">{plugin.name}</span>
            {plugin.version && (
              <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                v{plugin.version}
              </span>
            )}
            {plugin.engineVersion && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase tracking-wider">
                UE {plugin.engineVersion}
              </span>
            )}
          </div>
          {plugin.description && (
            <p className="truncate text-xs text-muted-foreground max-w-2xl mb-1">
              {plugin.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/60 truncate">
            <File size={12} />
            {plugin.filePath}
          </div>
        </div>

        <button 
          className="btn btn-secondary btn-sm gap-2 whitespace-nowrap ml-4"
          onClick={handleBrowse}
        >
          <RefreshCw size={14} />
          <span className="hidden sm:inline">Change Plugin</span>
        </button>
      </div>
    )
  }

  return (
    <div
      className={`relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden ${
        isDragOver 
          ? 'border-[hsl(var(--brand-violet))] bg-[hsl(var(--brand-violet))]/5 scale-[1.01]' 
          : 'border-border bg-background/50 hover:border-muted-foreground/50 hover:bg-muted/50'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleBrowse}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20 pointer-events-none" />
      
      <div className={`p-4 rounded-full mb-4 transition-colors duration-300 ${
        isDragOver ? 'bg-[hsl(var(--brand-violet))]/20 text-[hsl(var(--brand-violet))]' : 'bg-secondary text-muted-foreground'
      }`}>
        <UploadCloud size={32} />
      </div>
      
      <h3 className="text-sm font-semibold text-foreground mb-1">
        Select a Plugin to Build
      </h3>
      <p className="text-xs text-muted-foreground text-center max-w-md">
        Drag and drop your <span className="font-mono bg-secondary px-1 py-0.5 rounded text-foreground">.uplugin</span> file here, or click to browse your computer.
      </p>
    </div>
  )
}
