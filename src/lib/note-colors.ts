import { gray, grayDark, red, redDark, orange, orangeDark, amber, amberDark, green, greenDark, teal, tealDark, indigo, indigoDark, violet, violetDark } from "@radix-ui/colors";

export const NOTE_PALETTE = [
  { id: "red", label: "赤色", light: red.red3, dark: redDark.red3, border: red.red7, darkBorder: redDark.red7 },
  { id: "orange", label: "橙色", light: orange.orange3, dark: orangeDark.orange3, border: orange.orange7, darkBorder: orangeDark.orange7 },
  { id: "yellow", label: "黄色", light: amber.amber3, dark: amberDark.amber3, border: amber.amber7, darkBorder: amberDark.amber7 },
  { id: "green", label: "绿色", light: green.green3, dark: greenDark.green3, border: green.green7, darkBorder: greenDark.green7 },
  { id: "cyan", label: "青色", light: teal.teal3, dark: tealDark.teal3, border: teal.teal7, darkBorder: tealDark.teal7 },
  { id: "blue", label: "蓝色", light: indigo.indigo3, dark: indigoDark.indigo3, border: indigo.indigo7, darkBorder: indigoDark.indigo7 },
  { id: "purple", label: "紫色", light: violet.violet3, dark: violetDark.violet3, border: violet.violet7, darkBorder: violetDark.violet7 },
] as const;
export const NOTE_ALL_PALETTE = [
  { id: "gray", label: "灰色", light: gray.gray3, dark: grayDark.gray3, border: gray.gray7, darkBorder: grayDark.gray7 },
  ...NOTE_PALETTE,
] as const;
export type NoteColor = (typeof NOTE_ALL_PALETTE)[number]["id"];
export const NOTE_COLOR_NAMES = NOTE_ALL_PALETTE.map(color => color.id);
export const NOTE_COLORS = Object.fromEntries(NOTE_ALL_PALETTE.map(color => [color.id, color.light])) as Record<NoteColor, string>;
export const NOTE_PALETTE_CSS = { ...Object.fromEntries(NOTE_ALL_PALETTE.flatMap(color => [
  [`--note-${color.id}-light`, color.light], [`--note-${color.id}-dark`, color.dark],
  [`--note-${color.id}-border-light`, color.border], [`--note-${color.id}-border-dark`, color.darkBorder],
])), "--note-selection-ring": gray.gray12 };

export function toggleNoteColor(current: NoteColor | undefined, selected: NoteColor): NoteColor {
  return current === selected ? "gray" : selected;
}
export function noteColorArc(index: number) {
  const angle = (135 - index * 30) * Math.PI / 180;
  return { x: Math.round(66 * Math.cos(angle)), y: Math.round(66 * Math.sin(angle)) };
}
