"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { House, SlidersHorizontal, Utensils, Trophy } from "lucide-react";
import { JellyController } from "@/vendor/lens/jelly";
import styles from "./MobileDock.module.css";

const items = [
  { href: "/dashboard", label: "控制台", icon: House },
  { href: "/config", label: "配置", icon: SlidersHorizontal },
  { href: "/meals", label: "三餐", icon: Utensils },
  { href: "/leaderboard", label: "排行榜", icon: Trophy },
];
export function MobileDock() {
  const path = usePathname();
  const router = useRouter();
  const bar = useRef<HTMLElement>(null);
  const lens = useRef<HTMLSpanElement>(null);
  const physics = useRef<JellyController | null>(null);
  useEffect(() => {
    const host = bar.current!,
      indicator = lens.current!;
    const media = matchMedia(
      "(max-width:1199px), (pointer:coarse) and (max-width:1366px)",
    );
    let controller: JellyController | null = null;
    const align = () => {
      const selected = host.querySelector<HTMLElement>('[aria-current="page"]');
      if (!selected || !controller) return;
      indicator.style.width = `${selected.offsetWidth}px`;
      controller.target(indicator, selected.offsetLeft, 0, { snap: true });
    };
    const configure = () => {
      controller?.destroy();
      controller = null;
      physics.current = null;
      if (!media.matches) return;
      controller = new JellyController(host, null);
      physics.current = controller;
      controller.register(indicator, {
        source: host,
        mode: "segment",
        segments: () => [...host.querySelectorAll<HTMLAnchorElement>("a")],
        onCommit: (anchor: HTMLAnchorElement) =>
          router.push(anchor.getAttribute("href")!),
      });
      align();
    };
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => {
      if (controller) {
        controller.reduced = motion.matches;
        controller.cancel(true);
        align();
      }
    };
    const observer = new ResizeObserver(align);
    observer.observe(host);
    media.addEventListener("change", configure);
    motion.addEventListener("change", reduce);
    configure();
    return () => {
      observer.disconnect();
      media.removeEventListener("change", configure);
      motion.removeEventListener("change", reduce);
      controller?.destroy();
      physics.current = null;
    };
  }, [router]);
  useEffect(() => {
    const selected = bar.current?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    if (selected && lens.current) {
      lens.current.style.width = `${selected.offsetWidth}px`;
      physics.current?.target(lens.current, selected.offsetLeft, 0);
    }
  }, [path]);
  return (
    <nav ref={bar} className={styles.dock} aria-label="底部主要导航">
      <span ref={lens} className={styles.lens} aria-hidden="true" />
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={styles.item}
          aria-current={path === href ? "page" : undefined}
          onDragStart={(event) => event.preventDefault()}
        >
          <Icon aria-hidden="true" strokeWidth={1.8} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
