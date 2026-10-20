export const LANGUAGE_MORPH_RADIUS = Math.hypot(5.5, 3.5);
export const LANGUAGE_MORPH_SPRING = {
  stiffness: 380,
  damping: 32,
  mass: 0.8,
} as const;

// One progress value drives both upright glyphs; no DOM swapping or rotation.
export function languageMorphPose(
  progress: number,
  radius = LANGUAGE_MORPH_RADIUS,
) {
  const angle = Math.PI * progress + Math.atan2(3.5, 5.5);
  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle);
  return {
    zh: {
      x: 0.7 - x,
      y: 1.5 - y,
      scale: 1 - 0.56 * progress,
      opacity: 1 - 0.38 * progress,
    },
    en: {
      x: 0.7 + x,
      y: 1.5 + y,
      scale: 0.44 + 0.56 * progress,
      opacity: 0.62 + 0.38 * progress,
    },
  };
}
