export async function prepareAvatar(file: File): Promise<string> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 10 * 1024 * 1024
  )
    throw new Error("请选择 10MB 以内的 JPG、PNG 或 WebP 照片");
  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法处理照片");
    const side = Math.min(image.width, image.height);
    context.drawImage(
      image,
      (image.width - side) / 2,
      (image.height - side) / 2,
      side,
      side,
      0,
      0,
      64,
      64,
    );
    let data = canvas.toDataURL("image/webp", 0.78);
    if (data.length > 4000) data = canvas.toDataURL("image/webp", 0.45);
    if (!data.startsWith("data:image/webp;") || data.length > 4000)
      throw new Error("照片处理失败，请换一张照片");
    return data;
  } finally {
    image.close();
  }
}
