// Type augmentation — make window.api available in renderer with full types
import type { PbtApi } from '../preload/index'

declare global {
  interface Window {
    api: PbtApi
  }
}
