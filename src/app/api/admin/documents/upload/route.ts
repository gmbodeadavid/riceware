import { NextResponse, type NextRequest } from 'next/server';
import { rejectUnlessAnyPermission } from '@/lib/admin-auth';
import { productionErrorResponse } from '@/lib/production/api';
import { storeProductionFile } from '@/lib/production/storage';

/** Import d’un justificatif ou d’une photo de lot. Champ : `file`. */
export async function POST(request: NextRequest) {
  const rejection = rejectUnlessAnyPermission(request, ['documents:write', 'lots:write']);
  if (rejection) return rejection;

  try {
    const formData = await request.formData().catch(() => null);
    const file = formData?.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Aucun fichier fourni.' }, { status: 400 });
    }

    const stored = await storeProductionFile(file);
    return NextResponse.json(stored, { status: 201 });
  } catch (error) {
    return productionErrorResponse(error, 'import de fichier');
  }
}
