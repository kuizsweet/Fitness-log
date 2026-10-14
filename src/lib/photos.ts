import sharp from "sharp";
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // Below Vercel's 4.5 MB function body limit.
export async function preparePhoto(
  bytes: Buffer,
  name: string,
): Promise<Buffer> {
  if (bytes.length > MAX_PHOTO_BYTES || !bytes.length)
    throw new Error("照片需小于 3 MB；请先在手机压缩或导出较小的 JPEG。");
  if (!/\.(jpe?g|png|webp|heic|heif)$/i.test(name))
    throw new Error("仅支持 JPEG、PNG、WebP、HEIC/HEIF 图片。");
  try {
    const image = sharp(bytes, {
      limitInputPixels: 40_000_000,
      failOn: "error",
    });
    const meta = await image.metadata();
    if (!["jpeg", "png", "webp", "heif"].includes(meta.format ?? ""))
      throw new Error("图片格式无效");
    return await image
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch {
    throw new Error(
      /\.hei[cf]$/i.test(name)
        ? "此服务器无法解码这张 HEIC/HEIF。请在 iPhone 相册中导出 JPEG，或将相机格式设为“兼容性最佳”后重试。"
        : "图片损坏、像素过大或格式不受支持，请换一张图片。",
    );
  }
}
