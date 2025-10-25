import { beforeEach, vi } from 'vitest';

class MockCanvasRenderingContext2D {
  fillStyle = '#000000';
  strokeStyle = '#000000';
  lineWidth = 1;
  
  beginPath = vi.fn();
  moveTo = vi.fn();
  lineTo = vi.fn();
  arc = vi.fn();
  stroke = vi.fn();
  fill = vi.fn();
  fillRect = vi.fn();
  clearRect = vi.fn();
  save = vi.fn();
  restore = vi.fn();
  translate = vi.fn();
  rotate = vi.fn();
  scale = vi.fn();
}

class MockHTMLCanvasElement {
  width = 800;
  height = 600;
  
  getContext = vi.fn(() => new MockCanvasRenderingContext2D());
  getBoundingClientRect = vi.fn(() => ({
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    toJSON: () => ({})
  }));
}

beforeEach(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: vi.fn(() => new MockCanvasRenderingContext2D()),
    writable: true
  });

  Object.defineProperty(global, 'performance', {
    value: {
      now: vi.fn(() => Date.now())
    },
    writable: true
  });

  Object.defineProperty(global, 'requestAnimationFrame', {
    value: vi.fn((callback: FrameRequestCallback) => {
      return setTimeout(() => callback(Date.now()), 16);
    }),
    writable: true
  });

  Object.defineProperty(global, 'cancelAnimationFrame', {
    value: vi.fn((id: number) => {
      clearTimeout(id);
    }),
    writable: true
  });

  Object.defineProperty(document, 'getElementById', {
    value: vi.fn((id: string) => {
      if (id === 'canvas') {
        return new MockHTMLCanvasElement();
      }
      return document.createElement('div');
    }),
    writable: true
  });
});

export const createMockCanvas = (): HTMLCanvasElement => {
  return new MockHTMLCanvasElement() as unknown as HTMLCanvasElement;
};

export const createMockContext = (): CanvasRenderingContext2D => {
  return new MockCanvasRenderingContext2D() as unknown as CanvasRenderingContext2D;
};