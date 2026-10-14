export type EntityId = string;
export type IsoDateTime = string;
export type CurrencyCode = 'XOF';

export interface MoneyAmount {
  amount: number;
  currency: CurrencyCode;
}

export type UserRole =
  | 'production_operator'
  | 'logistics_manager'
  | 'sales_manager'
  | 'reader';

export type ProductKind =
  | 'plate'
  | 'cup'
  | 'spoon'
  | 'fork'
  | 'tray'
  | 'custom';

export type CatalogStatus = 'draft' | 'active' | 'suspended';
export type AvailabilityStatus = 'in_stock' | 'made_to_order' | 'out_of_stock' | 'unknown';
export type SalesChannel = 'site' | 'whatsapp' | 'phone' | 'direct_sale' | 'partner';
export type OrderStatus =
  | 'draft'
  | 'received'
  | 'pending_confirmation'
  | 'confirmed'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentProvider = 'manual' | 'orange_money' | 'wave' | 'card_provider' | 'other';
export type ShipmentStatus = 'pending' | 'ready' | 'in_transit' | 'delivered' | 'failed';
export type InventoryItemKind = 'raw_husk' | 'husk_powder' | 'binder' | 'finished_product' | 'packaging';
export type InventoryMovementType = 'inbound' | 'outbound' | 'reserved' | 'released' | 'waste' | 'transfer' | 'adjustment';
export type SupplierAgreementType = 'purchase' | 'free_supply' | 'pilot' | 'other';
export type RawMaterialDecision = 'accepted' | 'rejected' | 'quarantined';
export type QualityResult = 'passed' | 'failed' | 'pending';
export type ComplaintStatus = 'open' | 'in_review' | 'resolved' | 'refunded' | 'rejected';
export type AuditAction = 'create' | 'update' | 'delete' | 'status_change' | 'export';

export type PackCategory = 'snack' | 'decouverte' | 'fete' | 'resto' | 'traiteur' | 'mariage' | 'custom';
export type PackStatus = 'draft' | 'active' | 'suspended';
export type StockAlertLevel = 'ok' | 'low' | 'critical' | 'out_of_stock';
export type ProductionStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
export type QualityCheckType = 'visual' | 'dimensional' | 'load_test' | 'water_absorption' | 'microbiological';
export type WarehouseLocation = 'reception' | 'storage_raw' | 'storage_powder' | 'production' | 'storage_finished' | 'packaging' | 'shipping' | 'quality_control';

export type BlogPostStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'archived';
export type BlogMediaType = 'image' | 'video' | 'document' | 'embed';
export type BlogBlockType = 'paragraph' | 'heading' | 'image' | 'video' | 'gallery' | 'quote' | 'code' | 'table' | 'divider' | 'embed' | 'callout' | 'reference' | 'product_card' | 'pack_card';

