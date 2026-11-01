import fs from 'node:fs/promises';
import path from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessPermission } from '@/lib/admin-auth';
import { productionErrorResponse } from '@/lib/production/api';

export const dynamic = 'force-dynamic';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const ALLOWED_3D_TYPES = new Set(['model/gltf-binary', 'model/gltf+json']);
const ALLOWED_3D_EXTENSIONS = new Set(['.glb', '.gltf']);
const ALLOWED_HTML_TYPES = new Set(['text/html', 'application/octet-stream', '']);

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

export async function POST(request: NextRequest) {
  const rejection = rejectUnlessPermission(request, 'catalog:manage');
  if (rejection) return rejection;

  try {
    const formData = await request.formData().catch(() => {
      throw new Error('Formulaire multipart invalide.');
    });

    const file = formData.get('fichier');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 });
    }

    const type = formData.get('type');
    if (type !== 'image' && type !== 'model3d' && type !== 'html3d') {
      return NextResponse.json(
        { error: 'Le champ "type" doit valoir "image", "model3d" ou "html3d".' },
        { status: 400 },
      );
    }

    const mime = file.type;
    const ext = path.extname(file.name).toLowerCase();

    if (type === 'image') {
      if (!ALLOWED_IMAGE_TYPES.has(mime)) {
        return NextResponse.json(
          { error: `Type MIME non autorisé pour une image : ${mime}. Formats acceptés : jpeg, png, webp, gif.` },
          { status: 400 },
        );
      }

      const filename = `${Date.now()}-${sanitizeFilename(file.name)}`;
      const dest = path.join(process.cwd(), 'public', 'produits', 'uploads', filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(dest, buffer);
      return NextResponse.json({ url: `/produits/uploads/${filename}` }, { status: 201 });
    }

    // html3d
    if (type === 'html3d') {
      if (mime !== 'text/html' && ext !== '.html') {
        return NextResponse.json(
          { error: `Type non autorisé pour un fichier HTML 3D : ${mime || ext}. Format accepté : .html.` },
          { status: 400 },
        );
      }
      const filename = `${Date.now()}-${sanitizeFilename(file.name)}`;
      const dest = path.join(process.cwd(), 'public', 'produits', '3d', filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(dest, buffer);
      return NextResponse.json({ url: `/produits/3d/${filename}` }, { status: 201 });
    }

    // model3d
    if (!ALLOWED_3D_TYPES.has(mime) && !ALLOWED_3D_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `Type non autorisé pour un modèle 3D : ${mime || ext}. Formats acceptés : glb, gltf.` },
        { status: 400 },
      );
    }

    const filename = `${Date.now()}-${sanitizeFilename(file.name)}`;
    const dest = path.join(process.cwd(), 'public', 'produits', '3d', filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(dest, buffer);
    return NextResponse.json({ url: `/produits/3d/${filename}` }, { status: 201 });
  } catch (error) {
    return productionErrorResponse(error, 'upload fichier produit');
  }
}
