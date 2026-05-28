/**
 * File Path Sanitization Utilities
 * Prevents path traversal attacks in file uploads
 */

/**
 * Sanitize file name to prevent path traversal and malicious characters
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    return 'unnamed-file';
  }

  // Remove path traversal sequences
  let sanitized = fileName
    .replace(/\.\./g, '') // Remove .. sequences
    .replace(/[\/\\]/g, '_') // Replace path separators with underscore
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Remove special characters except dots, dashes, underscores
    .trim();

  // Remove leading/trailing dots and dashes
  sanitized = sanitized.replace(/^[._-]+|[._-]+$/g, '');

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    sanitized = sanitized.substring(0, 255 - ext.length) + ext;
  }

  // Ensure it's not empty
  if (!sanitized || sanitized.length === 0) {
    sanitized = 'unnamed-file';
  }

  return sanitized;
}

/**
 * Sanitize path segments to prevent path traversal
 */
export function sanitizePathSegment(segment: string): string {
  if (!segment || typeof segment !== 'string') {
    return '';
  }

  // Remove path traversal and special characters
  return segment
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .substring(0, 100); // Limit segment length
}

/**
 * Build safe file path from segments
 */
export function buildSafePath(segments: string[], fileName: string): string {
  // Sanitize all segments
  const sanitizedSegments = segments
    .map(seg => sanitizePathSegment(seg))
    .filter(seg => seg.length > 0);

  // Sanitize file name
  const sanitizedFileName = sanitizeFileName(fileName);

  // Join with forward slash
  return sanitizedSegments.length > 0
    ? `${sanitizedSegments.join('/')}/${sanitizedFileName}`
    : sanitizedFileName;
}

/**
 * Validate file path doesn't escape base directory
 */
export function validatePathWithinBase(path: string, baseDir: string = ''): boolean {
  // Resolve path to check for traversal
  const normalizedPath = path.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
  const normalizedBase = baseDir.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');

  // Check if path contains traversal
  if (normalizedPath.includes('..')) {
    return false;
  }

  // If base directory specified, ensure path is within it
  if (baseDir && !normalizedPath.startsWith(normalizedBase)) {
    return false;
  }

  return true;
}
