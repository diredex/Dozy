// App.tsx — Root layout + state management
// Three views: Engines (scan + deps), Build (picker + queue), Results

import { useReducer, useEffect, useCallback, useState } from 'react'
import { RefreshCw, Minus, Square, X, ShieldAlert, Loader2 } from 'lucide-react'
import type {
  EngineInstall,
  ToolchainReport,
  PluginInfo,
  BuildJob,
  BuildResult
} from '../shared/types'
import Sidebar from './components/Sidebar'
import PluginPicker from './components/PluginPicker'
import EngineCard from './components/EngineCard'
import BuildQueue from './components/BuildQueue'
import ResultsPanel from './components/ResultsPanel'
import SettingsPanel from './components/SettingsPanel'

// ── State ────────────────────────────────────────────────────

type View = 'engines' | 'build' | 'results' | 'settings'

interface AppState {
  view: View
  engines: EngineInstall[]
  toolchainReports: Map<string, ToolchainReport>
  selectedEngines: Set<string> // engine paths
  plugin: PluginInfo | null
  outputDir: string
  targetPlatforms: string[]
  buildJobs: Map<string, BuildJob> // keyed by engineVersion
  buildResults: BuildResult[]
  isScanning: boolean
  isBuilding: boolean
  scanError: string | null
}

type Action =
  | { type: 'SET_VIEW'; view: View }
  | { type: 'SET_ENGINES'; engines: EngineInstall[] }
  | { type: 'SET_TOOLCHAIN'; reports: ToolchainReport[] }
  | { type: 'TOGGLE_ENGINE'; path: string }
  | { type: 'SELECT_ALL_READY' }
  | { type: 'DESELECT_ALL' }
  | { type: 'SET_PLUGIN'; plugin: PluginInfo | null }
  | { type: 'SET_OUTPUT_DIR'; dir: string }
  | { type: 'SET_PLATFORMS'; platforms: string[] }
  | { type: 'SET_SCANNING'; scanning: boolean }
  | { type: 'SET_SCAN_ERROR'; error: string | null }
  | { type: 'SET_BUILDING'; building: boolean }
  | { type: 'UPDATE_BUILD_JOB'; job: BuildJob }
  | { type: 'ADD_BUILD_RESULT'; result: BuildResult }
  | { type: 'SET_BUILD_RESULTS'; results: BuildResult[] }
  | { type: 'CLEAR_BUILDS' }
  | { type: 'ADD_LOG_LINE'; engineVersion: string; line: string }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.view }

    case 'SET_ENGINES':
      return { ...state, engines: action.engines }

    case 'SET_TOOLCHAIN': {
      const map = new Map<string, ToolchainReport>()
      for (const r of action.reports) map.set(r.engineVersion, r)
      return { ...state, toolchainReports: map }
    }

    case 'TOGGLE_ENGINE': {
      const next = new Set(state.selectedEngines)
      if (next.has(action.path)) next.delete(action.path)
      else next.add(action.path)
      return { ...state, selectedEngines: next }
    }

    case 'SELECT_ALL_READY': {
      const next = new Set<string>()
      for (const e of state.engines) {
        const report = state.toolchainReports.get(e.version)
        if (!report || report.missing.length === 0) next.add(e.path)
      }
      return { ...state, selectedEngines: next }
    }

    case 'DESELECT_ALL':
      return { ...state, selectedEngines: new Set() }

    case 'SET_PLUGIN':
      return { ...state, plugin: action.plugin }

    case 'SET_OUTPUT_DIR':
      return { ...state, outputDir: action.dir }

    case 'SET_PLATFORMS':
      return { ...state, targetPlatforms: action.platforms }

    case 'SET_SCANNING':
      return { ...state, isScanning: action.scanning }

    case 'SET_SCAN_ERROR':
      return { ...state, scanError: action.error }

    case 'SET_BUILDING':
      return { ...state, isBuilding: action.building }

    case 'UPDATE_BUILD_JOB': {
      const jobs = new Map(state.buildJobs)
      jobs.set(action.job.engineVersion, action.job)
      return { ...state, buildJobs: jobs }
    }

    case 'ADD_BUILD_RESULT':
      return { ...state, buildResults: [...state.buildResults, action.result] }

    case 'SET_BUILD_RESULTS':
      return { ...state, buildResults: action.results, isBuilding: false, view: 'results' }

    case 'CLEAR_BUILDS':
      return { ...state, buildJobs: new Map(), buildResults: [] }

    case 'ADD_LOG_LINE': {
      const jobs = new Map(state.buildJobs)
      const existing = jobs.get(action.engineVersion)
      if (existing) {
        jobs.set(action.engineVersion, {
          ...existing,
          logLines: [...existing.logLines, action.line]
        })
      }
      return { ...state, buildJobs: jobs }
    }

    default:
      return state
  }
}

