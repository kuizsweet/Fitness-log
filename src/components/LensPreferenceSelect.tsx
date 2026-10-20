"use client";
import { useEffect, useRef } from "react";
import {
  createDropSelect,
  type DropOption,
} from "@/vendor/lens/optical-components";
import "@/vendor/lens/drop-select.css";
import styles from "./LensPreferenceSelect.module.css";

function Selector({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: DropOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<ReturnType<typeof createDropSelect> | null>(null);
  const change = useRef(onChange);
  useEffect(() => {
    change.current = onChange;
  }, [onChange]);
  useEffect(() => {
    const control = createDropSelect({
      label,
      options,
      value,
      dragLabel: "拖动透镜或点击选项",
      onChange: (next) => change.current(next),
    });
    instance.current = control;
    const node = host.current!;
    node.append(control.element);
    return () => {
      control.destroy();
      control.element.remove();
      instance.current = null;
    };
    // Defaults initialize the native controller once; external updates synchronize below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, options]);
  useEffect(() => {
    instance.current?.setValue(value);
  }, [value]);
  return <div ref={host} className={styles.selector} />;
}
export function LensPreferenceSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: DropOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={styles.inline}>
      <span className={styles.title}>{label}</span>
      <Selector
        label={label}
        options={options}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
