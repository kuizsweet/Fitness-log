"use client";
import { useRef, useState } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import styles from "./LibraryFilterMenu.module.css";
type Option = { value: string; label: string };
export function LibraryFilterMenu({
  label,
  kind,
  options,
  value,
  onSelect,
  open,
  onOpenChange,
}: {
  label: string;
  kind: "devices" | "muscles";
  options: Option[];
  value: string;
  onSelect: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [width, setWidth] = useState(220);
  const [triggerHeight, setTriggerHeight] = useState(32);
  const groups =
    kind === "muscles"
      ? [
          ["chest", "shoulders", "triceps"],
          ["lats", "upper-back", "lower-back", "traps", "biceps", "forearms"],
          [
            "quadriceps",
            "hamstrings",
            "glutes",
            "calves",
            "adductors",
            "abductors",
          ],
          ["abdominals", "neck", "full-body", "cardio"],
        ].map((values) =>
          values.flatMap((value) =>
            options.filter((option) => option.value === value),
          ),
        )
      : [options];
  const entries = groups.flatMap((group, index) => [
    ...(index > 0 ? [{ value: `separator-${index}`, label: "" }] : []),
    ...group,
  ]);
  const selected = options.find((option) => option.value === value);
  return (
    <>
      <Menu.Root
        open={open}
        modal={false}
        onOpenChange={(next) => {
          if (next) {
            setWidth(trigger.current?.parentElement?.clientWidth ?? 220);
            setTriggerHeight(trigger.current?.offsetHeight ?? 32);
          }
          onOpenChange(next);
        }}
      >
        <Menu.Trigger
          ref={trigger}
          className={styles.trigger}
          data-open={open || undefined}
          aria-label={label}
          onPointerDown={(event) => {
            if (event.button === 0) event.preventDefault();
          }}
          onClick={() => {
            setWidth(trigger.current?.parentElement?.clientWidth ?? 220);
            setTriggerHeight(trigger.current?.offsetHeight ?? 32);
            onOpenChange(!open);
          }}
        >
          <span className={styles.surface} />
          <span>{selected?.label ?? label}</span>
          <ChevronDown aria-hidden size={13} />
        </Menu.Trigger>
        <Menu.Portal>
            {/* Keep the portal and its text outside shared layout projection. */}
            <Menu.Content
              side="bottom"
              align={kind === "devices" ? "start" : "end"}
              sideOffset={-triggerHeight}
              collisionPadding={12}
              className={`${styles.positioner} ${styles.popup}`}
              style={{ width }}
              data-kind={kind}
              aria-label={label}
              onCloseAutoFocus={(event) => event.preventDefault()}
              onKeyDownCapture={(event) => {
                const columns = kind === "muscles" ? 3 : 2;
                const step = {
                  ArrowLeft: -1,
                  ArrowRight: 1,
                  ArrowUp: -columns,
                  ArrowDown: columns,
                }[event.key];
                if (step === undefined) return;
                const items = [
                  ...event.currentTarget.querySelectorAll<HTMLElement>(
                    '[role="menuitem"]',
                  ),
                ];
                const current = items.indexOf(
                  document.activeElement as HTMLElement,
                );
                if (current < 0) return;
                event.preventDefault();
                event.stopPropagation();
                items[
                  Math.max(0, Math.min(items.length - 1, current + step))
                ]?.focus();
              }}
            >
              <div className={styles.surface} />
              <div className={styles.options}>
                {entries.map((option) =>
                  option.value.startsWith("separator-") ? (
                    <span
                      key={option.value}
                      role="separator"
                      className={styles.separator}
                    />
                  ) : (
                    <Menu.Item
                      key={option.value}
                      textValue={option.label}
                      className={styles.item}
                      asChild
                    >
                      <button type="button" onClick={() => {
                        onSelect(value === option.value ? "all" : option.value);
                        onOpenChange(false);
                      }}>
                        <span>{option.label}</span>
                      </button>
                    </Menu.Item>
                  ),
                )}
              </div>
            </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
    </>
  );
}
