"use client";
import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { languageMorphPose, LANGUAGE_MORPH_SPRING } from "@/lib/language-morph";
import { useLanguage } from "./LanguageProvider";
import styles from "./LanguageMorphButton.module.css";

export function LanguageMorphButton() {
  const { language, setLanguage } = useLanguage();
  const english = language === "en";
  const reduced = useReducedMotion();
  const target = useMotionValue(english ? 1 : 0);
  const progress = useSpring(target, LANGUAGE_MORPH_SPRING);
  useEffect(() => {
    const next = english ? 1 : 0;
    target.set(next);
    if (reduced) progress.jump(next);
  }, [english, reduced, progress, target]);
  const zhX = useTransform(progress, (p) => languageMorphPose(p).zh.x);
  const zhY = useTransform(progress, (p) => languageMorphPose(p).zh.y);
  const zhScale = useTransform(progress, (p) => languageMorphPose(p).zh.scale);
  const zhOpacity = useTransform(
    progress,
    (p) => languageMorphPose(p).zh.opacity,
  );
  const enX = useTransform(progress, (p) => languageMorphPose(p).en.x);
  const enY = useTransform(progress, (p) => languageMorphPose(p).en.y);
  const enScale = useTransform(progress, (p) => languageMorphPose(p).en.scale);
  const enOpacity = useTransform(
    progress,
    (p) => languageMorphPose(p).en.opacity,
  );
  const label = english ? "切换为中文" : "Switch to English";
  return (
    <motion.button
      type="button"
      className={`header-icon-button language-morph-button ${styles.button}`}
      aria-label={label}
      title={label}
      aria-pressed={english}
      onClick={() => setLanguage(english ? "zh-CN" : "en")}
      whileTap={reduced ? undefined : { scale: 0.96 }}
      transition={LANGUAGE_MORPH_SPRING}
    >
      <span aria-hidden="true" className={styles.glyphs}>
        <motion.span
          data-language-glyph="zh"
          className={styles.glyph}
          style={{ x: zhX, y: zhY, scale: zhScale, opacity: zhOpacity }}
        >
          文
        </motion.span>
        <motion.span
          data-language-glyph="en"
          className={styles.glyph}
          style={{ x: enX, y: enY, scale: enScale, opacity: enOpacity }}
        >
          A
        </motion.span>
      </span>
    </motion.button>
  );
}
