import { describe, it, expect } from 'vitest';
import { detectMimeFromBuffer, uploadToCloudinary } from '../services/upload';
import cloudinaryPkg from 'cloudinary';
const cloudinary = cloudinaryPkg.v2;

describe('Media Upload & Magic-Byte Validation', () => {
  it('detects JPEG magic bytes correctly', () => {
    const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    expect(detectMimeFromBuffer(buf)).toBe('image/jpeg');
  });

  it('detects PNG magic bytes correctly', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    expect(detectMimeFromBuffer(buf)).toBe('image/png');
  });

  it('detects MP4 video magic bytes correctly', () => {
    const buf = Buffer.alloc(12);
    buf.writeUInt32BE(0, 0); // box size
    buf.write('ftyp', 4);     // ftyp box at offset 4
    expect(detectMimeFromBuffer(buf)).toBe('video/mp4');
  });

  it('rejects unrecognized file formats', () => {
    const buf = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);
    expect(detectMimeFromBuffer(buf)).toBeNull();
  });

  it('uses the local fallback when Cloudinary environment values are placeholders', async () => {
    const previous = {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    };

    process.env.CLOUDINARY_CLOUD_NAME = 'your_cloud_name';
    process.env.CLOUDINARY_API_KEY = 'your_api_key';
    process.env.CLOUDINARY_API_SECRET = 'your_api_secret';

    try {
      const uploaded = await uploadToCloudinary(
        Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        'acceptance',
        'local_acceptance',
      );

      expect(uploaded.publicId).toBe('local_acceptance');
      expect(uploaded.url.startsWith('data:image/png;base64,')).toBe(true);
    } finally {
      if (previous.cloudName === undefined) delete process.env.CLOUDINARY_CLOUD_NAME;
      else process.env.CLOUDINARY_CLOUD_NAME = previous.cloudName;
      if (previous.apiKey === undefined) delete process.env.CLOUDINARY_API_KEY;
      else process.env.CLOUDINARY_API_KEY = previous.apiKey;
      if (previous.apiSecret === undefined) delete process.env.CLOUDINARY_API_SECRET;
      else process.env.CLOUDINARY_API_SECRET = previous.apiSecret;
    }
  });

  it('verifies environment loading happens before service configuration and missing credentials trigger local fallback', async () => {
    const previous = {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    };

    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;

    try {
      const uploaded = await uploadToCloudinary(
        Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]),
        'fallback',
        'fallback_id',
      );
      expect(uploaded.publicId).toBe('fallback_id');
      expect(uploaded.url.startsWith('data:image/jpeg;base64,')).toBe(true);
    } finally {
      if (previous.cloudName !== undefined) process.env.CLOUDINARY_CLOUD_NAME = previous.cloudName;
      if (previous.apiKey !== undefined) process.env.CLOUDINARY_API_KEY = previous.apiKey;
      if (previous.apiSecret !== undefined) process.env.CLOUDINARY_API_SECRET = previous.apiSecret;
    }
  });
});
