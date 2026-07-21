import { FolderOpen, Cpu, Settings2, ShieldAlert, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface SettingsPanelProps {
  outputDir: string
  targetPlatforms: string[]
  onOutputDirChange: (dir: string) => void
  onPlatformsChange: (platforms: string[]) => void
}

const AVAILABLE_PLATFORMS = [
  { id: 'Win64', label: 'Windows (Win64)', description: 'Primary target for Fab/Marketplace' },
  { id: 'Linux', label: 'Linux', description: 'Cross-compile via UBT (if engine supports it)' }
]

export default function SettingsPanel({
  outputDir,
  targetPlatforms,
  onOutputDirChange,
  onPlatformsChange
}: SettingsPanelProps) {
  const [isWhitelisting, setIsWhitelisting] = useState(false)
  const handleBrowseOutput = async () => {
    const dir = await window.api.setOutputDir()
    if (dir) onOutputDirChange(dir)
  }

  const togglePlatform = (platformId: string) => {
    if (targetPlatforms.includes(platformId)) {
      // Don't allow removing the last platform
      if (targetPlatforms.length > 1) {
        onPlatformsChange(targetPlatforms.filter((p) => p !== platformId))
      }
    } else {
      onPlatformsChange([...targetPlatforms, platformId])
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          <Settings2 size={24} />
        </div>
        <div>
          <h1 className="section-title">Settings</h1>
          <p className="section-subtitle">Configure build output and target platforms</p>
        </div>
      </div>

      {/* Output Directory */}
      <div className="glass-card p-6">
        <div className="mb-4">
          <div className="text-sm font-semibold text-foreground mb-0.5">Output Directory</div>
          <div className="text-xs text-muted-foreground">
            Where build artifacts, logs, and submission zips are written
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <div
            className="flex-1 font-mono truncate px-3 py-2 bg-secondary border border-border/50 rounded-md text-xs text-secondary-foreground"
            title={outputDir || '(default: Dozy-Output/ next to plugin)'}
          >
            {outputDir || '(default: Dozy-Output/ next to plugin)'}
          </div>
          <button className="btn btn-secondary btn-sm gap-2 whitespace-nowrap" onClick={handleBrowseOutput}>
            <FolderOpen size={14} />
            Browse
          </button>
        </div>
      </div>

      {/* Target Platforms */}
      <div className="glass-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Cpu size={18} className="text-muted-foreground" />
          <div>
            <div className="text-sm font-semibold text-foreground mb-0.5">Target Platforms</div>
            <div className="text-xs text-muted-foreground">
              Platforms to compile for when building. At least one must be selected.
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {AVAILABLE_PLATFORMS.map((platform) => {
            const checked = targetPlatforms.includes(platform.id)
            return (
              <label
                key={platform.id}
                className={`relative flex items-center p-4 cursor-pointer rounded-lg border transition-all duration-200 ${
                  checked 
                    ? 'bg-primary/5 border-primary/30 shadow-sm' 
                    : 'bg-secondary/50 border-border/50 hover:bg-secondary'
                }`}
              >
                <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 mr-4">
                  <input
                    type="checkbox"
                    className="peer appearance-none w-5 h-5 border-2 border-muted-foreground/30 rounded focus:outline-none focus:ring-2 focus:ring-primary/50 checked:bg-primary checked:border-primary transition-all duration-200 cursor-pointer"
                    checked={checked}
                    onChange={() => togglePlatform(platform.id)}
                  />
                  <svg className="absolute text-primary-foreground opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity duration-200 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-semibold ${checked ? 'text-primary' : 'text-foreground'}`}>
                    {platform.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {platform.description}
                  </div>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Windows Security */}
      <div className="glass-card p-6 border-blue-500/20 bg-blue-500/5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-blue-500" />
            <div>
              <div className="text-sm font-semibold text-foreground mb-0.5">Windows Security</div>
              <div className="text-xs text-muted-foreground">
                Stop Windows Defender from incorrectly blocking UnrealBuildTool.
              </div>
            </div>
          </div>
          <button 
            className="btn btn-secondary btn-sm px-4 whitespace-nowrap flex items-center gap-2"
            disabled={isWhitelisting || !outputDir}
            onClick={async () => {
              try {
                setIsWhitelisting(true)
                await window.api.whitelistDefender(outputDir)
                
                // Keep the banner cache in sync
                const currentCache = JSON.parse(localStorage.getItem('whitelistedPaths') || '[]')
                if (!currentCache.includes(outputDir)) {
                  localStorage.setItem('whitelistedPaths', JSON.stringify([...currentCache, outputDir]))
                }
                
                alert('Successfully added the output folder to Windows Defender exclusions!')
              } catch (err) {
                alert(err instanceof Error ? err.message : 'Unknown error')
              } finally {
                setIsWhitelisting(false)
              }
            }}
          >
            {isWhitelisting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Whitelisting...
              </>
            ) : (
              <>
                Whitelist Output Folder
              </>
            )}
          </button>
        </div>
        <div className="text-[11px] text-muted-foreground leading-relaxed mt-2 opacity-90">
          UnrealBuildTool dynamically compiles C# code on the fly. Windows Defender Smart App Control often flags these unsigned temporary files and kills the build process. Clicking the button above will securely add your <span className="font-mono text-blue-400/80">Dozy-Output</span> folder to Defender's exclusion list. This requires an Administrator (UAC) prompt.
        </div>
      </div>
    </div>
  )
}
