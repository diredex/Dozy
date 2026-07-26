import { useState } from 'react'
import { CheckCircle2, XCircle, FolderOpen, FileText, RotateCcw, PartyPopper, AlertTriangle, FileArchive, Wrench, Loader2 } from 'lucide-react'
import type { BuildResult } from '../../shared/types'

interface ResultsPanelProps {
  results: BuildResult[]
  onRetry: (engineVersion: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ResultsPanel({ results, onRetry }: ResultsPanelProps) {
  const [isFixing, setIsFixing] = useState<string | null>(null)
  const [patchedEngines, setPatchedEngines] = useState<Set<string>>(new Set())
  const [dotnetOpened, setDotnetOpened] = useState<Set<string>>(new Set())

  const successCount = results.filter((r) => r.success).length
  const failCount = results.length - successCount

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="section-title">Build Results</h1>
        <p className="section-subtitle">
          {results.length > 0
            ? `${successCount} succeeded · ${failCount} failed`
            : 'No build results yet'}
        </p>
      </div>

      {/* Summary bar */}
      {results.length > 0 && (
        <div
          className={`glass-card flex items-center gap-5 p-5 ${
            failCount === 0 ? 'border-green-500/20 bg-green-500/5' : 'border-amber-500/20 bg-amber-500/5'
          }`}
        >
          <div className={`p-3 rounded-full ${failCount === 0 ? 'bg-green-500/20 text-green-500' : 'bg-amber-500/20 text-amber-500'}`}>
            {failCount === 0 ? <PartyPopper size={24} /> : <AlertTriangle size={24} />}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">
              {failCount === 0
                ? 'All builds succeeded!'
                : `${failCount} build${failCount > 1 ? 's' : ''} failed`}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {failCount === 0
                ? 'Submission-ready zips are in the output folder.'
                : 'Check error details below and retry failed builds.'}
            </div>
          </div>
          {successCount > 0 && results[0]?.zipPath && (
            <button
              className="btn btn-secondary btn-sm gap-2"
              onClick={() => {
                const zipDir = results.find((r) => r.zipPath)?.zipPath
                if (zipDir) {
                  const dir = zipDir.substring(0, zipDir.lastIndexOf('\\'))
                  window.api.openFolder(dir)
                }
              }}
            >
              <FolderOpen size={14} />
              Open Output Folder
            </button>
          )}
        </div>
      )}

      {/* Result cards */}
      <div className="flex flex-col gap-3">
        {results.map((result) => (
          <div
            key={result.engineVersion}
            className={`glass-card p-4 overflow-hidden transition-all duration-300 ${
              result.success ? 'hover:border-green-500/30' : 'hover:border-red-500/30'
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Status icon */}
              <div className={result.success ? 'text-green-500' : 'text-red-500'}>
                {result.success ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
              </div>

              {/* Version */}
              <span className="font-mono text-sm font-bold tracking-tight text-foreground bg-secondary px-2.5 py-1 rounded-md">
                UE {result.engineVersion}
              </span>

              {/* Status badge */}
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                result.success ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
              }`}>
                {result.success ? 'Success' : 'Failed'}
              </span>

              {/* Zip size */}
              {result.success && result.zipSizeBytes && (
                <span className="text-xs font-mono text-muted-foreground ml-2 flex items-center gap-1.5">
                  <FileArchive size={14} />
                  {formatBytes(result.zipSizeBytes)}
                </span>
              )}

              {/* Action Buttons */}
              <div className="ml-auto flex items-center gap-2">
                <button
                  className="btn btn-ghost btn-sm gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    if (result.logPath) {
                      window.api.openFolder(result.logPath)
                    }
                  }}
                  title="Open full build log"
                >
                  <FileText size={14} />
                  <span className="hidden sm:inline">View Log</span>
                </button>

                {!result.success && (
                  <button
                    className="btn btn-secondary btn-sm gap-2"
                    onClick={() => onRetry(result.engineVersion)}
                  >
                    <RotateCcw size={14} />
                    Retry
                  </button>
                )}
                
                {result.success && result.zipPath && (
                  <button
                    className="btn btn-secondary btn-sm gap-2"
                    onClick={() => {
                      if (result.zipPath) {
                        const dir = result.zipPath.substring(0, result.zipPath.lastIndexOf('\\'))
                        window.api.openFolder(dir)
                      }
                    }}
                  >
                    <FolderOpen size={14} />
                    Show
                  </button>
                )}
              </div>
            </div>

            {/* Error snippet */}
            {!result.success && result.errorSummary && (
              <div className="mt-4 p-4 rounded-lg bg-red-500/5 border border-red-500/10 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs font-mono text-red-500/90 whitespace-pre-wrap break-all leading-relaxed">
                    {result.errorSummary}
                  </div>
                </div>

                {result.actionableError === 'missing_ue51_toolchain' && (
                  <div className="mt-3 pt-3 border-t border-red-500/10">
                    {patchedEngines.has(result.engineVersion) ? (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-2.5 text-emerald-500 text-xs font-medium">
                          <CheckCircle2 size={16} className="shrink-0" />
                          <div>
                            <div className="font-semibold text-sm">✅ Engine source successfully patched!</div>
                            <div className="text-[11px] text-emerald-500/90 mt-0.5">Macro polyfill injected into ConcurrentLinearAllocator.h. Starting build retry in 2s...</div>
                          </div>
                        </div>
                        <button 
                          className="btn bg-emerald-500 hover:bg-emerald-600 text-white h-8 px-3 text-xs font-medium shrink-0 shadow-sm"
                          onClick={() => onRetry(result.engineVersion)}
                        >
                          <RotateCcw size={14} className="mr-1 inline" />
                          Retry Now
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          className="btn btn-secondary gap-2 h-8 text-xs font-medium w-full sm:w-auto hover:bg-primary hover:text-primary-foreground transition-colors"
                          disabled={isFixing === result.engineVersion}
                          onClick={async () => {
                            try {
                              setIsFixing(result.engineVersion)
                              await window.api.patchUE51EngineBug(result.enginePath)
                              setPatchedEngines(prev => new Set(prev).add(result.engineVersion))
                              setTimeout(() => {
                                onRetry(result.engineVersion)
                              }, 2200)
                            } catch (err) {
                              alert(err instanceof Error ? err.message : 'Unknown error')
                            } finally {
                              setIsFixing(null)
                            }
                          }}
                        >
                          {isFixing === result.engineVersion ? (
                            <>
                              <Loader2 size={14} className="animate-spin text-primary" />
                              Patching Engine Source...
                            </>
                          ) : (
                            <>
                              <Wrench size={14} className="text-primary" />
                              One-Click Fix: Patch Engine Source
                            </>
                          )}
                        </button>
                        <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed max-w-[500px]">
                          This will safely inject a tiny 3-line macro polyfill into UE {result.engineVersion}'s source code (<code className="bg-secondary px-1 py-0.5 rounded opacity-80">ConcurrentLinearAllocator.h</code>) to permanently fix the <code className="bg-secondary px-1 py-0.5 rounded opacity-80">__has_feature</code> bug on your machine. The build will auto-retry after patching.
                        </p>
                      </>
                    )}
                  </div>
                )}

                {result.actionableError === 'dotnet_binaryformatter' && (
                  <div className="mt-3 pt-3 border-t border-red-500/10">
                    {dotnetOpened.has(result.engineVersion) ? (
                      <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-2.5 text-orange-500 text-xs font-medium">
                          <CheckCircle2 size={16} className="shrink-0" />
                          <div>
                            <div className="font-semibold text-sm">🌐 Download page opened in browser!</div>
                            <div className="text-[11px] text-orange-500/90 mt-0.5">Please complete the .NET 8 Desktop Runtime setup, then click Retry below.</div>
                          </div>
                        </div>
                        <button 
                          className="btn bg-orange-500 hover:bg-orange-600 text-white h-8 px-3 text-xs font-medium shrink-0 shadow-sm"
                          onClick={() => onRetry(result.engineVersion)}
                        >
                          <RotateCcw size={14} className="mr-1 inline" />
                          Retry Build
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          className="btn btn-secondary gap-2 h-8 text-xs font-medium w-full sm:w-auto hover:bg-primary hover:text-primary-foreground transition-colors"
                          disabled={isFixing === result.engineVersion}
                          onClick={async () => {
                            try {
                              setIsFixing(result.engineVersion)
                              await window.api.installDotnetRuntime()
                              setDotnetOpened(prev => new Set(prev).add(result.engineVersion))
                            } catch (err) {
                              alert(err instanceof Error ? err.message : 'Unknown error')
                            } finally {
                              setIsFixing(null)
                            }
                          }}
                        >
                          {isFixing === result.engineVersion ? (
                            <>
                              <Loader2 size={14} className="animate-spin text-primary" />
                              Opening Download Page...
                            </>
                          ) : (
                            <>
                              <Wrench size={14} className="text-primary" />
                              One-Click Fix: Install .NET 8 Runtime
                            </>
                          )}
                        </button>
                        <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed max-w-[500px]">
                          UE {result.engineVersion}'s build tools use <code className="bg-secondary px-1 py-0.5 rounded opacity-80">BinaryFormatter</code> which was removed in .NET 9+. Install the <strong>.NET 8 Desktop Runtime</strong> from the download page, then retry the build.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
