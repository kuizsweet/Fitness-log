// Types for the vendored Lens gesture controller; implementation retains upstream physics.
export class JellyController {
  constructor(stage: HTMLElement, renderer: null, options?: { intensity?: number });
  reduced: boolean;
  register(element: HTMLElement, options: {
    source: HTMLElement;
    mode: "segment";
    segments: () => HTMLAnchorElement[];
    onCommit: (selected: HTMLAnchorElement) => void;
  }): unknown;
  target(element: HTMLElement, x: number, y?: number, options?: { snap?: boolean }): void;
  cancel(snap?: boolean): void;
  destroy(): void;
}
