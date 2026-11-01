/**
 * Stub catalog for the 3D product viewer.
 * The full viewer implementation is a future deliverable.
 * This file satisfies type imports across the codebase.
 */

export type ProductId = string;

export type OptionIcon =
  | 'perspective'
  | 'top'
  | 'bottom'
  | 'profile'
  | 'closed'
  | 'open'
  | 'stack'
  | 'single';

export interface ViewerOption {
  id: string;
  label: string;
  icon: OptionIcon;
}

export interface ViewerProduct {
  id: ProductId;
  name: string;
  specs: string;
  kind: 'view' | 'rotate';
  optionsLabel: string;
  options: ViewerOption[];
}

export const VIEWER_PRODUCTS: ViewerProduct[] = [
  {
    id: 'assiette',
    name: 'Assiette plate',
    specs: 'Ø 260 mm · 2,4 mm',
    kind: 'view',
    optionsLabel: 'Vue',
    options: [
      { id: 'perspective', label: 'Perspective', icon: 'perspective' },
      { id: 'top', label: 'Dessus', icon: 'top' },
      { id: 'profile', label: 'Profil', icon: 'profile' },
    ],
  },
  {
    id: 'barquette',
    name: 'Barquette repas',
    specs: '220 × 150 × 45 mm',
    kind: 'view',
    optionsLabel: 'Vue',
    options: [
      { id: 'perspective', label: 'Perspective', icon: 'perspective' },
      { id: 'top', label: 'Dessus', icon: 'top' },
      { id: 'closed', label: 'Fermée', icon: 'closed' },
      { id: 'open', label: 'Ouverte', icon: 'open' },
    ],
  },
  {
    id: 'cuillere',
    name: 'Cuillère',
    specs: 'L 175 mm',
    kind: 'rotate',
    optionsLabel: 'Quantité',
    options: [
      { id: 'single', label: 'Seule', icon: 'single' },
      { id: 'stack', label: 'Empilée', icon: 'stack' },
    ],
  },
  {
    id: 'fourchette',
    name: 'Fourchette',
    specs: 'L 175 mm',
    kind: 'rotate',
    optionsLabel: 'Quantité',
    options: [
      { id: 'single', label: 'Seule', icon: 'single' },
      { id: 'stack', label: 'Empilée', icon: 'stack' },
    ],
  },
  {
    id: 'gobelet',
    name: 'Gobelet',
    specs: 'Ø 80 mm · H 95 mm · 20 cl',
    kind: 'view',
    optionsLabel: 'Vue',
    options: [
      { id: 'perspective', label: 'Perspective', icon: 'perspective' },
      { id: 'top', label: 'Dessus', icon: 'top' },
      { id: 'profile', label: 'Profil', icon: 'profile' },
    ],
  },
];
