"use client";
// SunMoonIcon adapted from https://uiarc.dev/r/icon-morph.json (Arc Icon morph).
import {
  useId,
  useSyncExternalStore,
  type ReactNode,
  type SVGProps,
} from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";
const spring = {
  morph: { type: "spring", visualDuration: 0.42, bounce: 0.16 },
} as const;
const motionTokens = { duration: { fast: 0.16 } };
export interface IconMorphIconProps extends Omit<
  SVGProps<SVGSVGElement>,
  "ref" | "children"
> {
  /**
   * The second state of the icon. menu: close, play: pause, plus: check, copy: check,
   * theme: moon, chevron: turned, bell: notifications on, heart: liked.
   */
  state?: boolean;
  /** Rendered size in px. Defaults to 24. */
  size?: number;
  /** Stroke width in the 24 unit grid. Defaults to 1.75. */
  strokeWidth?: number;
}

const instant: Transition = { duration: 0 };
const subscribe = () => () => {};
function useReducedFlag() {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return !!useReducedMotion() && hydrated;
}
function useIds() {
  return useId().replace(/[^a-zA-Z0-9-]/g, "");
}
function Frame({
  size = 24,
  strokeWidth = 1.75,
  className,
  children,
  ...rest
}: IconMorphIconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ display: "block", flex: "none", overflow: "visible" }}
      {...rest}
    >
      {children}
    </svg>
  );
}

const RAYS = Array.from({ length: 8 }, (_, index) => {
  const angle = (index * Math.PI) / 4,
    c = Math.cos(angle),
    s = Math.sin(angle);
  const r = (value: number) => Math.round(value * 100) / 100;
  return `M${r(12 + c * 7.5)} ${r(12 + s * 7.5)} L${r(12 + c * 10)} ${r(12 + s * 10)}`;
});

export function SunMoonIcon({ state = false, ...props }: IconMorphIconProps) {
  const reduced = useReducedFlag();
  const id = useIds();
  const t = reduced ? instant : spring.morph;
  const disc = { r: state ? 8.5 : 4.5 };
  const shadow = state ? { cx: 18, cy: 6, r: 6.5 } : { cx: 30, cy: -6, r: 6.5 };
  return (
    <Frame {...props}>
      <defs>
        <mask
          id={`${id}-bite`}
          maskUnits="userSpaceOnUse"
          x="-8"
          y="-8"
          width="40"
          height="40"
        >
          <rect
            x="-8"
            y="-8"
            width="40"
            height="40"
            fill="white"
            stroke="none"
          />
          <motion.circle
            cx={30}
            cy={-6}
            r={6.5}
            fill="black"
            stroke="none"
            initial={false}
            animate={shadow}
            transition={t}
          />
        </mask>
        <clipPath id={`${id}-disc`}>
          <motion.circle
            cx={12}
            cy={12}
            r={4.5}
            initial={false}
            animate={disc}
            transition={t}
          />
        </clipPath>
      </defs>
      <motion.circle
        cx={12}
        cy={12}
        r={4.5}
        mask={`url(#${id}-bite)`}
        initial={false}
        animate={disc}
        transition={t}
      />
      <motion.circle
        cx={30}
        cy={-6}
        r={6.5}
        clipPath={`url(#${id}-disc)`}
        initial={false}
        animate={shadow}
        transition={t}
      />
      <motion.g
        initial={false}
        animate={
          state
            ? { rotate: 90, scale: 0.4, opacity: 0 }
            : { rotate: 0, scale: 1, opacity: 1 }
        }
        transition={
          reduced
            ? instant
            : {
                ...spring.morph,
                opacity: { duration: motionTokens.duration.fast },
              }
        }
      >
        {RAYS.map((d) => (
          <path key={d} d={d} />
        ))}
      </motion.g>
    </Frame>
  );
}
