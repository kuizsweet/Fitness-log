import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { preparePhoto } from "../src/lib/photos";
test("转换为受控尺寸 JPEG，剥离 EXIF", async () => {
  const original = await sharp({
    create: { width: 2000, height: 1000, channels: 3, background: "#eee" },
  })
    .jpeg()
    .withMetadata()
    .toBuffer();
  const result = await preparePhoto(original, "photo.jpg");
  const meta = await sharp(result).metadata();
  assert.equal(meta.format, "jpeg");
  assert.equal(meta.width, 1600);
  assert.equal(meta.exif, undefined);
});
test("HEIC 无法转换时明确说明，不能伪造上传成功", async () => {
  await assert.rejects(
    preparePhoto(Buffer.from("invalid"), "iphone.heic"),
    /JPEG/,
  );
  await assert.rejects(preparePhoto(Buffer.from("invalid"), "x.svg"), /仅支持/);
});
