import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { Request } from 'express';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// FIX U-1: Magic-byte signatures for allowed image types
// These are the actual bytes at the start of valid image files
const MAGIC_BYTES: { bytes: number[]; mime: string }[] = [
  { bytes: [0xFF, 0xD8, 0xFF], mime: 'image/jpeg' },          // JPEG
  { bytes: [0x89, 0x50, 0x4E, 0x47], mime: 'image/png' },     // PNG
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: 'image/webp' },    // WebP (RIFF header)
  { bytes: [0x47, 0x49, 0x46], mime: 'image/gif' },            // GIF87a / GIF89a
];

function detectMimeFromBuffer(buffer: Buffer): string | null {
  for (const sig of MAGIC_BYTES) {
    if (sig.bytes.every((b, i) => buffer[i] === b)) return sig.mime;
  }
  return null;
}

// Multer: accept only known MIME types (client-declared) for early rejection.
// Real validation happens via magic bytes in uploadToCloudinary before any processing.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error('Only JPEG, PNG, WebP and GIF images are allowed'));
    } else {
      cb(null, true);
    }
  },
});

export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  publicId?: string
): Promise<{ url: string; publicId: string }> {
  // FIX U-1: magic-byte validation — reject files that lie about their type
  const detectedMime = detectMimeFromBuffer(buffer);
  if (!detectedMime) {
    throw Object.assign(new Error('Invalid image file: unrecognized file signature'), { status: 422, isOperational: true });
  }

  return new Promise((resolve, reject) => {
    const options: Record<string, unknown> = {
      folder: `off-by-one/${folder}`,
      resource_type: 'image',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      // Prevent remote URL fetching (SSRF protection)
      type: 'upload',
    };
    if (publicId) options.public_id = publicId;

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) return reject(error ?? new Error('Upload failed'));
      resolve({ url: result.secure_url, publicId: result.public_id });
    });
    stream.end(buffer);
  });
}

// FIX U-2: use stored publicId for deletion (not fragile regex on URL)
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
}
