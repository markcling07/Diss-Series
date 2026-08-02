import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import type { ReadableOptions } from 'stream';
import { contentTypeFor, resolveInsideUploads } from '@/lib/uploads';

// Uploads are served through this handler rather than from public/ for three
// reasons, in order of how much they matter:
//
//   1. It is the only place we can force the response headers. User-supplied
//      bytes served from our own origin are dangerous exactly when the browser
//      is allowed to decide what they are; here the content type comes from a
//      closed allowlist and sniffing is turned off.
//   2. Uploads have to live on a volume that survives a deploy, which means
//      outside the application directory. Static serving cannot reach there.
//   3. It gives us one obvious place to add per-gallery access checks later,
//      should sharing ever stop being "whoever holds the code".

export const dynamic = 'force-dynamic';

function nodeStreamToWeb(nodePath: string, options?: ReadableOptions) {
  const nodeStream = createReadStream(nodePath, options);

  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk as Buffer)));
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (error) => controller.error(error));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filePath: string[] }> }
) {
  const { filePath } = await params;

  // Joined with '/' and handed to the resolver, which rejects absolute paths
  // and any '..' segment before touching the filesystem.
  const relative = filePath.join('/');
  const resolved = resolveInsideUploads(relative);

  if (!resolved) {
    return new NextResponse('Not found', { status: 404 });
  }

  // An unrecognised extension is treated as absent rather than guessed. Nothing
  // this app writes can land outside the allowlist, so reaching here means the
  // file did not come from the upload route.
  const contentType = contentTypeFor(relative);
  if (!contentType) {
    return new NextResponse('Not found', { status: 404 });
  }

  let fileStat;
  try {
    fileStat = await stat(resolved);
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }

  if (!fileStat.isFile()) {
    return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(nodeStreamToWeb(resolved), {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(fileStat.size),
      // Without this a browser may sniff past the declared type and execute
      // what it finds. It is the header that makes the allowlist binding.
      'X-Content-Type-Options': 'nosniff',
      // Belt and braces: even if something non-image were ever served from
      // here, it would download rather than render in the origin's context.
      'Content-Disposition': 'inline',
      // Filenames contain 12 random bytes and content at a given name never
      // changes, so these are safe to cache hard.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
