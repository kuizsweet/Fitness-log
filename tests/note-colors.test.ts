import test from "node:test";
import assert from "node:assert/strict";
import { NOTE_PALETTE, noteColorArc, toggleNoteColor } from "../src/lib/note-colors";

test("seven hues remain ordered; clicking the selected hue clears it to gray", () => {
  assert.deepEqual(NOTE_PALETTE.map(color => color.id), ["red", "orange", "yellow", "green", "cyan", "blue", "purple"]);
  assert.equal(toggleNoteColor("blue", "blue"), "gray");
  assert.equal(toggleNoteColor("gray", "red"), "red");
  assert.equal(toggleNoteColor("red", "purple"), "purple");
});
test("palette preserves a rotated semicircle centered on the trigger", () => {
  const first = noteColorArc(0), last = noteColorArc(6);
  assert.deepEqual(first, { x: -47, y: 47 });
  assert.deepEqual(last, { x: 47, y: -47 });
  assert.equal(first.x + last.x, 0);
  assert.equal(first.y + last.y, 0);
  for (let index = 0; index < 7; index++) {
    const point = noteColorArc(index);
    assert.ok(Math.abs(Math.hypot(point.x, point.y) - 66) < 1);
    if (index > 0) {
      const previous = noteColorArc(index - 1);
      assert.ok(Math.hypot(point.x - previous.x, point.y - previous.y) > 28);
    }
  }
});
