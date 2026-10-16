"use client";
// shadcn/ui Base composition, with scoped styles and an optional portal container.
import { Popover as Primitive } from "@base-ui/react/popover";
import styles from "./popover.module.css";
export const Popover = Primitive.Root;
export const PopoverTrigger = Primitive.Trigger;
export const PopoverTitle = Primitive.Title;
export function PopoverContent({
  container,
  align = "start",
  side = "bottom",
  sideOffset = 4,
  className,
  ...props
}: Primitive.Popup.Props &
  Pick<Primitive.Positioner.Props, "align" | "side" | "sideOffset"> &
  Pick<Primitive.Portal.Props, "container">) {
  return (
    <Primitive.Portal container={container}>
      <Primitive.Positioner
        className={styles.positioner}
        align={align}
        side={side}
        sideOffset={sideOffset}
      >
        <Primitive.Popup
          data-slot="popover-content"
          className={[styles.popup, className].filter(Boolean).join(" ")}
          {...props}
        />
      </Primitive.Positioner>
    </Primitive.Portal>
  );
}
