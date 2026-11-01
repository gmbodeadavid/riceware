export const ADMIN_ROLES = ['admin', 'production', 'logistics', 'sales', 'reader'] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ROLE_LABELS: Record<AdminRole, string> = {
  admin: 'Administrateur',
  production: 'Opérateur production',
  logistics: 'Responsable logistique',
  sales: 'Commercial',
  reader: 'Lecteur seul',
};

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  admin: 'Accès complet, gestion des utilisateurs et configuration.',
  production: 'Saisie des batches, tests qualité et mouvements de stock.',
  logistics: 'Rizeries, lots de coques, stocks, partenaires et documents.',
  sales: 'Commandes, clients, devis et consultation des indicateurs.',
  reader: 'Consultation des KPI, rapports et données opérationnelles.',
};

export const PERMISSIONS = [
  'dashboard:view',
  'orders:view',
  'orders:write',
  'lots:view',
  'lots:write',
  'production:view',
  'production:write',
  'quality:view',
  'quality:write',
  'stocks:view',
  'stocks:write',
  'partners:view',
  'partners:write',
  'documents:view',
  'documents:write',
  'reports:view',
  'users:manage',
  'settings:manage',
  'content:manage',
  'catalog:manage',
  'trash:manage', // P1 — restaurer les éléments soft-deletés (admin uniquement par défaut)
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const READ_ONLY: Permission[] = [
  'dashboard:view',
  'orders:view',
  'lots:view',
  'production:view',
  'quality:view',
  'stocks:view',
  'partners:view',
  'documents:view',
  'reports:view',
];

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  admin: [...PERMISSIONS],
  production: [
    'dashboard:view',
    'lots:view',
    'production:view',
    'production:write',
    'quality:view',
    'quality:write',
    'stocks:view',
    'stocks:write',
    'documents:view',
    'reports:view',
  ],
  logistics: [
    'dashboard:view',
    'lots:view',
    'lots:write',
    'stocks:view',
    'stocks:write',
    'partners:view',
    'partners:write',
    'documents:view',
    'documents:write',
    'reports:view',
  ],
  sales: [
    'dashboard:view',
    'orders:view',
    'orders:write',
    'lots:view',
    'production:view',
    'quality:view',
    'stocks:view',
    'partners:view',
    'documents:view',
    'reports:view',
  ],
  reader: READ_ONLY,
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && (ADMIN_ROLES as readonly string[]).includes(value);
}

export function can(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAny(role: AdminRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => can(role, permission));
}

export const ROLE_OPTIONS = ADMIN_ROLES.map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
  description: ROLE_DESCRIPTIONS[role],
}));
