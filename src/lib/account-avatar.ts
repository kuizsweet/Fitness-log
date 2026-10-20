import { z } from "zod";

// Only small, re-encoded raster thumbnails belong in account metadata.
export const avatarSchema = z
  .string()
  .max(4000)
  .refine((value) => {
    if (!/^data:image\/webp;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))
      return false;
    const bytes = Buffer.from(value.split(",")[1], "base64");
    return (
      bytes.length > 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    );
  }, "头像格式无效，请重新选择照片");

export type AccountIdentity = {
  name: string;
  email: string;
  avatar: string | null;
};
