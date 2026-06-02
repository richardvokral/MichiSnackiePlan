import { put } from '@vercel/blob';
import { requireAdmin } from '@/lib/auth';

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

  const blob = await put(`meals/${Date.now()}-${file.name}`, file, {
    access: 'public',
  });

  return Response.json({ url: blob.url });
}
