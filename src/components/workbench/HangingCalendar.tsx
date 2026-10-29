"use client";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./TrainingWorkbench.module.css";

export function HangingCalendar({ children }: { children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const rope = useRef<SVGPathElement>(null);
  useEffect(() => {
    const root = host.current,
      paper = root?.querySelector<HTMLElement>("section");
    if (!root || !paper) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      last = 0,
      x = 0,
      y = 0,
      a = 0,
      vx = 0,
      vy = 0,
      va = 0;
    let geometry = {
      width: paper.offsetWidth,
      left: paper.offsetLeft,
      top: paper.offsetTop,
      hostWidth: root.clientWidth,
    };
    let drag: {
      id: number;
      sx: number;
      sy: number;
      x: number;
      y: number;
      lastX: number;
      lastY: number;
      time: number;
    } | null = null;
    let pointer: { x: number; y: number; time: number } | null = null;
    let pointerSpeed = { x: 0, y: 0, time: 0 };
    let armed = true;
    let contact: {
      left: number;
      right: number;
      top: number;
      bottom: number;
      x: number;
      y: number;
    } | null = null;
    const trackPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const moved =
        pointer &&
        Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 0.5;
      if (!armed && !drag && contact && moved && paper) {
        // Use the edge saved at contact, not the oscillating paper bounds.
        // Only a real pointer move beyond this fixed 10px boundary can re-arm it.
        const gap = 10;
        const outside =
          event.clientX < contact.left - gap ||
          event.clientX > contact.right + gap ||
          event.clientY < contact.top - gap ||
          event.clientY > contact.bottom + gap;
        if (outside) armed = true;
      }
      // Animated geometry must not manufacture new pointer collisions.
      // Only real mouse movement can enter the contact state.
      if (moved && armed && !drag && paper) {
        const rect = paper.getBoundingClientRect();
        if (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        )
          enter(event);
      }
      if (pointer) {
        const dt = event.timeStamp - pointer.time;
        if (dt > 0 && dt < 100)
          pointerSpeed = {
            x: ((event.clientX - pointer.x) * 1000) / dt,
            y: ((event.clientY - pointer.y) * 1000) / dt,
            time: event.timeStamp,
          };
      }
      pointer = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    };
    function draw() {
      if (!root || !paper) return;
      const { width, left, top, hostWidth } = geometry,
        pivot = width / 2;
      const angle = (reduced.matches ? 0 : (-2 * Math.PI) / 180) + a;
      paper.style.transformOrigin = `${pivot}px 0px`;
      paper.style.transform = `translate(${x}px,${y}px) rotate(${(angle * 180) / Math.PI}deg)`;
      const point = (p: number) => ({
        x: left + x + pivot + (p - pivot) * Math.cos(angle) - Math.sin(angle),
        y: top + y + (p - pivot) * Math.sin(angle) + Math.cos(angle),
      });
      const l = point(58.5),
        r = point(width - 58.5);
      rope.current?.setAttribute(
        "d",
        `M-18 ${top - 9} Q${l.x / 2} ${l.y - 2} ${l.x} ${l.y} Q${(l.x + r.x) / 2} ${Math.max(l.y, r.y) + 8} ${r.x} ${r.y} Q${hostWidth - 12} ${r.y - 9} ${hostWidth + 10} -20`,
      );
    }
    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
    }
    function tick(t: number) {
      const dt = Math.min((t - last) / 1000 || 0, 0.025);
      last = t;
      vx += (-100 * x - 10 * vx) * dt;
      vy += (-100 * y - 10 * vy) * dt;
      va += (-15 * a - 3.5 * va) * dt;
      x += vx * dt;
      y += vy * dt;
      a += va * dt;
      draw();
      if (
        Math.abs(x) + Math.abs(y) > 0.03 ||
        Math.abs(vx) + Math.abs(vy) > 0.1 ||
        Math.abs(a) > 0.00005 ||
        Math.abs(va) > 0.0001
      ) {
        frame = requestAnimationFrame(tick);
      } else {
        x = y = a = vx = vy = va = 0;
        frame = 0;
        last = 0;
        draw();
      }
    }
    function settle() {
      stop();
      if (reduced.matches) {
        x = y = a = vx = vy = va = 0;
        draw();
      } else frame = requestAnimationFrame(tick);
    }
    const enter = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || drag || reduced.matches || !armed)
        return;
      if (!paper) return;
      // Push inward from the edge the pointer actually touches, never along the old swing.
      const rect = paper.getBoundingClientRect();
      armed = false;
      contact = {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        x: event.clientX,
        y: event.clientY,
      };
      const edges = [
        { distance: Math.abs(event.clientX - rect.left), dx: 1, dy: 0 },
        { distance: Math.abs(event.clientX - rect.right), dx: -1, dy: 0 },
        { distance: Math.abs(event.clientY - rect.top), dx: 0, dy: 1 },
        { distance: Math.abs(event.clientY - rect.bottom), dx: 0, dy: -1 },
      ];
      const push = edges.reduce((nearest, edge) =>
        edge.distance < nearest.distance ? edge : nearest,
      );
      const clamp = (value: number, limit: number) =>
        Math.max(-limit, Math.min(limit, value));
      // No minimum kick: an almost stationary pointer must not create a large swing.
      const dt = pointer ? event.timeStamp - pointer.time : 0;
      const sample =
        pointer && dt > 0 && dt < 100
          ? {
              x: ((event.clientX - pointer.x) * 1000) / dt,
              y: ((event.clientY - pointer.y) * 1000) / dt,
            }
          : event.timeStamp - pointerSpeed.time < 100
            ? pointerSpeed
            : { x: 0, y: 0 };
      const speed = Math.max(0, sample.x * push.dx + sample.y * push.dy);
      const strength = Math.min(1.5, speed / 1000);
      if (strength < 0.01) return;
      vx = clamp(vx + push.dx * 140 * strength, 220);
      vy = clamp(vy + push.dy * 100 * strength, 160);
      // A sideways push below the clips produces torque in the opposite angular direction.
      const lever = Math.max(
        0.25,
        Math.min(1, (event.clientY - rect.top) / rect.height),
      );
      const horizontal =
        (event.clientX - (rect.left + rect.width / 2)) / rect.width;
      va = clamp(
        va + (-push.dx * 0.5 * lever + push.dy * horizontal * 0.5) * strength,
        0.65,
      );
      if (!frame) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };
    const down = (event: PointerEvent) => {
      const target = event.target as Element;
      if (
        event.button !== 0 ||
        !paper?.contains(target) ||
        target.closest(
          'button,input,a,select,[role="spinbutton"],[role="checkbox"]',
        )
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      stop();
      armed = false;
      const bounds = paper.getBoundingClientRect();
      contact = {
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        bottom: bounds.bottom,
        x: event.clientX,
        y: event.clientY,
      };
      drag = {
        id: event.pointerId,
        sx: event.clientX,
        sy: event.clientY,
        x,
        y,
        lastX: x,
        lastY: y,
        time: event.timeStamp,
      };
      vx = vy = va = 0;
      root?.setPointerCapture(event.pointerId);
      paper.dataset.tugging = "true";
    };
    const move = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const resist = (d: number, limit: number) =>
        Math.sign(d) * limit * (1 - Math.exp(-Math.abs(d) / limit));
      x = drag.x + resist(event.clientX - drag.sx, 64);
      y = drag.y + resist(event.clientY - drag.sy, 48);
      const dt = Math.max(0.008, (event.timeStamp - drag.time) / 1000);
      vx = Math.max(-240, Math.min(240, (x - drag.lastX) / dt));
      vy = Math.max(-240, Math.min(240, (y - drag.lastY) / dt));
      a = Math.max(-0.12, Math.min(0.12, x * 0.0018));
      va = vx * 0.0018;
      drag.lastX = x;
      drag.lastY = y;
      drag.time = event.timeStamp;
      draw();
    };
    const up = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const id = drag.id;
      if (event.type === "pointercancel" || event.timeStamp - drag.time > 80)
        vx = vy = va = 0;
      drag = null;
      delete paper?.dataset.tugging;
      if (root?.hasPointerCapture(id)) root.releasePointerCapture(id);
      settle();
    };
    const cancel = () => {
      if (!drag) return;
      drag = null;
      delete paper?.dataset.tugging;
      vx = vy = va = 0;
      settle();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    const observer = new ResizeObserver(() => {
      geometry = {
        width: paper!.offsetWidth,
        left: paper!.offsetLeft,
        top: paper!.offsetTop,
        hostWidth: root!.clientWidth,
      };
      draw();
    });
    observer.observe(paper);
    observer.observe(root);
    const media = () => {
      cancel();
      stop();
      x = y = a = vx = vy = va = 0;
      draw();
    };
    window.addEventListener("pointermove", trackPointer, { passive: true });
    root.addEventListener("pointerdown", down);
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerup", up);
    root.addEventListener("pointercancel", up);
    root.addEventListener("lostpointercapture", cancel);
    window.addEventListener("keydown", key);
    reduced.addEventListener("change", media);
    draw();
    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener("pointermove", trackPointer);
      root.removeEventListener("pointerdown", down);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerup", up);
      root.removeEventListener("pointercancel", up);
      root.removeEventListener("lostpointercapture", cancel);
      window.removeEventListener("keydown", key);
      reduced.removeEventListener("change", media);
    };
  }, []);
  return (
    <div ref={host} className={styles.hangingCalendar}>
      <svg className={styles.calendarRope} aria-hidden>
        <path ref={rope} />
      </svg>
      {children}
    </div>
  );
}
