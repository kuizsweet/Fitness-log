// Native, auth-scoped subset adapted from shadcn/ui's MIT-licensed card/input/field/button.
// See docs/auth-ui-refactor.md for upstream sources and third-party/shadcn-LICENSE.txt.
import type { ComponentProps } from "react";

export function Card(props: ComponentProps<"section">) {
  return <section data-slot="card" {...props} />;
}
export function CardHeader(props: ComponentProps<"div">) {
  return <div data-slot="card-header" {...props} />;
}
export function CardTitle(props: ComponentProps<"h1">) {
  return <h1 data-slot="card-title" {...props} />;
}
export function CardDescription(props: ComponentProps<"p">) {
  return <p data-slot="card-description" {...props} />;
}
export function CardContent(props: ComponentProps<"div">) {
  return <div data-slot="card-content" {...props} />;
}
export function FieldGroup(props: ComponentProps<"fieldset">) {
  return <fieldset data-slot="field-group" {...props} />;
}
export function Field(props: ComponentProps<"div">) {
  return <div data-slot="field" {...props} />;
}
export function FieldLabel(props: ComponentProps<"label">) {
  return <label data-slot="field-label" {...props} />;
}
export function FieldDescription(props: ComponentProps<"p">) {
  return <p data-slot="field-description" {...props} />;
}
export function Input(props: ComponentProps<"input">) {
  return <input data-slot="input" {...props} />;
}
export function Button({
  type = "button",
  ...props
}: ComponentProps<"button">) {
  return <button data-slot="button" type={type} {...props} />;
}
