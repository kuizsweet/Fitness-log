"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import type { ComponentProps } from "react";
import styles from "./overlays.module.css";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export const DropdownMenuGroup = Menu.Group;
export const DropdownMenuRadioGroup = Menu.RadioGroup;
export const DropdownMenuPortal = Menu.Portal;
export const DropdownMenuSub = Menu.Sub;
export const DropdownMenuSubTrigger = Menu.SubTrigger;
export const DropdownMenuSubContent = Menu.SubContent;

export function DropdownMenuContent({
  className,
  sideOffset = 8,
  align = "end",
  ...props
}: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        align={align}
        className={[styles.menu, className].filter(Boolean).join(" ")}
        {...props}
      />
    </Menu.Portal>
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: ComponentProps<typeof Menu.Item>) {
  return (
    <Menu.Item
      data-slot="dropdown-menu-item"
      className={[styles.item, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof Menu.RadioItem>) {
  return (
    <Menu.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={[styles.item, styles.radioItem, className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
      <Menu.ItemIndicator className={styles.indicator} aria-hidden="true">
        ✓
      </Menu.ItemIndicator>
    </Menu.RadioItem>
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof Menu.Label>) {
  return (
    <Menu.Label
      className={[styles.label, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof Menu.Separator>) {
  return (
    <Menu.Separator
      className={[styles.separator, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
