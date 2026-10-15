"use client";
// Adapted from shadcn/ui's Radix Tabs (MIT). Styling stays in the PC dashboard.
// https://ui.shadcn.com/r/styles/new-york-v4/tabs.json
import type { ComponentProps } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

export function Tabs(props: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" {...props} />;
}
export function TabsList(props: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List data-slot="tabs-list" {...props} />;
}
export function TabsTrigger(
  props: ComponentProps<typeof TabsPrimitive.Trigger>,
) {
  return <TabsPrimitive.Trigger data-slot="tabs-trigger" {...props} />;
}
export function TabsContent(
  props: ComponentProps<typeof TabsPrimitive.Content>,
) {
  return <TabsPrimitive.Content data-slot="tabs-content" {...props} />;
}
