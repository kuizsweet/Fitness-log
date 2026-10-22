// Shared stopwatch arithmetic: read a clock; never accumulate interval ticks.
export function stopwatchElapsed(
  baseMs: number,
  startedAt: number | null,
  now: number,
) {
  return Math.max(
    0,
    baseMs + (startedAt === null ? 0 : Math.max(0, now - startedAt)),
  );
}
