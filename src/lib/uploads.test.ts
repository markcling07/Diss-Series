import path from 'path';
import { describe, expect, it } from 'vitest';
import { UPLOADS_DIR } from './env';
import {
  ALLOWED_FORMATS,
  contentTypeFor,
  resolveInsideUploads,
  thumbRelativePath,
} from './uploads';

// resolveInsideUploads is the boundary between a database string and a real
// filesystem path. It gates both deletion and reading, so a hole here is either
// arbitrary file disclosure or arbitrary deletion.

describe('resolveInsideUploads', () => {
  it('resolves an ordinary generated filename', () => {
    const resolved = resolveInsideUploads('1785336635681_db525a52.jpg');
    expect(resolved).toBe(path.resolve(UPLOADS_DIR, '1785336635681_db525a52.jpg'));
  });

  it('resolves a thumbnail path', () => {
    const resolved = resolveInsideUploads('thumbs/1785336635681_db525a52.webp');
    expect(resolved).toBe(
      path.resolve(UPLOADS_DIR, 'thumbs', '1785336635681_db525a52.webp')
    );
  });

  it.each([
    ['../package.json'],
    ['../../package.json'],
    ['../../../prisma/dev.db'],
    ['thumbs/../../package.json'],
    ['foo/../../bar'],
  ])('rejects traversal: %s', (candidate) => {
    expect(resolveInsideUploads(candidate)).toBeNull();
  });

  it('rejects a bare .. segment even when it would resolve back inside', () => {
    // 'thumbs/../a.jpg' lands inside the root once resolved, so a prefix check
    // alone would accept it. It is still not a name this app generates, and
    // accepting it would mean the prefix check is the only thing standing
    // between a malformed row and the filesystem.
    expect(resolveInsideUploads('thumbs/../a.jpg')).toBeNull();
  });

  it('rejects absolute paths', () => {
    expect(resolveInsideUploads('C:\\Windows\\System32\\drivers\\etc\\hosts')).toBeNull();
    expect(resolveInsideUploads('/etc/passwd')).toBeNull();
  });

  it('rejects backslash traversal, not just forward slash', () => {
    // Windows accepts both separators, so checking only '/' would leave a gap
    // on the platform this is developed on.
    expect(resolveInsideUploads('..\\package.json')).toBeNull();
    expect(resolveInsideUploads('thumbs\\..\\..\\package.json')).toBeNull();
  });
});

describe('contentTypeFor', () => {
  it('maps every allowed format extension to its MIME type', () => {
    for (const { ext, mime } of Object.values(ALLOWED_FORMATS)) {
      expect(contentTypeFor(`file${ext}`)).toBe(mime);
    }
  });

  it('is case-insensitive about the extension', () => {
    expect(contentTypeFor('PHOTO.JPG')).toBe('image/jpeg');
  });

  it.each(['page.html', 'script.js', 'doc.pdf', 'archive.zip', 'noextension'])(
    'refuses to type %s',
    (name) => {
      // Returning null is what makes the serving route 404 rather than guess.
      // If this ever returned a default, a non-image that reached the uploads
      // directory would become servable.
      expect(contentTypeFor(name)).toBeNull();
    }
  );

  it('does not type a double extension by its first half', () => {
    expect(contentTypeFor('evil.jpg.html')).toBeNull();
  });
});

describe('ALLOWED_FORMATS', () => {
  it('has no duplicate extensions, so the reverse mapping is unambiguous', () => {
    const extensions = Object.values(ALLOWED_FORMATS).map((f) => f.ext);
    expect(new Set(extensions).size).toBe(extensions.length);
  });

  it('uses lowercase, dot-prefixed extensions', () => {
    for (const { ext } of Object.values(ALLOWED_FORMATS)) {
      expect(ext).toMatch(/^\.[a-z0-9]+$/);
    }
  });
});

describe('thumbRelativePath', () => {
  it('prefixes with the thumbs directory using a forward slash', () => {
    // Stored in the database and later embedded in a URL, so the separator has
    // to be the URL one regardless of platform.
    expect(thumbRelativePath('abc.webp')).toBe('thumbs/abc.webp');
  });
});
