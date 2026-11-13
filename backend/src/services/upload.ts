import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { Request } from 'express';

function configureCloudinary() {
  if (hasUsableCloudinaryConfig()) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
}

configureCloudinary();

// Magic-byte signatures for allowed image and video types
const MAGIC_BYTES: { bytes: number[]; mime: string; offset?: number }[] = [
  { bytes: [0xFF, 0xD8, 0xFF], mime: 'image/jpeg' },                                // JPEG
  { bytes: [0x89, 0x50, 0x4E, 0x47], mime: 'image/png' },                           // PNG
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: 'image/webp' },                          // WebP (RIFF)
  { bytes: [0x47, 0x49, 0x46], mime: 'image/gif' },                                  // GIF87a / GIF89a
  { bytes: [0x66, 0x74, 0x79, 0x70], mime: 'video/mp4', offset: 4 },                // MP4 (ftyp at offset 4)
  { bytes: [0x1A, 0x45, 0xDF, 0xA3], mime: 'video/webm' },                          // WebM / Matroska
];

export function detectMimeFromBuffer(buffer: Buffer): string | null {
  for (const sig of MAGIC_BYTES) {
    const offset = sig.offset ?? 0;
    if (buffer.length >= offset + sig.bytes.length) {
      if (sig.bytes.every((b, i) => buffer[offset + i] === b)) {
        return sig.mime;
      }
    }
  }
  return null;
}

function hasUsableCloudinaryConfig(): boolean {
  const cloudinaryValues = [
    process.env.CLOUDINARY_CLOUD_NAME,
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET,
  ];

  return cloudinaryValues.every((value) => (
    Boolean(value) && !/^(your_|replace_with|<|>)/i.test(value!.trim())
  ));
}

// Multer for general image uploads (avatar, cover, post images)
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 6 },
  fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error('Only JPEG, PNG, WebP and GIF images are allowed'));
    } else {
      cb(null, true);
    }
  },
});

// Multer for post creation supporting both images and video (reels) up to 50MB
export const uploadMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 6 },
  fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error('Only JPEG, PNG, WebP, GIF images and MP4, WebM videos are allowed'));
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
  // Magic-byte validation — reject files that lie about their type
  const detectedMime = detectMimeFromBuffer(buffer);
  if (!detectedMime) {
    throw Object.assign(new Error('Invalid media file: unrecognized file signature'), { status: 422, isOperational: true });
  }

  // Graceful local development fallback if Cloudinary credentials are not configured.
  // Treat template placeholders as missing too; otherwise the SDK attempts a signed
  // request with values such as "your_api_key" and fails before the fallback runs.
  if (!hasUsableCloudinaryConfig()) {
    const base64 = buffer.toString('base64');
    const dataUri = `data:${detectedMime};base64,${base64}`;
    const id = publicId || `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return { url: dataUri, publicId: id };
  }

  const isVideo = detectedMime.startsWith('video/');

  return new Promise((resolve, reject) => {
    const options: Record<string, unknown> = {
      folder: `off-by-one/${folder}`,
      resource_type: isVideo ? 'video' : 'image',
      type: 'upload',
    };
    if (!isVideo) {
      options.transformation = [{ quality: 'auto', fetch_format: 'auto' }];
    }
    if (publicId) options.public_id = publicId;

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) return reject(error ?? new Error('Upload failed'));
      resolve({ url: result.secure_url, publicId: result.public_id });
    });
    stream.end(buffer);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  if (!publicId || publicId.startsWith('local_')) return;
  if (!process.env.CLOUDINARY_CLOUD_NAME) return;
  await cloudinary.uploader.destroy(publicId);
}
