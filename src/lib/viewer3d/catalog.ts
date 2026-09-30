// Plain data shared by the page (which must stay light) and the 3D viewer (which loads three.js on demand).

export type ProductId = 'barquette' | 'assiette' | 'cuillere' | 'fourchette' | 'gobelet';

export type OptionIcon = 'perspective' | 'top' | 'bottom' | 'profile' | 'open' | 'closed' | 'stack' | 'single';

export type ProductOption = { id: string; label: string; icon: OptionIcon };

export type ProductDef = {
  id: ProductId;
  name: string;
  specs: string;
  // Caption shown under the option buttons, e.g. "Vue : Dessus".
  optionsLabel: string;
  // 'view' options only move the camera; 'state' options change the object itself.
  kind: 'view' | 'state';
  options: ProductOption[];
};

const VIEWS: ProductOption[] = [
  { id: 'perspective', label: 'Perspective', icon: 'perspective' },
  { id: 'top', label: 'Dessus', icon: 'top' },
  { id: 'profile', label: 'Profil', icon: 'profile' },
  { id: 'bottom', label: 'Dessous', icon: 'bottom' },
];

export const VIEWER_PRODUCTS: ProductDef[] = [
  {
    id: 'barquette',
    name: 'Barquette',
    specs: '230 × 150 × 70 mm',
    optionsLabel: 'Couvercle',
    kind: 'state',
    options: [
      { id: 'closed', label: 'Fermé', icon: 'closed' },
      { id: 'open', label: 'Ouvert', icon: 'open' },
    ],
  },
  {
    id: 'assiette',
    name: 'Assiette',
    specs: 'Ø 230 × 20 mm',
    optionsLabel: 'Disposition',
    kind: 'state',
    options: [
      { id: 'top', label: 'Dessus', icon: 'top' },
      { id: 'bottom', label: 'Dessous', icon: 'bottom' },
      { id: 'stack', label: 'Empilées', icon: 'stack' },
    ],
  },
  {
    id: 'cuillere',
    name: 'Cuillère',
    specs: '160 mm · épaisseur 2,5 mm',
    optionsLabel: 'Vue',
    kind: 'view',
    options: VIEWS,
  },
  {
    id: 'fourchette',
    name: 'Fourchette',
    specs: '160 mm · épaisseur 2,5 mm',
    optionsLabel: 'Vue',
    kind: 'view',
    options: VIEWS,
  },
  {
    id: 'gobelet',
    name: 'Gobelet',
    specs: 'Ø 80 × 95 mm · ~250 ml',
    optionsLabel: 'Disposition',
    kind: 'state',
    options: [
      { id: 'single', label: 'Seul', icon: 'single' },
      { id: 'stack', label: 'Empilés', icon: 'stack' },
    ],
  },
];
