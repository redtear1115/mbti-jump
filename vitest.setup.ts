// Mock modules and globals for Node environment (Phaser requires them)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Mock the phaser3spectorjs module which Phaser tries to require
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id: string) {
  if (id === 'phaser3spectorjs') {
    return { SPECTOR: { Capture: { Watch: {} } } };
  }
  return originalRequire.apply(this, arguments as any);
};

if (typeof window === 'undefined') {
  const mockCanvas = {
    getContext: () => ({
      fillStyle: '#fff',
      fillRect: () => {},
      strokeRect: () => {},
      fillText: () => {},
      drawImage: () => {},
      createImageData: () => ({ data: new Uint8ClampedArray(4) }),
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      putImageData: () => {},
      clearRect: () => {},
      save: () => {},
      restore: () => {},
      globalCompositeOperation: 'source-over',
    }),
    width: 800,
    height: 600,
  };

  const mockImage = class Image {
    src = '';
    onload: (() => void) | null = null;
    constructor() {
      // Fake onload call after small delay
      setTimeout(() => this.onload?.(), 0);
    }
  };

  const mockDocument = {
    hidden: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    createElement: (tag: string) => {
      if (tag === 'canvas') return mockCanvas;
      return { style: {}, addEventListener: () => {} };
    },
    documentElement: { style: {} },
    getElementsByTagName: () => [],
    head: { appendChild: () => {} },
    body: { appendChild: () => {} },
  };

  const mockWindow = {
    devicePixelRatio: 1,
    document: mockDocument,
    matchMedia: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }),
    requestAnimationFrame: (fn: Function) => { fn(0); return 0; },
    cancelAnimationFrame: () => {},
  };

  Object.defineProperty(global, 'window', { value: mockWindow, writable: true });
  Object.defineProperty(global, 'document', { value: mockDocument, writable: true });
  Object.defineProperty(global, 'Image', { value: mockImage, writable: true });
  Object.defineProperty(global, 'HTMLCanvasElement', { value: class HTMLCanvasElement {}, writable: true });
  Object.defineProperty(global, 'CanvasRenderingContext2D', { value: class {}, writable: true });
}
