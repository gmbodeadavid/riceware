/**
 * Stub viewer module for the 3D product viewer.
 * The full three.js implementation is a future deliverable.
 * This file satisfies the dynamic import in ProductViewerModal.tsx.
 */

export interface Viewer {
  showProduct(productId: string, optionId: string): void;
  setOption(optionId: string): void;
  dispose(): void;
}

export interface ViewerOptions {
  reducedMotion?: boolean;
  onUserOrbit?: () => void;
}

export function createViewer(_stage: HTMLElement, _options?: ViewerOptions): Viewer {
  // Stub: returns a no-op viewer until the real three.js implementation is added.
  return {
    showProduct() {},
    setOption() {},
    dispose() {},
  };
}
