import { put } from '@vercel/blob';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 4 * 1024 * 1024; // 4 MB

export async function POST(request: Request) {
  await requireAdmin();

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: 'Only PNG, JPEG, and WebP images are allowed' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: 'File must be under 4 MB' }, { status: 400 });
  }

  try {
    const blob = await put(`meals/${Date.now()}-${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });
    return Response.json({ url: blob.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    if (message.includes('private store')) {
      return Response.json(
        {
          error:
            'Your Vercel Blob store is set to private. Meal photos are shown publicly, ' +
            'so this app needs a Blob store with public access. Create a public Blob ' +
            'store in the Vercel dashboard and set its BLOB_READ_WRITE_TOKEN.',
        },
        { status: 400 },
      );
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
