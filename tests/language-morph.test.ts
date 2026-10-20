import test from "node:test";
import assert from "node:assert/strict";
import {
  languageMorphPose,
  LANGUAGE_MORPH_RADIUS,
} from "../src/lib/language-morph";

test("language glyphs preserve opposite circular paths and exchange bottom-right secondary weight", () => {
  const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8);
  const start = languageMorphPose(0),
    end = languageMorphPose(1);
  close(start.zh.x, -4.8);
  close(start.zh.y, -2);
  close(start.en.x, 6.2);
  close(start.en.y, 5);
  close(end.zh.x, start.en.x);
  close(end.zh.y, start.en.y);
  close(end.en.x, start.zh.x);
  close(end.en.y, start.zh.y);
  close(start.en.scale, 0.44);
  close(end.zh.scale, 0.44);
  for (let i = 0; i <= 100; i++) {
    const pose = languageMorphPose(i / 100);
    close(Math.hypot(pose.zh.x - 0.7, pose.zh.y - 1.5), LANGUAGE_MORPH_RADIUS);
    close(pose.zh.x + pose.en.x, 1.4);
    close(pose.zh.y + pose.en.y, 3);
    close(pose.zh.scale + pose.en.scale, 1.44);
    assert.ok(pose.zh.opacity >= 0.62 && pose.en.opacity >= 0.62);
  }
});
