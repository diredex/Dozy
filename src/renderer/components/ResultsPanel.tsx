import { useState } from 'react'
import { CheckCircle2, XCircle, FolderOpen, FileText, RotateCcw, PartyPopper, AlertTriangle, FileArchive, Wrench, Loader2 } from 'lucide-react'
import type { BuildResult, BuildJob } from '../../shared/types'

interface ResultsPanelProps {
  results: BuildResult[]
  buildJobs?: Map<string, BuildJob>
  onRetry: (engineVersion: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ResultsPanel({ results, buildJobs, onRetry }: ResultsPanelProps) {
  const [isFixing, setIsFixing] = useState<string | null>(null)
  const [patchedEngines, setPatchedEngines] = useState<Set<string>>(new Set())
  const [dotnetOpened, setDotnetOpened] = useState<Set<string>>(new Set())

  const addPatchedEngine = (ver: string) => {
    setPatchedEngines(prev => new Set(prev).add(ver))
  }

  const addDotnetOpened = (ver: string) => {
    setDotnetOpened(prev => new Set(prev).add(ver))
  }

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
        {results.map((result) => {
          const activeJob = buildJobs?.get(result.engineVersion)
          const isActivelyBuilding = activeJob && ['queued', 'building', 'packaging'].includes(activeJob.status)

          return (
            <div
              key={result.engineVersion}
              className={`glass-card p-4 overflow-hidden transition-all duration-300 ${
                result.success ? 'hover:border-green-500/30' : isActivelyBuilding ? 'border-primary/40 bg-primary/5' : 'hover:border-red-500/30'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Status icon */}
                <div className={result.success ? 'text-green-500' : isActivelyBuilding ? 'text-primary' : 'text-red-500'}>
                  {result.success ? <CheckCircle2 size={22} /> : isActivelyBuilding ? <Loader2 size={22} className="animate-spin" /> : <XCircle size={22} />}
                </div>

                {/* Version */}
                <span className="font-mono text-sm font-bold tracking-tight text-foreground bg-secondary px-2.5 py-1 rounded-md">
                  UE {result.engineVersion}
                </span>

                {/* Status badge */}
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                  result.success ? 'bg-green-500/10 text-green-500' : isActivelyBuilding ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-500'
                }`}>
                  {result.success ? 'Success' : isActivelyBuilding ? (activeJob?.status || 'Building') : 'Failed'}
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

                  {!result.success && !isActivelyBuilding && (
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

              {/* Active build banner OR Error snippet */}
              {isActivelyBuilding ? (
                <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <Loader2 size={18} className="animate-spin text-primary shrink-0" />
                    <div>
                      <span className="font-semibold">Rebuilding plugin for UE {result.engineVersion}...</span>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {activeJob?.status === 'queued' && 'Waiting in queue for build process...'}
                        {activeJob?.status === 'building' && 'Running UnrealBuildTool... Compile in progress.'}
                        {activeJob?.status === 'packaging' && 'Packaging release zip archive...'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : !result.success && result.errorSummary ? (
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
                        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 text-emerald-500 text-xs font-medium">
                              <div className="relative flex items-center justify-center shrink-0 w-8 h-8 rounded-full bg-emerald-500/15">
                                <Loader2 size={20} className="animate-spin text-emerald-500" />
                              </div>
                              <div>
                                <div className="font-semibold text-sm flex flex-wrap items-center gap-2">
                                  <span className="flex items-center gap-1.5"><CheckCircle2 size={16} /> Engine Source Patched!</span>
                                  <span className="text-[10px] bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-full animate-pulse font-mono font-bold tracking-wider">
                                    PREPARING REBUILD...
                                  </span>
                                </div>
                                <div className="text-[11px] text-emerald-500/90 mt-0.5">
                                  Macro polyfill injected into ConcurrentLinearAllocator.h. Initializing UnrealBuildTool...
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="w-full bg-emerald-500/20 h-1 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full w-full animate-pulse rounded-full" />
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            className="btn bg-emerald-600 hover:bg-emerald-500 text-white px-4 gap-2 h-8 text-xs font-semibold w-full sm:w-auto transition-colors shadow-sm"
                            disabled={isFixing === result.engineVersion}
                            onClick={async () => {
                              try {
                                setIsFixing(result.engineVersion)
                                await window.api.patchUE51EngineBug(result.enginePath)
                                addPatchedEngine(result.engineVersion)
                                setTimeout(() => {
                                  onRetry(result.engineVersion)
                                }, 1200)
                              } catch (err) {
                                alert(err instanceof Error ? err.message : 'Unknown error')
                              } finally {
                                setIsFixing(null)
                              }
                            }}
                          >
                            {isFixing === result.engineVersion ? (
                              <>
                                <Loader2 size={14} className="animate-spin text-white" />
                                Step 1/2: Patching Engine Source...
                              </>
                            ) : (
                              <>
                                <Wrench size={14} className="text-white" />
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
                            className="btn bg-orange-600 hover:bg-orange-500 text-white px-4 gap-2 h-8 text-xs font-semibold w-full sm:w-auto transition-colors shadow-sm"
                            disabled={isFixing === result.engineVersion}
                            onClick={async () => {
                              try {
                                setIsFixing(result.engineVersion)
                                await window.api.installDotnetRuntime()
                                addDotnetOpened(result.engineVersion)
                              } catch (err) {
                                alert(err instanceof Error ? err.message : 'Unknown error')
                              } finally {
                                setIsFixing(null)
                              }
                            }}
                          >
                            {isFixing === result.engineVersion ? (
                              <>
                                <Loader2 size={14} className="animate-spin text-white" />
                                Opening Download Page...
                              </>
                            ) : (
                              <>
                                <Wrench size={14} className="text-white" />
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
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
