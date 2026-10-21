// Types for the vendored Lens gesture controller; implementation retains upstream physics.
export class JellyController {
  constructor(
    stage: HTMLElement,
    renderer: null,
    options?: { intensity?: number },
  );
  reduced: boolean;
  register<T extends HTMLElement>(
    element: HTMLElement,
    options: {
      source: HTMLElement;
      mode: "segment";
      segments: () => T[];
      onCommit: (selected: T) => void;
    },
  ): unknown;
  target(
    element: HTMLElement,
    x: number,
    y?: number,
    options?: { snap?: boolean },
  ): void;
  cancel(snap?: boolean): void;
  destroy(): void;
}
