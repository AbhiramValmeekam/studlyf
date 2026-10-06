/**
 * Identify an image by its magic bytes (never by the client-supplied filename or
 * Content-Type) and read its dimensions. SVG is deliberately unsupported: it can carry
 * script and would need a dedicated sanitiser.
 */
export function sniffImage(buf) {
  if (buf.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A, IHDR width/height at 16/20
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return {
      mimeType: 'image/png',
      extension: 'png',
      ...(buf.length >= 24 ? { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) } : {}),
    };
  }

  // GIF87a / GIF89a
  const head6 = buf.subarray(0, 6).toString('latin1');
  if (head6 === 'GIF87a' || head6 === 'GIF89a') {
    return { mimeType: 'image/gif', extension: 'gif', width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }

  // WEBP: "RIFF" .... "WEBP"
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') {
    return { mimeType: 'image/webp', extension: 'webp', ...webpSize(buf) };
  }

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg', ...jpegSize(buf) };
  }

  return null;
}

function webpSize(buf) {
  if (buf.length < 30) return {};
  const chunk = buf.subarray(12, 16).toString('latin1');
  if (chunk === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
  if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return {};
}

function jpegSize(buf) {
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) return {};
    const marker = buf[offset + 1];
    const length = buf.readUInt16BE(offset + 2);
    // SOF0..SOF15 except DHT(C4), JPG(C8), DAC(CC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return {};
}

/** PDF by magic bytes ("%PDF-"). Used for project supporting documents. */
export function sniffPdf(buf) {
  if (buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-') {
    return { mimeType: 'application/pdf', extension: 'pdf' };
  }
  return null;
}
