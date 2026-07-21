import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Check local storage first
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme')
      if (stored === 'dark' || stored === 'light') return stored
      // Check system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark'
      }
    }
    return 'dark' // default to dark
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
    
    // Tell main process to update native window colors
    if (window.api?.setTheme) {
      window.api.setTheme(theme === 'dark')
    }
  }, [theme])

  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none transition-colors"
      title="Toggle theme"
    >
      <Sun className="h-[1rem] w-[1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1rem] w-[1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
