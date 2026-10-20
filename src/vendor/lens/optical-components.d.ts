export type DropOption = {
  value: string;
  label: string;
  icon?: string;
  disabled?: boolean;
};
export function createDropSelect(options: {
  label: string;
  options: DropOption[];
  value?: string;
  selectionColor?: string;
  dragLabel?: string;
  onChange?: (value: string) => void;
}): {
  element: HTMLDivElement;
  setValue(
    value: string,
    options?: { emit?: boolean; animate?: boolean },
  ): boolean;
  destroy(): void;
};
