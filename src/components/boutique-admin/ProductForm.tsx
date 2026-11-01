'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { PRODUCT_COLORS } from '@/lib/boutique';
import type { ProductRow, ProductCategoryRow } from '@/lib/data/products';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PackDraft {
  packKey: string;
  label: string;
  quantity: number;
  priceValue: number;
  note: string;
}

interface FormState {
  // Section 1 — Identité
  name: string;
  slug: string;
  category: string;
  headline: string;
  summary: string;
  // Section 2 — Caractéristiques
  format: string;
  material: string;
  accent: 'paddy' | 'husk' | 'surface';
  // Section 3 — Statut
  status: 'Prototype' | 'Validé' | 'À venir';
  isPublished: boolean;
  isNew: boolean;
  sortOrder: number;
  // Section 4 — Prix
  currentPrice: string;
  oldPrice: string;
  // Section 5 — Packs
  packs: PackDraft[];
  // Section 6 — Médias
  image: string;
  imagesByColor: Record<string, string>;
  viewsByColor: Record<string, string[]>;
  model3dUrl: string;
}

export interface ProductFormProps {
  mode: 'create' | 'edit';
  initialData?: ProductRow;
  onSuccess: () => void;
}

// ─── Classes CSS réutilisables ────────────────────────────────────────────────

const inputCls =
  'w-full rounded-control border border-line bg-ground px-3 py-2 text-sm focus:border-paddy focus:outline-none focus:ring-1 focus:ring-paddy';
const labelCls = 'mb-1 block text-sm font-medium text-ink';
const sectionTitleCls = 'mb-4 text-base font-semibold text-ink';
const cardCls = 'rounded-xl border border-line bg-surface p-6';
const btnPrimary =
  'rounded-control bg-paddy px-4 py-2 text-sm font-medium text-on-paddy hover:bg-paddy-deep disabled:opacity-50';
const btnSecondary =
  'rounded-control border border-line px-4 py-2 text-sm hover:bg-grain/60 disabled:opacity-50';

// ─── Helper upload ────────────────────────────────────────────────────────────

async function uploadFile(file: File, type: 'image' | 'model3d'): Promise<string> {
  const fd = new FormData();
  fd.append('fichier', file);
  fd.append('type', type);
  const res = await fetch('/api/boutique-admin/upload', { method: 'POST', body: fd });
  if (!res.ok) throw new Error(await res.text());
  const { url } = (await res.json()) as { url: string };
  return url;
}

// ─── Génération de slug ───────────────────────────────────────────────────────

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// ─── État initial ─────────────────────────────────────────────────────────────