const initialState: AppState = {
  view: 'engines',
  engines: [],
  toolchainReports: new Map(),
  selectedEngines: new Set(),
  plugin: null,
  outputDir: '',
  targetPlatforms: ['Win64'],
  buildJobs: new Map(),
  buildResults: [],
  isScanning: false,
  isBuilding: false,
  scanError: null
}

// ── App Component ────────────────────────────────────────────

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  
  // Local cache for defender whitelisted paths to hide the banner
  const [whitelistedPaths, setWhitelistedPaths] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('whitelistedPaths') || '[]')
    } catch {
      return []
    }
  })
  const [isWhitelistingBanner, setIsWhitelistingBanner] = useState(false)
  const isBannerVisible = state.outputDir && !whitelistedPaths.includes(state.outputDir)

  // ── Auto-scan on mount ───────────────────────────────────
  const runScan = useCallback(async () => {
    dispatch({ type: 'SET_SCANNING', scanning: true })
    dispatch({ type: 'SET_SCAN_ERROR', error: null })
    try {
      const engines = await window.api.scanEngines()
      dispatch({ type: 'SET_ENGINES', engines })

      if (engines.length > 0) {
        const reports = await window.api.scanToolchain(engines)
        dispatch({ type: 'SET_TOOLCHAIN', reports })
      }
    } catch (err) {
      dispatch({
        type: 'SET_SCAN_ERROR',
        error: err instanceof Error ? err.message : 'Scan failed'
      })
    } finally {
      dispatch({ type: 'SET_SCANNING', scanning: false })
    }
  }, [])

  useEffect(() => {
    runScan()

    // Load output dir
    window.api.getOutputDir().then((dir) => {
      dispatch({ type: 'SET_OUTPUT_DIR', dir })
    })
  }, [runScan])

  // ── IPC event listeners ──────────────────────────────────
  useEffect(() => {
    const cleanups = [
      window.api.onBuildLog((data) => {
        dispatch({ type: 'ADD_LOG_LINE', engineVersion: data.engineVersion, line: data.line })
      }),
      window.api.onBuildProgress((job) => {
        dispatch({ type: 'UPDATE_BUILD_JOB', job })
      }),
      window.api.onBuildComplete((result) => {
        dispatch({ type: 'ADD_BUILD_RESULT', result })
      }),
      window.api.onBuildQueueDone((results) => {
        dispatch({ type: 'SET_BUILD_RESULTS', results })
      })
    ]

    return () => cleanups.forEach((fn) => fn())
  }, [])

  // ── Handlers ─────────────────────────────────────────────
  const handleAddEngine = async () => {
    const engine = await window.api.addEngine()
    if (engine) {
      await runScan() // Re-scan everything to get fresh toolchain state
    }
  }

  const handlePluginSelected = async (filePath: string) => {
    try {
      const info = await window.api.parsePlugin(filePath)
      dispatch({ type: 'SET_PLUGIN', plugin: info })
    } catch {
      // Invalid uplugin
    }
  }

  const handleStartBuild = async () => {
    if (!state.plugin || state.selectedEngines.size === 0) return

    dispatch({ type: 'CLEAR_BUILDS' })
    dispatch({ type: 'SET_BUILDING', building: true })
    dispatch({ type: 'SET_VIEW', view: 'build' })

    const selectedEngineList = state.engines.filter((e) => state.selectedEngines.has(e.path))

    // Initialize queued jobs
    for (const engine of selectedEngineList) {
      dispatch({
        type: 'UPDATE_BUILD_JOB',
        job: {
          engineVersion: engine.version,
          enginePath: engine.path,
          status: 'queued',
          logLines: []
        }
      })
    }

    await window.api.startBuild(
      state.plugin.filePath,
      selectedEngineList,
      state.outputDir,
      state.targetPlatforms
    )
  }

  const handleCancelBuild = async () => {
    await window.api.cancelBuild()
  }

  const handleInstallComponent = async (componentId: string, vsInstallPath?: string) => {
    await window.api.installComponent(componentId, vsInstallPath)
    // Re-scan after install
    await runScan()
  }

  const handleRetryBuild = async (engineVersion: string) => {
    if (!state.plugin) return
    const engine = state.engines.find((e) => e.version === engineVersion)
    if (!engine) return

    dispatch({ type: 'SET_BUILDING', building: true })
    dispatch({ type: 'SET_VIEW', view: 'build' })

    dispatch({
      type: 'UPDATE_BUILD_JOB',
      job: { engineVersion: engine.version, enginePath: engine.path, status: 'queued', logLines: [] }
    })

    await window.api.startBuild(
      state.plugin.filePath,
      [engine],
      state.outputDir,
      state.targetPlatforms
    )
  }

  // ── Computed values ──────────────────────────────────────
  const readyCount = state.engines.filter((e) => {
    const r = state.toolchainReports.get(e.version)
    return !r || r.missing.length === 0
  }).length

  const canBuild = state.plugin && state.selectedEngines.size > 0 && !state.isBuilding

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="app-layout">
      {/* Draggable Titlebar Area */}
      <div className="absolute top-0 left-0 right-32 h-9 titlebar-drag-region z-40 pointer-events-auto" />
      
      {/* Custom Titlebar Controls */}
      <div className="absolute top-0 right-0 h-9 flex items-center z-50 pointer-events-auto titlebar-nodrag-region">
        <button
          onClick={() => window.api?.minimize()}
          className="h-full px-4 inline-flex items-center justify-center text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          tabIndex={-1}
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => window.api?.maximize()}
          className="h-full px-4 inline-flex items-center justify-center text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          tabIndex={-1}
        >
          <Square size={12} />
        </button>
        <button
          onClick={() => window.api?.close()}
          className="h-full px-4 inline-flex items-center justify-center text-muted-foreground hover:bg-red-500 hover:text-white transition-colors"
          tabIndex={-1}
        >
          <X size={14} />
        </button>
      </div>
      
      <Sidebar
        activeView={state.view}
        onViewChange={(v) => dispatch({ type: 'SET_VIEW', view: v })}
        engineCount={state.engines.length}
        readyCount={readyCount}
        hasResults={state.buildResults.length > 0}
        isBuilding={state.isBuilding}
      />

      <main className="main-content pt-3">
        {state.view === 'engines' && (
          <div className="animate-in fade-in duration-300 flex flex-col gap-6">
            {/* Security Banner */}
            {isBannerVisible && (
              <div className="relative overflow-hidden rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 shadow-sm transition-all">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50" />
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg shrink-0">
                    <ShieldAlert size={20} className="text-blue-500" />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <h3 className="text-sm font-semibold text-blue-500 mb-1">Windows Defender Exclusion Recommended</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                      UnrealBuildTool dynamically generates code during the build process. Windows Defender (Smart App Control) often flags these unsigned temporary files and kills the build process. 
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <button 
                        className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white px-4 h-8 flex items-center gap-2 border-none shadow-sm shadow-blue-500/20"
                        disabled={isWhitelistingBanner}
                        onClick={async () => {
                          try {
                            setIsWhitelistingBanner(true)
                            await window.api.whitelistDefender(state.outputDir)
                            
                            const newPaths = [...whitelistedPaths, state.outputDir]
                            setWhitelistedPaths(newPaths)
                            localStorage.setItem('whitelistedPaths', JSON.stringify(newPaths))
                            
                            alert('Successfully added the output folder to Windows Defender exclusions!')
                          } catch (err) {
                            alert(err instanceof Error ? err.message : 'Unknown error')
                          } finally {
                            setIsWhitelistingBanner(false)
                          }
                        }}
                      >
                        {isWhitelistingBanner ? (
                          <><Loader2 size={14} className="animate-spin" /> Whitelisting...</>
                        ) : 'Whitelist Output Folder'}
                      </button>
                      <button 
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                        onClick={() => {
                          const newPaths = [...whitelistedPaths, state.outputDir]
                          setWhitelistedPaths(newPaths)
                          localStorage.setItem('whitelistedPaths', JSON.stringify(newPaths))
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Plugin Picker */}
            <PluginPicker plugin={state.plugin} onPluginSelected={handlePluginSelected} />

            {/* Engine List Header */}
            <div className="flex justify-between items-end">
              <div>
                <h1 className="section-title">Engine Installations</h1>
                <p className="section-subtitle">
                  {state.isScanning
                    ? 'Scanning for Unreal Engine installations…'
                    : `${state.engines.length} engine${state.engines.length !== 1 ? 's' : ''} found · ${readyCount} ready`}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm" onClick={() => dispatch({ type: 'SELECT_ALL_READY' })}>
                  Select All Ready
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => dispatch({ type: 'DESELECT_ALL' })}>
                  Deselect All
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleAddEngine}>
                  + Add Engine
                </button>
                <button className="btn btn-ghost btn-sm gap-2" onClick={runScan} disabled={state.isScanning}>
                  {state.isScanning ? <span className="spinner spinner-sm" /> : <RefreshCw size={14} />} 
                  <span>Rescan</span>
                </button>
              </div>
            </div>

            {state.scanError && (
              <div className="glass-card" style={{ borderColor: 'var(--status-error)', color: 'var(--status-error)' }}>
                {state.scanError}
              </div>
            )}

            {state.isScanning && state.engines.length === 0 && (
              <div className="flex justify-center p-12">
                <div className="spinner spinner-md" />
              </div>
            )}

            {/* Engine Cards */}
            <div className="flex flex-col gap-3">
              {state.engines.map((engine) => (
                <EngineCard
                  key={engine.path}
                  engine={engine}
                  report={state.toolchainReports.get(engine.version)}
                  selected={state.selectedEngines.has(engine.path)}
                  onToggle={() => dispatch({ type: 'TOGGLE_ENGINE', path: engine.path })}
                  onInstall={handleInstallComponent}
                />
              ))}
            </div>

            {state.engines.length === 0 && !state.isScanning && (
              <div className="glass-card text-center p-12">
                <p className="text-muted-foreground mb-3">
                  No Unreal Engine installations detected
                </p>
                <button className="btn btn-default" onClick={handleAddEngine}>
                  Add Engine Manually
                </button>
              </div>
            )}

            {/* Build Button */}
            {state.engines.length > 0 && (
              <div className="flex justify-end pt-2">
                <button className="btn btn-default btn-lg flex items-center gap-2" onClick={handleStartBuild} disabled={!canBuild}>
                  {state.isBuilding ? (
                    <>
                      <span className="spinner spinner-sm" /> Building…
                    </>
                  ) : (
                    `Build Selected (${state.selectedEngines.size})`
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {state.view === 'build' && (
          <div className="animate-fade-in">
            <BuildQueue
              jobs={state.buildJobs}
              isBuilding={state.isBuilding}
              onCancel={handleCancelBuild}
            />
          </div>
        )}

        {state.view === 'results' && (
          <div className="animate-fade-in">
            <ResultsPanel results={state.buildResults} onRetry={handleRetryBuild} />
          </div>
        )}

        {state.view === 'settings' && (
          <div className="animate-fade-in">
            <SettingsPanel
              outputDir={state.outputDir}
              targetPlatforms={state.targetPlatforms}
              onOutputDirChange={(dir: string) => dispatch({ type: 'SET_OUTPUT_DIR', dir })}
              onPlatformsChange={(p: string[]) => dispatch({ type: 'SET_PLATFORMS', platforms: p })}
            />
          </div>
        )}
      </main>
    </div>
  )
}