export interface BlogCategory {
  id: EntityId;
  slug: string;
  name: string;
  description?: string;
  color?: string;
  parentId?: EntityId;
  sortOrder: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface BlogTag {
  id: EntityId;
  slug: string;
  name: string;
  description?: string;
  color?: string;
  usageCount: number;
  createdAt: IsoDateTime;
}

export interface BlogAuthor {
  id: EntityId;
  userId?: EntityId;
  name: string;
  slug: string;
  bio?: string;
  avatarUrl?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface BlogMedia {
  id: EntityId;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  caption?: string;
  type: BlogMediaType;
  uploadedBy: EntityId;
  createdAt: IsoDateTime;
}

export interface BlogBlock {
  id: string;
  type: BlogBlockType;
  order: number;
  content: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export interface BlogParagraphBlock extends BlogBlock {
  type: 'paragraph';
  content: { text: string; alignment?: 'left' | 'center' | 'right' | 'justify' };
}

export interface BlogHeadingBlock extends BlogBlock {
  type: 'heading';
  content: { level: 1 | 2 | 3 | 4; text: string; anchor?: string };
}

export interface BlogImageBlock extends BlogBlock {
  type: 'image';
  content: { mediaId: EntityId; caption?: string; linkUrl?: string; fullWidth?: boolean };
}

export interface BlogVideoBlock extends BlogBlock {
  type: 'video';
  content: { mediaId: EntityId; caption?: string; autoplay?: boolean; loop?: boolean; muted?: boolean };
}

export interface BlogGalleryBlock extends BlogBlock {
  type: 'gallery';
  content: { mediaIds: EntityId[]; columns?: number; caption?: string };
}

export interface BlogQuoteBlock extends BlogBlock {
  type: 'quote';
  content: { text: string; author?: string; source?: string; citationUrl?: string };
}

export interface BlogCodeBlock extends BlogBlock {
  type: 'code';
  content: { language: string; code: string; filename?: string; highlightLines?: number[] };
}

export interface BlogTableBlock extends BlogBlock {
  type: 'table';
  content: { headers: string[]; rows: string[][]; caption?: string };
}

export interface BlogDividerBlock extends BlogBlock {
  type: 'divider';
  content: { style?: 'solid' | 'dashed' | 'dotted' | 'gradient'; color?: string };
}

export interface BlogEmbedBlock extends BlogBlock {
  type: 'embed';
  content: { provider: 'youtube' | 'vimeo' | 'twitter' | 'linkedin' | 'instagram' | 'generic'; url: string; title?: string; width?: number; height?: number };
}

export interface BlogCalloutBlock extends BlogBlock {
  type: 'callout';
  content: { variant: 'info' | 'warning' | 'success' | 'danger' | 'tip'; title?: string; text: string; icon?: string };
}

export interface BlogReferenceBlock extends BlogBlock {
  type: 'reference';
  content: { title: string; authors?: string[]; publication?: string; year?: number; url?: string; doi?: string; isbn?: string; notes?: string };
}

export interface BlogProductCardBlock extends BlogBlock {
  type: 'product_card';
  content: { productId: EntityId; variant?: 'compact' | 'full'; showPrice?: boolean; showAddToCart?: boolean };
}

export interface BlogPackCardBlock extends BlogBlock {
  type: 'pack_card';
  content: { packId: EntityId; variant?: 'compact' | 'full'; showPrice?: boolean; showAddToCart?: boolean };
}

export type AnyBlogBlock =
  | BlogParagraphBlock
  | BlogHeadingBlock
  | BlogImageBlock
  | BlogVideoBlock
  | BlogGalleryBlock
  | BlogQuoteBlock
  | BlogCodeBlock
  | BlogTableBlock
  | BlogDividerBlock
  | BlogEmbedBlock
  | BlogCalloutBlock
  | BlogReferenceBlock
  | BlogProductCardBlock
  | BlogPackCardBlock;

export interface BlogPost {
  id: EntityId;
  slug: string;
  title: string;
  excerpt?: string;
  content: AnyBlogBlock[];
  status: BlogPostStatus;
  featuredImageId?: EntityId;
  authorId: EntityId;
  categoryIds: EntityId[];
  tagIds: EntityId[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  canonicalUrl?: string;
  ogImageId?: EntityId;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  publishedAt?: IsoDateTime;
  scheduledAt?: IsoDateTime;
  readingTimeMinutes?: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  isFeatured: boolean;
  allowComments: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  publishedBy?: EntityId;
  version: number;

  // Traductions (optionnelles, fallback sur FR si absentes)
  titreEn?: string;
  titreKo?: string;
  extraitEn?: string;
  extraitKo?: string;
  contenuHtmlEn?: string;
  contenuHtmlKo?: string;
}

export interface BlogComment {
  id: EntityId;
  postId: EntityId;
  parentId?: EntityId;
  authorName: string;
  authorEmail: string;
  authorUrl?: string;
  content: string;
  status: 'pending' | 'approved' | 'spam' | 'trash';
  ipAddress?: string;
  userAgent?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  approvedBy?: EntityId;
  approvedAt?: IsoDateTime;
}

export interface BlogRevision {
  id: EntityId;
  postId: EntityId;
  version: number;
  title: string;
  content: AnyBlogBlock[];
  excerpt?: string;
  status: BlogPostStatus;
  changedBy: EntityId;
  changeNote?: string;
  createdAt: IsoDateTime;
}

export interface BlogSettings {
  postsPerPage: number;
  allowComments: boolean;
  commentModeration: boolean;
  autoCloseCommentsDays: number;
  defaultAuthorId: EntityId;
  defaultCategoryId: EntityId;
  rssEnabled: boolean;
  rssItemsCount: number;
  jsonLdEnabled: boolean;
  socialShareEnabled: boolean;
  readingTimeEnabled: boolean;
  relatedPostsEnabled: boolean;
  relatedPostsCount: number;
}

export interface PackDefinition {
  id: EntityId;
  slug: string;
  name: string;
  category: PackCategory;
  targetPeopleCount: number;
  description: string;
  components: PackComponent[];
  status: PackStatus;
  availability: AvailabilityStatus;
  leadTimeDays?: number;
  price?: MoneyAmount;
  costEstimate?: MoneyAmount;
  packageWeightKg?: number;
  packageDimensionsCm?: {
    length: number;
    width: number;
    height: number;
  };
  imageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  featured: boolean;
  sortOrder: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  createdBy: EntityId;
  updatedBy?: EntityId;
}

export interface StockLevel {
  id: EntityId;
  itemKind: InventoryItemKind;
  productId?: EntityId;
  productKind?: ProductKind;
  location: WarehouseLocation;
  quantityAvailable: number;
  quantityReserved: number;
  quantityIncoming: number;
  unit: 'kg' | 'unit';
  minimumThreshold: number;
  criticalThreshold: number;
  costPerUnit?: MoneyAmount;
  lastUpdated: IsoDateTime;
  updatedBy: EntityId;
  alertLevel: StockAlertLevel;
}

export interface StockReservation {
  id: EntityId;
  orderId: EntityId;
  orderLineId: EntityId;
  stockLevelId: EntityId;
  quantity: number;
  unit: 'kg' | 'unit';
  status: 'active' | 'released' | 'fulfilled' | 'expired';
  reservedAt: IsoDateTime;
  releasedAt?: IsoDateTime;
  expiresAt?: IsoDateTime;
}

export interface ProductionOrder {
  id: EntityId;
  orderNumber: string;
  status: ProductionStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  productKind: ProductKind;
  recipeVersionId: EntityId;
  targetQuantity: number;
  producedQuantity: number;
  conformingQuantity: number;
  rejectedQuantity: number;
  assignedOperatorId?: EntityId;
  machineOrMold?: string;
  scheduledStartAt: IsoDateTime;
  actualStartAt?: IsoDateTime;
  completedAt?: IsoDateTime;
  notes?: string;
  createdBy: EntityId;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface ProductionBatchExtended extends ProductionBatch {
  productionOrderId?: EntityId;
  qualityChecks: QualityCheck[];
  yieldPercentage: number;
  costPerUnit?: MoneyAmount;
}

export interface QualityCheckExtended extends QualityCheck {
  checkType: QualityCheckType;
  specificationMin?: number;
  specificationMax?: number;
  measuredValue?: number;
  passed: boolean;
  deviationNotes?: string;
}

export interface SupplierExtended extends Supplier {
  paymentTermsDays?: number;
  currency: CurrencyCode;
  rating?: number;
  certifications?: string[];
  documents: SupplierDocument[];
  deliveryHistory: SupplierDelivery[];
}

export interface SupplierDocument {
  id: EntityId;
  supplierId: EntityId;
  name: string;
  type: 'contract' | 'certification' | 'insurance' | 'quality_manual' | 'other';
  url: string;
  expiresAt?: IsoDateTime;
  uploadedAt: IsoDateTime;
  uploadedBy: EntityId;
}

export interface SupplierDelivery {
  id: EntityId;
  supplierId: EntityId;
  expectedAt: IsoDateTime;
  receivedAt?: IsoDateTime;
  materialKind: RawMaterialLot['materialKind'];
  expectedQuantityKg: number;
  receivedQuantityKg?: number;
  status: 'scheduled' | 'in_transit' | 'received' | 'partial' | 'rejected' | 'cancelled';
  qualityDecision?: RawMaterialDecision;
  notes?: string;
  createdBy: EntityId;
  createdAt: IsoDateTime;
}

export interface Warehouse {
  id: EntityId;
  name: string;
  code: string;
  location: WarehouseLocation;
  capacityKg?: number;
  capacityUnits?: number;
  managerId?: EntityId;
  isActive: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface InventoryItem {
  id: EntityId;
  sku: string;
  name: string;
  itemKind: InventoryItemKind;
  productKind?: ProductKind;
  unit: 'kg' | 'unit';
  costPerUnit?: MoneyAmount;
  warehouseId: EntityId;
  location?: string;
  batchNumber?: string;
  expiryDate?: IsoDateTime;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  reorderPoint: number;
  reorderQuantity: number;
  status: 'active' | 'inactive' | 'discontinued';
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface KpiSales {
  period: { from: IsoDateTime; to: IsoDateTime };
  revenueTotal: MoneyAmount;
  revenuePaid: MoneyAmount;
  revenuePending: MoneyAmount;
  ordersCount: number;
  ordersPaid: number;
  ordersPending: number;
  averageOrderValue: MoneyAmount;
  conversionRate: number;
  cartAbondonmentRate: number;
  salesByPack: Array<{ packId: EntityId; packName: string; quantity: number; revenue: MoneyAmount }>;
  salesByChannel: Array<{ channel: SalesChannel; count: number; revenue: MoneyAmount }>;
  repeatPurchaseRate: number;
  averagePreparationDays: number;
}

export interface KpiProduction {
  period: { from: IsoDateTime; to: IsoDateTime };
  batchesTotal: number;
  batchesCompleted: number;
  totalProducedUnits: number;
  totalConformingUnits: number;
  totalRejectedUnits: number;
  overallYield: number;
  yieldByProduct: Array<{ productKind: ProductKind; yield: number; produced: number; conforming: number }>;
  rejectRateByCause: Array<{ cause: string; count: number; percentage: number }>;
  averageCycleTimeMinutes: number;
  capacityUtilization: number;
  qualityPassRate: number;
}

export interface KpiStock {
  period: { from: IsoDateTime; to: IsoDateTime };
  totalStockValue: MoneyAmount;
  stockByKind: Array<{ itemKind: InventoryItemKind; value: MoneyAmount; quantity: number }>;
  stockByLocation: Array<{ location: WarehouseLocation; value: MoneyAmount; quantity: number }>;
  daysOfCoverage: number;
  lowStockItems: Array<{ itemId: EntityId; name: string; current: number; threshold: number }>;
  criticalStockItems: Array<{ itemId: EntityId; name: string; current: number; threshold: number }>;
  stockTurnover: number;
  incomingValue: MoneyAmount;
  outgoingValue: MoneyAmount;
}

export interface KpiFinance {
  period: { from: IsoDateTime; to: IsoDateTime };
  revenue: MoneyAmount;
  cogs: MoneyAmount;
  grossMargin: MoneyAmount;
  grossMarginPercent: number;
  variableCosts: MoneyAmount;
  fixedCosts: MoneyAmount;
  contributionMargin: MoneyAmount;
  contributionMarginPercent: number;
  cashFlow: MoneyAmount;
  accountsReceivable: MoneyAmount;
  accountsPayable: MoneyAmount;
  refundsTotal: MoneyAmount;
  failedPaymentsTotal: MoneyAmount;
}

export interface KpiDashboard {
  sales: KpiSales;
  production: KpiProduction;
  stock: KpiStock;
  finance: KpiFinance;
  generatedAt: IsoDateTime;
  generatedBy: EntityId;
}

export interface ServerCart {
  id: EntityId;
  sessionId: string;
  customerId?: EntityId;
  items: ServerCartItem[];
  subtotal: MoneyAmount;
  deliveryFee: MoneyAmount;
  total: MoneyAmount;
  currency: CurrencyCode;
  status: 'active' | 'converted' | 'abandoned' | 'expired';
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  expiresAt: IsoDateTime;
  metadata?: Record<string, unknown>;
}

export interface ServerCartItem {
  id: EntityId;
  cartId: EntityId;
  packId: EntityId;
  packSlug: string;
  packNameSnapshot: string;
  packContentSnapshot: PackComponent[];
  quantity: number;
  unitPrice: MoneyAmount;
  lineTotal: MoneyAmount;
  addedAt: IsoDateTime;
}

export interface ServerOrder extends Order {
  paymentAttempts: PaymentAttempt[];
  shipments: Shipment[];
  returns: ReturnOrComplaint[];
  auditTrail: Array<{ action: string; timestamp: IsoDateTime; actorId?: EntityId; details?: string }>;
}

export interface ShippingZone {
  id: EntityId;
  name: string;
  cities: string[];
  baseFee: MoneyAmount;
  freeShippingThreshold?: MoneyAmount;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isActive: boolean;
}

export interface ShippingRate {
  id: EntityId;
  zoneId: EntityId;
  weightMinKg?: number;
  weightMaxKg?: number;
  volumeMinCm3?: number;
  volumeMaxCm3?: number;
  fee: MoneyAmount;
  isActive: boolean;
}

export interface DiscountCode {
  id: EntityId;
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping';
  value: number;
  currency?: CurrencyCode;
  minimumOrderAmount?: MoneyAmount;
  maximumDiscountAmount?: MoneyAmount;
  usageLimit?: number;
  usageCount: number;
  userLimit?: number;
  validFrom: IsoDateTime;
  validUntil: IsoDateTime;
  applicablePacks?: EntityId[];
  applicableCategories?: PackCategory[];
  isActive: boolean;
  createdBy: EntityId;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Notification {
  id: EntityId;
  type: 'order_created' | 'order_confirmed' | 'order_shipped' | 'order_delivered' | 'payment_received' | 'payment_failed' | 'stock_low' | 'production_complete' | 'quality_alert' | 'custom';
  recipientId?: EntityId;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: 'email' | 'sms' | 'whatsapp' | 'in_app' | 'push';
  subject?: string;
  message: string;
  data?: Record<string, unknown>;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  sentAt?: IsoDateTime;
  deliveredAt?: IsoDateTime;
  readAt?: IsoDateTime;
  errorMessage?: string;
  createdAt: IsoDateTime;
}

export interface WebhookEvent {
  id: EntityId;
  eventType: string;
  payload: unknown;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  lastAttemptAt?: IsoDateTime;
  nextRetryAt?: IsoDateTime;
  errorMessage?: string;
  createdAt: IsoDateTime;
  processedAt?: IsoDateTime;
}

export interface User {
  id: EntityId;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: IsoDateTime;
}

export interface Supplier {
  id: EntityId;
  name: string;
  kind: 'rice_mill' | 'laboratory' | 'packaging_supplier' | 'logistics_partner' | 'other';
  location: string;
  contactName?: string;
  phone?: string;
  email?: string;
  agreementType: SupplierAgreementType;
  notes?: string;
}

export interface RiceMill extends Supplier {
  kind: 'rice_mill';
  estimatedMonthlyVolumeKg?: number;
  qualityRequirements?: string;
}

export interface RawMaterialLot {
  id: EntityId;
  supplierId: EntityId;
  receivedAt: IsoDateTime;
  materialKind: 'rice_husk' | 'rice_straw' | 'starch' | 'binder' | 'other';
  grossWeightKg: number;
  tareKg: number;
  netWeightKg: number;
  humidityPercent?: number;
  visualState: 'compliant' | 'wet' | 'contaminated' | 'rejected';
  decision: RawMaterialDecision;
  photoUrls: string[];
  documentUrls: string[];
}

export interface RecipeIngredient {
  itemKind: InventoryItemKind;
  label: string;
  quantityKg: number;
}

export interface RecipeVersion {
  id: EntityId;
  name: string;
  version: string;
  productKind: ProductKind;
  ingredients: RecipeIngredient[];
  targetHumidityPercent?: number;
  targetTemperatureC?: number;
  targetPressureMpa?: number;
  targetCycleTimeMin?: number;
  status: CatalogStatus;
  validatedAt?: IsoDateTime;
}

export interface ProductionBatch {
  id: EntityId;
  recipeVersionId: EntityId;
  rawMaterialLotIds: EntityId[];
  productKind: ProductKind;
  startedAt: IsoDateTime;
  endedAt?: IsoDateTime;
  machineOrMold?: string;
  temperatureC?: number;
  pressureMpa?: number;
  cycleTimeMin?: number;
  producedQuantity: number;
  conformingQuantity: number;
  rejectedQuantity: number;
  operatorId?: EntityId;
  notes?: string;
}

export interface QualityCheck {
  id: EntityId;
  productionBatchId: EntityId;
  productKind: ProductKind;
  checkedAt: IsoDateTime;
  operatorId?: EntityId;
  loadTestKg?: number;
  waterTestMl?: number;
  waterTestDurationMin?: number;
  visualDefects: string[];
  thicknessMm: number[];
  result: QualityResult;
  notes?: string;
}

export interface Product {
  id: EntityId;
  slug: string;
  name: string;
  kind: ProductKind;
  description: string;
  status: CatalogStatus;
  imageUrl?: string;
  unitCostEstimate?: MoneyAmount;
  publicPrice?: MoneyAmount;
}

export interface PackComponent {
  productId: EntityId;
  productNameSnapshot: string;
  quantity: number;
}

export interface Pack {
  id: EntityId;
  slug: string;
  name: string;
  targetPeopleCount: number;
  description: string;
  components: PackComponent[];
  status: CatalogStatus;
  availability: AvailabilityStatus;
  leadTimeDays?: number;
  price?: MoneyAmount;
  costEstimate?: MoneyAmount;
  packageWeightKg?: number;
  packageDimensionsCm?: {
    length: number;
    width: number;
    height: number;
  };
  imageUrl?: string;
}

export interface InventoryMovement {
  id: EntityId;
  itemKind: InventoryItemKind;
  productId?: EntityId;
  productionBatchId?: EntityId;
  orderId?: EntityId;
  lotId?: EntityId;
  movementType: InventoryMovementType;
  quantity: number;
  unit: 'kg' | 'unit';
  fromLocation?: string;
  toLocation?: string;
  reason?: string;
  createdAt: IsoDateTime;
  createdBy?: EntityId;
}

export interface Customer {
  id: EntityId;
  fullName: string;
  phone: string;
  email?: string;
  createdAt: IsoDateTime;
  notes?: string;
}

export interface Address {
  id: EntityId;
  customerId: EntityId;
  label?: string;
  city: string;
  district?: string;
  street?: string;
  details?: string;
  deliveryInstructions?: string;
}

export interface OrderLine {
  id: EntityId;
  packId: EntityId;
  packNameSnapshot: string;
  packContentSnapshot: PackComponent[];
  quantity: number;
  unitPrice: MoneyAmount;
  lineTotal: MoneyAmount;
}

export interface Order {
  id: EntityId;
  orderNumber: string;
  customerId: EntityId;
  deliveryAddressId: EntityId;
  channel: SalesChannel;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  lines: OrderLine[];
  subtotal: MoneyAmount;
  deliveryFee: MoneyAmount;
  total: MoneyAmount;
  createdAt: IsoDateTime;
  confirmedAt?: IsoDateTime;
  preparedAt?: IsoDateTime;
  deliveredAt?: IsoDateTime;
  cancelledAt?: IsoDateTime;
  notes?: string;
}

export interface PaymentAttempt {
  id: EntityId;
  orderId: EntityId;
  provider: PaymentProvider;
  providerReference?: string;
  amount: MoneyAmount;
  status: PaymentStatus;
  startedAt: IsoDateTime;
  confirmedAt?: IsoDateTime;
  failureReason?: string;
}

export interface Shipment {
  id: EntityId;
  orderId: EntityId;
  status: ShipmentStatus;
  carrierName?: string;
  trackingReference?: string;
  deliveryFee: MoneyAmount;
  dispatchedAt?: IsoDateTime;
  deliveredAt?: IsoDateTime;
  notes?: string;
}

export interface ReturnOrComplaint {
  id: EntityId;
  orderId: EntityId;
  customerId: EntityId;
  status: ComplaintStatus;
  reason: string;
  resolution?: string;
  refundAmount?: MoneyAmount;
  createdAt: IsoDateTime;
  resolvedAt?: IsoDateTime;
}

export interface AuditLog {
  id: EntityId;
  actorId?: EntityId;
  action: AuditAction;
  entityType: string;
  entityId: EntityId;
  before?: unknown;
  after?: unknown;
  createdAt: IsoDateTime;
}

export function createMoney(amount: number, currency: CurrencyCode = 'XOF'): MoneyAmount {
  return { amount, currency };
}

export function getPackItemCount(pack: Pick<Pack, 'components'>) {
  return pack.components.reduce((total, component) => total + component.quantity, 0);
}

export function getOrderLineTotal(quantity: number, unitPrice: MoneyAmount): MoneyAmount {
  return createMoney(quantity * unitPrice.amount, unitPrice.currency);
}

export function getOrderSubtotal(lines: Pick<OrderLine, 'lineTotal'>[]): MoneyAmount {
  return createMoney(
    lines.reduce((total, line) => total + line.lineTotal.amount, 0),
    lines[0]?.lineTotal.currency ?? 'XOF',
  );
}

export function getOrderTotal(subtotal: MoneyAmount, deliveryFee: MoneyAmount): MoneyAmount {
  return createMoney(subtotal.amount + deliveryFee.amount, subtotal.currency);
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function calculateReadingTime(blocks: AnyBlogBlock[]): number {
  const wordsPerMinute = 200;
  let totalWords = 0;
  
  for (const block of blocks) {
    if (block.type === 'paragraph' || block.type === 'heading' || block.type === 'quote' || block.type === 'callout') {
      const text = (block.content as { text?: string }).text ?? '';
      totalWords += text.split(/\s+/).filter(Boolean).length;
    } else if (block.type === 'code') {
      const code = (block.content as { code?: string }).code ?? '';
      totalWords += code.split(/\s+/).filter(Boolean).length * 0.5;
    } else if (block.type === 'table') {
      const rows = (block.content as { rows?: string[][] }).rows ?? [];
      for (const row of rows) {
        totalWords += row.join(' ').split(/\s+/).filter(Boolean).length;
      }
    }
  }
  
  return Math.max(1, Math.ceil(totalWords / wordsPerMinute));
}

export function getBlockTextContent(block: AnyBlogBlock): string {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
    case 'quote':
    case 'callout':
      return (block.content as { text?: string }).text ?? '';
    case 'code':
      return (block.content as { code?: string }).code ?? '';
    case 'reference':
      const ref = block.content as { title?: string; authors?: string[]; publication?: string; year?: number };
      return [ref.title, ref.authors?.join(', '), ref.publication, ref.year?.toString()].filter(Boolean).join(' - ');
    default:
      return '';
  }
}

export function getPlainTextContent(blocks: AnyBlogBlock[]): string {
  return blocks.map(getBlockTextContent).filter(Boolean).join('\n\n');
}

export function createEmptyParagraphBlock(order: number): BlogParagraphBlock {
  return {
    id: crypto.randomUUID(),
    type: 'paragraph',
    order,
    content: { text: '' },
  };
}

export function createEmptyHeadingBlock(order: number, level: 1 | 2 | 3 | 4 = 2): BlogHeadingBlock {
  return {
    id: crypto.randomUUID(),
    type: 'heading',
    order,
    content: { level, text: '' },
  };
}

export function createImageBlock(order: number, mediaId: EntityId, caption?: string): BlogImageBlock {
  return {
    id: crypto.randomUUID(),
    type: 'image',
    order,
    content: { mediaId, caption },
  };
}

export function createVideoBlock(order: number, mediaId: EntityId, caption?: string): BlogVideoBlock {
  return {
    id: crypto.randomUUID(),
    type: 'video',
    order,
    content: { mediaId, caption, autoplay: false, loop: false, muted: true },
  };
}

export function createGalleryBlock(order: number, mediaIds: EntityId[], columns = 3, caption?: string): BlogGalleryBlock {
  return {
    id: crypto.randomUUID(),
    type: 'gallery',
    order,
    content: { mediaIds, columns, caption },
  };
}

export function createQuoteBlock(order: number, text: string, author?: string, source?: string): BlogQuoteBlock {
  return {
    id: crypto.randomUUID(),
    type: 'quote',
    order,
    content: { text, author, source },
  };
}

export function createCalloutBlock(order: number, variant: BlogCalloutBlock['content']['variant'], text: string, title?: string): BlogCalloutBlock {
  return {
    id: crypto.randomUUID(),
    type: 'callout',
    order,
    content: { variant, title, text },
  };
}

export function createReferenceBlock(order: number, title: string, authors?: string[], publication?: string, year?: number, url?: string): BlogReferenceBlock {
  return {
    id: crypto.randomUUID(),
    type: 'reference',
    order,
    content: { title, authors, publication, year, url },
  };
}

export function createProductCardBlock(order: number, productId: EntityId, variant: 'compact' | 'full' = 'full'): BlogProductCardBlock {
  return {
    id: crypto.randomUUID(),
    type: 'product_card',
    order,
    content: { productId, variant, showPrice: true, showAddToCart: true },
  };
}

export function createPackCardBlock(order: number, packId: EntityId, variant: 'compact' | 'full' = 'full'): BlogPackCardBlock {
  return {
    id: crypto.randomUUID(),
    type: 'pack_card',
    order,
    content: { packId, variant, showPrice: true, showAddToCart: true },
  };
}

export function reorderBlocks(blocks: AnyBlogBlock[]): AnyBlogBlock[] {
  return blocks.map((block, index) => ({ ...block, order: index }));
}

export function validateBlogPost(post: Partial<BlogPost>): string[] {
  const errors: string[] = [];
  
  if (!post.title?.trim()) {
    errors.push('Le titre est requis');
  }
  
  if (!post.content?.length) {
    errors.push('Le contenu ne peut pas être vide');
  }
  
  if (post.status === 'published' && !post.publishedAt) {
    errors.push('La date de publication est requise pour un article publié');
  }
  
  if (post.slug && !/^[a-z0-9-]+$/.test(post.slug)) {
    errors.push('Le slug ne doit contenir que des lettres minuscules, chiffres et tirets');
  }
  
  return errors;
}

export function getPackDefinitionItemCount(pack: Pick<PackDefinition, 'components'>): number {
  return pack.components.reduce((total, component) => total + component.quantity, 0);
}

export function calculatePackCostEstimate(pack: PackDefinition, stockLevels: StockLevel[]): MoneyAmount {
  let totalCost = 0;
  const currency: CurrencyCode = 'XOF';
  
  for (const component of pack.components) {
    const stockLevel = stockLevels.find(
      sl => sl.productId === component.productId && sl.itemKind === 'finished_product'
    );
    if (stockLevel?.costPerUnit) {
      totalCost += stockLevel.costPerUnit.amount * component.quantity;
    } else if (pack.costEstimate) {
      totalCost += pack.costEstimate.amount / pack.components.length * component.quantity;
    }
  }
  
  return createMoney(totalCost, currency);
}

export function calculatePackAvailability(pack: PackDefinition, stockLevels: StockLevel[]): {
  available: boolean;
  limitingComponent?: PackComponent;
  maxPacks: number;
  leadTimeDays?: number;
} {
  let maxPacks = Infinity;
  let limitingComponent: PackComponent | undefined;
  let maxLeadTime = 0;
  
  for (const component of pack.components) {
    const stockLevel = stockLevels.find(
      sl => sl.productId === component.productId && sl.itemKind === 'finished_product'
    );
    
    if (!stockLevel) {
      return { available: false, limitingComponent: component, maxPacks: 0, leadTimeDays: pack.leadTimeDays };
    }
    
    const availablePacks = Math.floor(stockLevel.quantityAvailable / component.quantity);
    if (availablePacks < maxPacks) {
      maxPacks = availablePacks;
      limitingComponent = component;
    }
    
    if (pack.leadTimeDays && pack.leadTimeDays > maxLeadTime) {
      maxLeadTime = pack.leadTimeDays;
    }
  }
  
  return {
    available: maxPacks > 0,
    limitingComponent,
    maxPacks: maxPacks === Infinity ? 0 : maxPacks,
    leadTimeDays: maxLeadTime > 0 ? maxLeadTime : pack.leadTimeDays,
  };
}

export function calculateStockAlertLevel(stock: StockLevel): StockAlertLevel {
  if (stock.quantityAvailable <= stock.criticalThreshold) return 'critical';
  if (stock.quantityAvailable <= stock.minimumThreshold) return 'low';
  if (stock.quantityAvailable <= 0) return 'out_of_stock';
  return 'ok';
}

export function calculateProductionYield(batch: ProductionBatch): number {
  if (batch.producedQuantity === 0) return 0;
  return (batch.conformingQuantity / batch.producedQuantity) * 100;
}

export function calculateQualityPassRate(checks: QualityCheck[]): number {
  if (checks.length === 0) return 100;
  const passed = checks.filter(c => c.result === 'passed').length;
  return (passed / checks.length) * 100;
}

export function calculateDaysOfCoverage(
  currentStock: number,
  averageDailyUsage: number
): number {
  if (averageDailyUsage <= 0) return Infinity;
  return Math.floor(currentStock / averageDailyUsage);
}

export function calculateStockTurnover(
  costOfGoodsSold: number,
  averageStockValue: number
): number {
  if (averageStockValue <= 0) return 0;
  return costOfGoodsSold / averageStockValue;
}

export function calculateGrossMargin(revenue: MoneyAmount, cogs: MoneyAmount): MoneyAmount {
  return createMoney(revenue.amount - cogs.amount, revenue.currency);
}

export function calculateGrossMarginPercent(revenue: MoneyAmount, cogs: MoneyAmount): number {
  if (revenue.amount === 0) return 0;
  return ((revenue.amount - cogs.amount) / revenue.amount) * 100;
}

export function calculateContributionMargin(revenue: MoneyAmount, variableCosts: MoneyAmount): MoneyAmount {
  return createMoney(revenue.amount - variableCosts.amount, revenue.currency);
}

export function calculateContributionMarginPercent(revenue: MoneyAmount, variableCosts: MoneyAmount): number {
  if (revenue.amount === 0) return 0;
  return ((revenue.amount - variableCosts.amount) / revenue.amount) * 100;
}

export function applyDiscountCode(
  subtotal: MoneyAmount,
  discount: DiscountCode
): { discountAmount: MoneyAmount; newSubtotal: MoneyAmount } {
  let discountAmount = 0;
  
  switch (discount.type) {
    case 'percentage':
      discountAmount = Math.round(subtotal.amount * (discount.value / 100));
      if (discount.maximumDiscountAmount) {
        discountAmount = Math.min(discountAmount, discount.maximumDiscountAmount.amount);
      }
      break;
    case 'fixed_amount':
      discountAmount = Math.min(discount.value, subtotal.amount);
      break;
    case 'free_shipping':
      discountAmount = 0;
      break;
  }
  
  const discountMoney = createMoney(discountAmount, subtotal.currency);
  const newSubtotal = createMoney(Math.max(0, subtotal.amount - discountAmount), subtotal.currency);
  
  return { discountAmount: discountMoney, newSubtotal };
}

export function calculateShippingFee(
  zones: ShippingZone[],
  rates: ShippingRate[],
  city: string,
  weightKg: number,
  volumeCm3: number,
  subtotal: MoneyAmount
): MoneyAmount {
  const zone = zones.find(z => z.isActive && z.cities.includes(city));
  if (!zone) return createMoney(0, subtotal.currency);
  
  if (zone.freeShippingThreshold && subtotal.amount >= zone.freeShippingThreshold.amount) {
    return createMoney(0, subtotal.currency);
  }
  
  const applicableRates = rates.filter(
    r => r.zoneId === zone.id && r.isActive &&
      (r.weightMinKg === undefined || weightKg >= r.weightMinKg) &&
      (r.weightMaxKg === undefined || weightKg <= r.weightMaxKg) &&
      (r.volumeMinCm3 === undefined || volumeCm3 >= r.volumeMinCm3) &&
      (r.volumeMaxCm3 === undefined || volumeCm3 <= r.volumeMaxCm3)
  );
  
  if (applicableRates.length === 0) return zone.baseFee;
  
  const bestRate = applicableRates.reduce((min, r) => r.fee.amount < min.fee.amount ? r : min);
  return bestRate.fee;
}

export function generateOrderNumber(prefix = 'RW'): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${datePart}-${timePart}-${randomPart}`;
}

export function generateCartSessionId(): string {
  return `cart_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

export function calculateCartExpiry(hours = 24): IsoDateTime {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry.toISOString();
}

export function isCartExpired(cart: ServerCart): boolean {
  return new Date(cart.expiresAt) < new Date();
}

export function getAvailablePacks(packs: PackDefinition[], stockLevels: StockLevel[]): PackDefinition[] {
  return packs
    .filter(pack => pack.status === 'active')
    .map(pack => ({
      ...pack,
      availability: calculatePackAvailability(pack, stockLevels).available ? 'in_stock' : 'out_of_stock',
    }));
}
