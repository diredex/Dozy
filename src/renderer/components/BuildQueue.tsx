import { useRef, useEffect } from 'react'
import { Hourglass, Hammer, Package, CheckCircle2, XCircle, Ban, TerminalSquare } from 'lucide-react'
import type { BuildJob } from '../../shared/types'

interface BuildQueueProps {
  jobs: Map<string, BuildJob>
  isBuilding: boolean
  onCancel: () => void
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.FC<{ size: number; className?: string }> }> = {
  queued: { label: 'Queued', className: 'bg-muted text-muted-foreground', icon: Hourglass },
  building: { label: 'Building', className: 'bg-blue-500/10 text-blue-500', icon: Hammer },
  packaging: { label: 'Packaging', className: 'bg-purple-500/10 text-purple-500', icon: Package },
  success: { label: 'Success', className: 'bg-green-500/10 text-green-500', icon: CheckCircle2 },
  failed: { label: 'Failed', className: 'bg-red-500/10 text-red-500', icon: XCircle },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground', icon: Ban }
}

export default function BuildQueue({ jobs, isBuilding, onCancel }: BuildQueueProps) {
  const jobList = Array.from(jobs.values())
  const activeJob = jobList.find((j) => j.status === 'building' || j.status === 'packaging')
  const logEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeJob?.logLines.length])

  const completed = jobList.filter((j) => j.status === 'success' || j.status === 'failed')
  const total = jobList.length
  const progressPercent = total > 0 ? (completed.length / total) * 100 : 0

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="section-title">Build Queue</h1>
          <p className="section-subtitle">
            {isBuilding
              ? `Building… ${completed.length}/${total} complete`
              : `${completed.length}/${total} builds complete`}
          </p>
        </div>
        {isBuilding && (
          <button className="btn bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 px-4 py-2" onClick={onCancel}>
            Cancel Build
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Job list */}
      <div className="flex flex-col gap-3">
        {jobList.map((job) => {
          const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued
          const isActive = job.status === 'building' || job.status === 'packaging'
          const StatusIcon = config.icon

          return (
            <div
              key={job.engineVersion}
              className={`glass-card overflow-hidden transition-opacity duration-300 ${
                isActive ? 'ring-1 ring-primary border-transparent' : ''
              } ${job.status === 'queued' ? 'opacity-50' : 'opacity-100'}`}
            >
              {/* Job header */}
              <div className="flex items-center gap-4 p-4">
                {/* Spinner or icon */}
                <div className="w-6 flex justify-center text-muted-foreground">
                  {isActive ? (
                    <span className="spinner spinner-md text-primary" />
                  ) : (
                    <StatusIcon size={20} className={config.className.includes('text-') ? config.className.split(' ').find(c => c.startsWith('text-')) : ''} />
                  )}
                </div>

                {/* Version */}
                <div className="px-3 py-1 rounded-md bg-secondary text-sm font-bold font-mono tracking-tight text-foreground">
                  {job.engineVersion}
                </div>

                {/* Status tag */}
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${config.className}`}>
                  {config.label}
                </span>
                
              </div>

              {/* Live Log Terminal (only for active job) */}
              {isActive && (
                <div className="border-t border-border bg-black/40 dark:bg-black/80">
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/50 bg-black/20">
                    <TerminalSquare size={12} className="text-muted-foreground" />
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Live Output</span>
                  </div>
                  <div className="p-3 h-[240px] overflow-y-auto font-mono text-[11px] leading-relaxed select-text">
                    {job.logLines.length === 0 ? (
                      <div className="text-muted-foreground/50 italic">Waiting for compiler output...</div>
                    ) : (
                      job.logLines.map((line, i) => {
                        const isError = line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')
                        const isWarning = line.toLowerCase().includes('warning')
                        return (
                          <div 
                            key={i} 
                            className={`${isError ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-slate-300'} break-all mb-0.5 whitespace-pre-wrap`}
                          >
                            {line}
                          </div>
                        )
                      })
                    )}
                    <div ref={logEndRef} />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
