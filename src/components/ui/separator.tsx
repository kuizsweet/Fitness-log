"use client";

import * as SeparatorPrimitive from "@radix-ui/react-separator";
import type { ComponentProps } from "react";
import styles from "./overlays.module.css";

export function Separator({
  className,
  decorative = true,
  orientation = "horizontal",
  ...props
}: ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={[styles.separator, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
