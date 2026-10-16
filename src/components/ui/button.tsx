"use client";
// shadcn/ui Base Button, adapted to this project's CSS Modules and tokens.
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import styles from "./body-controls.module.css";
export function Button({ className, ...props }: ButtonPrimitive.Props) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={[styles.button, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