function buildInitialState(initialData?: ProductRow): FormState {
  if (!initialData) {
    return {
      name: '',
      slug: '',
      category: '',
      headline: '',
      summary: '',
      format: '',
      material: '',
      accent: 'paddy',
      status: 'Prototype',
      isPublished: true,
      isNew: false,
      sortOrder: 0,
      currentPrice: '',
      oldPrice: '',
      packs: [{ packKey: '10', label: 'Pack de 10 éléments', quantity: 10, priceValue: 0, note: '' }],
      image: '',
      imagesByColor: {},
      viewsByColor: {},
      model3dUrl: '',
    };
  }

  return {
    name: initialData.name,
    slug: initialData.slug,
    category: initialData.category,
    headline: initialData.headline,
    summary: initialData.summary,
    format: initialData.format,
    material: initialData.material,
    accent: (initialData.accent as 'paddy' | 'husk' | 'surface') ?? 'paddy',
    status: (initialData.status as 'Prototype' | 'Validé' | 'À venir') ?? 'Prototype',
    isPublished: initialData.isPublished,
    isNew: initialData.isNew,
    sortOrder: initialData.sortOrder,
    currentPrice: initialData.currentPrice,
    oldPrice: initialData.oldPrice,
    packs: initialData.packs.map((p) => ({
      packKey: p.packKey,
      label: p.label,
      quantity: p.quantity,
      priceValue: p.priceValue,
      note: p.note,
    })),
    image: initialData.image,
    imagesByColor: { ...initialData.imagesByColor },
    viewsByColor: { ...(initialData.viewsByColor ?? {}) },
    model3dUrl: initialData.model3dUrl ?? '',
  };
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ProductForm({ mode, initialData, onSuccess }: ProductFormProps) {
  const [form, setForm] = useState<FormState>(() => buildInitialState(initialData));
  const [slugManual, setSlugManual] = useState(mode === 'edit');

  // Catégories
  const [categories, setCategories] = useState<ProductCategoryRow[]>([]);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatLoading, setNewCatLoading] = useState(false);
  const [newCatError, setNewCatError] = useState('');

  // Upload states
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingColor, setUploadingColor] = useState<string | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [uploadingModel, setUploadingModel] = useState(false);
  const [uploadingHtml, setUploadingHtml] = useState(false);

  // Soumission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const imageInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const htmlInputRef = useRef<HTMLInputElement>(null);

  // Chargement des catégories
  useEffect(() => {
    fetch('/api/boutique-admin/categories')
      .then((r) => (r.ok ? (r.json() as Promise<ProductCategoryRow[]>) : Promise.reject()))
      .then((data) => setCategories(data))
      .catch(() => undefined);
  }, []);

  // Auto-génération du slug depuis le nom
  const handleNameChange = (value: string) => {
    setForm((f) => ({ ...f, name: value }));
    if (!slugManual) {
      setForm((f) => ({ ...f, name: value, slug: toSlug(value) }));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugManual(true);
    setForm((f) => ({ ...f, slug: value }));
  };

  // ─── Catégorie inline ──────────────────────────────────────────────────────

  const handleNewCatNameChange = (val: string) => {
    setNewCatName(val);
    setNewCatSlug(toSlug(val));
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim() || !newCatSlug.trim()) {
      setNewCatError('Nom et slug requis.');
      return;
    }
    setNewCatLoading(true);
    setNewCatError('');
    try {
      const r = await fetch('/api/boutique-admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim(), slug: newCatSlug.trim() }),
      });
      if (!r.ok) {
        const body = (await r.json()) as { error?: string };
        throw new Error(body.error ?? 'Erreur');
      }
      const cat = (await r.json()) as ProductCategoryRow;
      setCategories((prev) => [...prev, cat]);
      setForm((f) => ({ ...f, category: cat.slug }));
      setShowNewCat(false);
      setNewCatName('');
      setNewCatSlug('');
    } catch (err) {
      setNewCatError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setNewCatLoading(false);
    }
  };

  // ─── Packs ─────────────────────────────────────────────────────────────────

  const addPack = () => {
    setForm((f) => ({
      ...f,
      packs: [...f.packs, { packKey: String(Date.now()), label: '', quantity: 1, priceValue: 0, note: '' }],
    }));
  };

  const removePack = (idx: number) => {
    setForm((f) => ({ ...f, packs: f.packs.filter((_, i) => i !== idx) }));
  };

  const updatePack = (idx: number, field: keyof PackDraft, value: string | number) => {
    setForm((f) => ({
      ...f,
      packs: f.packs.map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
    }));
  };

  // ─── Upload image principale ───────────────────────────────────────────────

  const handleMainImageChange = async (file: File) => {
    setUploadingImage(true);
    try {
      const url = await uploadFile(file, 'image');
      setForm((f) => ({ ...f, image: url }));
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Erreur upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // ─── Upload image par couleur ──────────────────────────────────────────────

  const handleColorImageChange = async (colorId: string, file: File) => {
    setUploadingColor(colorId);
    try {
      const url = await uploadFile(file, 'image');
      setForm((f) => ({ ...f, imagesByColor: { ...f.imagesByColor, [colorId]: url } }));
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Erreur upload image couleur');
    } finally {
      setUploadingColor(null);
    }
  };

  // ─── Upload vue par couleur ────────────────────────────────────────────────

  const handleViewSlotChange = async (colorId: string, slotIndex: number, file: File) => {
    const key = `${colorId}-${slotIndex}`;
    setUploadingSlot(key);
    try {
      const url = await uploadFile(file, 'image');
      setForm((f) => {
        const current = f.viewsByColor[colorId] ?? [];
        const updated = [...current];
        updated[slotIndex] = url;
        return { ...f, viewsByColor: { ...f.viewsByColor, [colorId]: updated } };
      });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Erreur upload vue');
    } finally {
      setUploadingSlot(null);
    }
  };

  const removeViewSlot = (colorId: string, slotIndex: number) => {
    setForm((f) => {
      const current = f.viewsByColor[colorId] ?? [];
      const updated = [...current];
      updated[slotIndex] = '';
      return { ...f, viewsByColor: { ...f.viewsByColor, [colorId]: updated } };
    });
  };

  // ─── Upload modèle 3D ──────────────────────────────────────────────────────

  const handleModel3dChange = async (file: File) => {
    setUploadingModel(true);
    try {
      const url = await uploadFile(file, 'model3d');
      setForm((f) => ({ ...f, model3dUrl: url }));
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Erreur upload modèle 3D');
    } finally {
      setUploadingModel(false);
    }
  };

  // ─── Upload HTML 3D ────────────────────────────────────────────────────────

  const handleHtml3dChange = async (file: File) => {
    setUploadingHtml(true);
    try {
      const fd = new FormData();
      fd.append('fichier', file);
      fd.append('type', 'html3d');
      const res = await fetch('/api/boutique-admin/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(await res.text());
      const { url } = (await res.json()) as { url: string };
      setForm((f) => ({ ...f, model3dUrl: url }));
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Erreur upload HTML 3D');
    } finally {
      setUploadingHtml(false);
    }
  };

  // ─── Validation ────────────────────────────────────────────────────────────

  function validate(): string | null {
    if (!form.name.trim()) return 'Le nom est requis.';
    if (!form.slug.trim()) return 'Le slug est requis.';
    if (!/^[a-z0-9-]+$/.test(form.slug)) return 'Le slug doit être en minuscules, sans espaces ni caractères spéciaux (a-z, 0-9, -)';
    if (!form.summary.trim()) return 'Le résumé est requis.';
    if (!form.category) return 'La catégorie est requise.';
    if (!form.format.trim()) return 'Le format est requis.';
    if (!form.material.trim()) return 'Le matériau est requis.';
    if (!form.currentPrice.trim()) return 'Le prix actuel est requis.';
    if (form.packs.length === 0) return 'Au moins un pack est requis.';
    for (let i = 0; i < form.packs.length; i++) {
      const p = form.packs[i];
      if (!p.label.trim()) return `Pack ${i + 1} : le libellé est requis.`;
      if (!p.packKey.trim()) return `Pack ${i + 1} : la clé est requise.`;
      if (p.quantity < 1) return `Pack ${i + 1} : la quantité doit être ≥ 1.`;
      if (p.priceValue < 0) return `Pack ${i + 1} : le prix ne peut pas être négatif.`;
    }
    if (!form.image) return "L'image principale est requise.";
    return null;
  }

  // ─── Soumission ────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    const err = validate();
    if (err) { setSubmitError(err); return; }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        category: form.category,
        headline: form.headline.trim(),
        summary: form.summary.trim(),
        format: form.format.trim(),
        material: form.material.trim(),
        accent: form.accent,
        status: form.status,
        isPublished: form.isPublished,
        isNew: form.isNew,
        sortOrder: form.sortOrder,
        currentPrice: form.currentPrice.trim(),
        oldPrice: form.oldPrice.trim(),
        image: form.image,
        imagesByColor: form.imagesByColor,
        viewsByColor: form.viewsByColor,
        model3dUrl: form.model3dUrl || null,
        packs: form.packs.map((p) => ({
          packKey: p.packKey.trim(),
          label: p.label.trim(),
          quantity: p.quantity,
          priceValue: p.priceValue,
          price: p.priceValue > 0
            ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(p.priceValue) + ' FCFA'
            : 'À confirmer',
          note: p.note.trim(),
        })),
      };

      const url =
        mode === 'create'
          ? '/api/boutique-admin/products'
          : `/api/boutique-admin/products/${initialData!.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const body = (await r.json()) as { error?: string };
        throw new Error(body.error ?? `Erreur ${r.status}`);
      }

      onSuccess();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">

      {/* ── Section 1 : Identité ─────────────────────────────────────────── */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>Identité</h2>
        <div className="grid gap-4 sm:grid-cols-2">

          {/* Nom */}
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="pf-name">Nom <span className="text-danger">*</span></label>
            <input
              id="pf-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={inputCls}
              placeholder="ex: Assiette plate"
            />
          </div>

          {/* Slug */}
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="pf-slug">
              Slug <span className="text-danger">*</span>
              <span className="ml-1 text-xs font-normal text-ink-muted">(auto-généré depuis le nom)</span>
            </label>
            <input
              id="pf-slug"
              type="text"
              required
              pattern="[a-z0-9-]+"
              value={form.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className={inputCls}
              placeholder="ex: assiette-plate"
            />
            {form.slug && !/^[a-z0-9-]+$/.test(form.slug) && (
              <p className="mt-1 text-xs text-danger">Uniquement a-z, 0-9 et -</p>
            )}
          </div>

          {/* Catégorie */}
          <div>
            <label className={labelCls} htmlFor="pf-category">
              Catégorie <span className="text-danger">*</span>
            </label>
            <div className="flex gap-2">
              <select
                id="pf-category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className={inputCls}
                required
              >
                <option value="">— Choisir —</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => { setShowNewCat((v) => !v); setNewCatError(''); }}
                className={btnSecondary + ' whitespace-nowrap'}
              >
                + Nouvelle
              </button>
            </div>

            {/* Mini-formulaire catégorie inline */}
            {showNewCat && (
              <div className="mt-2 rounded-control border border-line bg-ground p-3">
                <p className="mb-2 text-xs font-semibold text-ink">Nouvelle catégorie</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-ink-muted" htmlFor="pf-cat-name">Nom</label>
                    <input
                      id="pf-cat-name"
                      type="text"
                      value={newCatName}
                      onChange={(e) => handleNewCatNameChange(e.target.value)}
                      className={inputCls}
                      placeholder="ex: Emballage"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-ink-muted" htmlFor="pf-cat-slug">Slug</label>
                    <input
                      id="pf-cat-slug"
                      type="text"
                      value={newCatSlug}
                      onChange={(e) => setNewCatSlug(e.target.value)}
                      className={inputCls}
                      placeholder="ex: emballage"
                    />
                  </div>
                </div>
                {newCatError && <p className="mt-1 text-xs text-danger">{newCatError}</p>}
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={newCatLoading}
                    className={btnPrimary}
                  >
                    {newCatLoading ? 'Création…' : 'Créer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewCat(false); setNewCatName(''); setNewCatSlug(''); setNewCatError(''); }}
                    className={btnSecondary}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Accroche */}
          <div>
            <label className={labelCls} htmlFor="pf-headline">Accroche</label>
            <input
              id="pf-headline"
              type="text"
              value={form.headline}
              onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
              className={inputCls}
              placeholder="ex: Format de table robuste"
            />
          </div>

          {/* Résumé */}
          <div className="sm:col-span-2">
            <label className={labelCls} htmlFor="pf-summary">Résumé <span className="text-danger">*</span></label>
            <textarea
              id="pf-summary"
              required
              rows={3}
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              className={inputCls}
              placeholder="Description principale du produit…"
            />
          </div>

        </div>
      </div>

      {/* ── Section 2 : Caractéristiques ─────────────────────────────────── */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>Caractéristiques</h2>
        <div className="grid gap-4 sm:grid-cols-3">

          <div>
            <label className={labelCls} htmlFor="pf-format">Format <span className="text-danger">*</span></label>
            <input
              id="pf-format"
              type="text"
              required
              value={form.format}
              onChange={(e) => setForm((f) => ({ ...f, format: e.target.value }))}
              className={inputCls}
              placeholder="ex: 21 cm"
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="pf-material">Matériau <span className="text-danger">*</span></label>
            <input
              id="pf-material"
              type="text"
              required
              value={form.material}
              onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
              className={inputCls}
              placeholder="ex: Coque et paille de riz"
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="pf-accent">Accent couleur <span className="text-danger">*</span></label>
            <select
              id="pf-accent"
              value={form.accent}
              onChange={(e) => setForm((f) => ({ ...f, accent: e.target.value as 'paddy' | 'husk' | 'surface' }))}
              className={inputCls}
            >
              <option value="paddy">Paddy (vert)</option>
              <option value="husk">Husk (doré)</option>
              <option value="surface">Surface (beige)</option>
            </select>
            {/* Aperçu couleur */}
            <div className="mt-1.5 flex gap-2">
              {(['paddy', 'husk', 'surface'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, accent: a }))}
                  className={`h-6 w-6 rounded-full border-2 transition-transform ${
                    form.accent === a ? 'scale-110 border-ink' : 'border-line'
                  } ${
                    a === 'paddy' ? 'bg-paddy' : a === 'husk' ? 'bg-husk-deep' : 'bg-grain'
                  }`}
                  aria-label={a}
                />
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Section 3 : Statut et visibilité ─────────────────────────────── */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>Statut et visibilité</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div>
            <label className={labelCls} htmlFor="pf-status">Statut produit</label>
            <select
              id="pf-status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FormState['status'] }))}
              className={inputCls}
            >
              <option value="Prototype">Prototype</option>
              <option value="Validé">Validé</option>
              <option value="À venir">À venir</option>
            </select>
          </div>

          <div>
            <label className={labelCls} htmlFor="pf-sort">Ordre d'affichage</label>
            <input
              id="pf-sort"
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
              className={inputCls}
            />
          </div>

          <div className="flex flex-col gap-3 pt-1 sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
                className="h-4 w-4 rounded border-line text-paddy focus:ring-paddy"
              />
              <span className="text-sm text-ink">Publier le produit</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={form.isNew}
                onChange={(e) => setForm((f) => ({ ...f, isNew: e.target.checked }))}
                className="h-4 w-4 rounded border-line text-paddy focus:ring-paddy"
              />
              <span className="text-sm text-ink">Afficher le badge <strong>Nouveau</strong></span>
            </label>
          </div>

        </div>
      </div>

      {/* ── Section 4 : Prix ─────────────────────────────────────────────── */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>Prix</h2>
        <div className="grid gap-4 sm:grid-cols-2">

          <div>
            <label className={labelCls} htmlFor="pf-price">Prix actuel <span className="text-danger">*</span></label>
            <input
              id="pf-price"
              type="text"
              required
              value={form.currentPrice}
              onChange={(e) => setForm((f) => ({ ...f, currentPrice: e.target.value }))}
              className={inputCls}
              placeholder="ex: À confirmer / 1 500 XOF"
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="pf-oldprice">Ancien prix</label>
            <input
              id="pf-oldprice"
              type="text"
              value={form.oldPrice}
              onChange={(e) => setForm((f) => ({ ...f, oldPrice: e.target.value }))}
              className={inputCls}
              placeholder="ex: Prix standard à venir"
            />
          </div>

        </div>
      </div>

      {/* ── Section 5 : Packs ────────────────────────────────────────────── */}
      <div className={cardCls}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className={sectionTitleCls + ' mb-0'}>Packs</h2>
          <button type="button" onClick={addPack} className={btnSecondary}>
            + Ajouter un pack
          </button>
        </div>

        {form.packs.length === 0 && (
          <p className="text-sm text-ink-muted">Au moins un pack est requis.</p>
        )}

        <div className="flex flex-col gap-4">
          {form.packs.map((pack, idx) => (
            <div key={idx} className="rounded-control border border-line bg-ground p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-ink">Pack {idx + 1}</p>
                <button
                  type="button"
                  onClick={() => removePack(idx)}
                  className="text-xs text-danger hover:underline"
                >
                  Supprimer
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="lg:col-span-2">
                  <label className="mb-1 block text-xs text-ink-muted">Libellé *</label>
                  <input
                    type="text"
                    value={pack.label}
                    onChange={(e) => updatePack(idx, 'label', e.target.value)}
                    className={inputCls}
                    placeholder="ex: Pack de 10 éléments"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-ink-muted">Clé (packKey) *</label>
                  <input
                    type="text"
                    value={pack.packKey}
                    onChange={(e) => updatePack(idx, 'packKey', e.target.value)}
                    className={inputCls}
                    placeholder="ex: 10"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-ink-muted">Quantité *</label>
                  <input
                    type="number"
                    min={1}
                    value={pack.quantity}
                    onChange={(e) => updatePack(idx, 'quantity', Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-ink-muted">Prix (FCFA)</label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={pack.priceValue || ''}
                    onChange={(e) => updatePack(idx, 'priceValue', Number(e.target.value) || 0)}
                    className={inputCls}
                    placeholder="ex: 1500"
                  />
                  {pack.priceValue > 0 && (
                    <p className="mt-1 text-[11px] text-ink-muted">
                      {new Intl.NumberFormat('fr-FR').format(pack.priceValue)} FCFA
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2 lg:col-span-5">
                  <label className="mb-1 block text-xs text-ink-muted">Note</label>
                  <input
                    type="text"
                    value={pack.note}
                    onChange={(e) => updatePack(idx, 'note', e.target.value)}
                    className={inputCls}
                    placeholder="ex: Pour service individuel"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 6 : Médias ───────────────────────────────────────────── */}
      <div className={cardCls}>
        <h2 className={sectionTitleCls}>Médias</h2>

        {/* 6a. Image principale */}
        <div className="mb-6">
          <p className="mb-2 text-sm font-semibold text-ink">
            Image principale <span className="text-danger">*</span>
          </p>
          <div className="flex flex-wrap items-start gap-4">
            {form.image ? (
              <div className="relative h-24 w-24 overflow-hidden rounded-control border border-line bg-grain/30">
                <Image src={form.image} alt="Aperçu" fill className="object-cover" sizes="96px" />
              </div>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-control border border-dashed border-line bg-grain/20 text-xs text-ink-muted">
                Aucune
              </div>
            )}
            <div className="flex flex-col gap-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleMainImageChange(e.target.files[0]); }}
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
                className={btnSecondary}
              >
                {uploadingImage ? 'Upload…' : form.image ? 'Remplacer' : 'Choisir une image'}
              </button>
              {form.image && (
                <p className="break-all text-xs text-ink-muted">{form.image}</p>
              )}
            </div>
          </div>
        </div>

        {/* 6b. Vues par couleur */}
        <div className="mb-6">
          <p className="mb-3 text-sm font-semibold text-ink">Vues par couleur</p>
          <p className="mb-4 text-xs text-ink-muted">3 vues (Vue 1, Vue 2, Vue 3) pour chaque couleur — alimentent les miniatures sur la page boutique.</p>
          <div className="flex flex-col gap-5">
            {PRODUCT_COLORS.map((color) => {
              const slots = form.viewsByColor[color.id] ?? [];
              return (
                <div key={color.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <div
                      className="h-4 w-4 shrink-0 rounded-full border border-line"
                      style={{ backgroundColor: color.value }}
                    />
                    <span className="text-xs font-medium text-ink">{color.label}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2].map((slotIndex) => {
                      const slotKey = `${color.id}-${slotIndex}`;
                      const url = slots[slotIndex] ?? '';
                      const isUploading = uploadingSlot === slotKey;
                      return (
                        <ViewSlot
                          key={slotKey}
                          label={`Vue ${slotIndex + 1}`}
                          url={url}
                          uploading={isUploading}
                          onFileChange={(file) => handleViewSlotChange(color.id, slotIndex, file)}
                          onRemove={() => removeViewSlot(color.id, slotIndex)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6c. Modèle 3D (fichier HTML) */}
        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Modèle 3D (fichier HTML)</p>
          <input
            ref={htmlInputRef}
            type="file"
            accept=".html,text/html"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleHtml3dChange(e.target.files[0]); }}
          />
          {form.model3dUrl ? (
            <div className="flex items-center gap-3">
              <span className="break-all text-sm text-ink-muted">
                {form.model3dUrl.split('/').pop()}
              </span>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, model3dUrl: '' }))}
                className="text-danger hover:underline text-sm"
                aria-label="Supprimer le fichier HTML 3D"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => htmlInputRef.current?.click()}
              disabled={uploadingHtml}
              className={btnSecondary}
            >
              {uploadingHtml ? 'Upload…' : 'Choisir un fichier HTML (.html)'}
            </button>
          )}
        </div>

      </div>

      {/* ── Erreur + Soumission ───────────────────────────────────────────── */}
      {submitError && (
        <p className="rounded-control border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {submitError}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button type="submit" disabled={submitting} className={btnPrimary + ' min-h-10 px-6'}>
          {submitting
            ? mode === 'create' ? 'Création…' : 'Enregistrement…'
            : mode === 'create' ? 'Créer le produit' : 'Enregistrer les modifications'}
        </button>
      </div>

    </form>
  );
}

// ─── Sous-composant : slot de vue par couleur ────────────────────────────────

function ViewSlot({
  label,
  url,
  uploading,
  onFileChange,
  onRemove,
}: {
  label: string;
  url: string;
  uploading: boolean;
  onFileChange: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-1.5 rounded-control border border-line bg-ground p-2">
      <p className="text-center text-xs font-medium text-ink-muted">{label}</p>
      {/* Aperçu */}
      {url ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-control border border-line bg-grain/30">
          <Image src={url} alt={label} fill className="object-cover" sizes="200px" />
        </div>
      ) : (
        <div className="aspect-[4/3] w-full rounded-control border border-dashed border-line bg-grain/20" />
      )}
      {/* Spinner */}
      {uploading && (
        <p className="text-center text-xs text-ink-muted">Upload…</p>
      )}
      {/* Actions */}
      <div className="flex gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) onFileChange(e.target.files[0]); }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex-1 rounded-control border border-line px-2 py-1 text-xs hover:bg-grain/60 disabled:opacity-50"
        >
          {url ? 'Remplacer' : 'Choisir'}
        </button>
        {url && (
          <button
            type="button"
            onClick={onRemove}
            disabled={uploading}
            className="rounded-control border border-line px-2 py-1 text-xs text-danger hover:bg-danger/10 disabled:opacity-50"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
