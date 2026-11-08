import fs from 'fs';
import path from 'path';
import type { Connection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export type PlanInterval = 'day' | 'week' | 'month' | 'year';

export interface PlanRecord {
  id: number;
  key: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  formatted_price: string;
  currency: string;
  currency_plan_app: string;
  interval: PlanInterval;
  interval_count: number;
  interval_label: string;
  pack_duration: number;
  trial_days: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  stripe_plan_id: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  paypal_plan_id: string | null;
  razorpay_plan_id: string | null;
  features: string[];
  eligibilities: {
    max_devices: number;
    max_profiles: number;
  };
  max_devices: number;
  max_profiles: number;
  monthly_incentive: string | null;
  yearly_incentive: string | null;
  has_stripe: boolean;
  has_paypal: boolean;
  has_razorpay: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export function slugifyPlanName(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'plan'
  );
}

export function formatPlanPrice(price: number, currency = 'USD'): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    MXN: '$',
    COP: '$',
    ARS: '$',
    PEN: 'S/',
    CLP: '$',
    BRL: 'R$',
    GBP: '£',
  };
  const code = (currency || 'USD').toUpperCase();
  const sym = symbols[code] || `${code} `;
  return `${sym}${Number(price || 0).toFixed(2)}`;
}

export function getIntervalLabel(interval: string, count = 1): string {
  const c = Math.max(1, Number(count) || 1);
  switch (interval) {
    case 'day':
      return c === 1 ? 'Diario' : `Cada ${c} días`;
    case 'week':
      return c === 1 ? 'Semanal' : `Cada ${c} semanas`;
    case 'year':
      return c === 1 ? 'Anual' : `Cada ${c} años`;
    case 'month':
    default:
      return c === 1 ? 'Mensual' : `Cada ${c} meses`;
  }
}

export function computePackDurationDays(
  interval: string,
  intervalCount: number,
  explicitPackDuration?: number | string | null
): number {
  const explicit = Number(explicitPackDuration);
  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.round(explicit);
  }
  const c = Math.max(1, Number(intervalCount) || 1);
  switch (interval) {
    case 'day':
      return c;
    case 'week':
      return c * 7;
    case 'year':
      return c * 365;
    case 'month':
    default:
      return c * 30;
  }
}

export function parseFeaturesField(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return trimmed
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function normalizePlanRow(row: RowDataPacket | Record<string, unknown>): PlanRecord {
  const id = Number(row.id || 0);
  const name = String(row.name || 'Plan').trim();
  const slug = String(row.slug || row.key || slugifyPlanName(name)).trim();
  const priceNum = Number.parseFloat(String(row.price ?? '0')) || 0;
  const currency = String(row.currency || 'USD')
    .trim()
    .toUpperCase()
    .slice(0, 3);
  const currencyPlanApp = String(row.currency_plan_app || currency).trim();
  const rawInterval = String(row.interval || 'month').toLowerCase();
  const interval: PlanInterval =
    rawInterval === 'day' || rawInterval === 'week' || rawInterval === 'year'
      ? rawInterval
      : 'month';
  const intervalCount = Math.max(1, Number(row.interval_count) || 1);
  const packDuration = computePackDurationDays(interval, intervalCount, row.pack_duration as string);
  const trialDays = Math.max(0, Number(row.trial_days) || 0);
  const maxDevices = Math.max(1, Number(row.max_devices) || 1);
  const maxProfiles = Math.max(1, Number(row.max_profiles) || 1);
  const features = parseFeaturesField(row.features);

  const stripePlanId = row.stripe_plan_id ? String(row.stripe_plan_id).trim() : null;
  const stripePriceId = row.stripe_price_id ? String(row.stripe_price_id).trim() : null;
  const stripeProductId = row.stripe_product_id ? String(row.stripe_product_id).trim() : null;
  const paypalPlanId = row.paypal_plan_id ? String(row.paypal_plan_id).trim() : null;
  const razorpayPlanId = row.razorpay_plan_id ? String(row.razorpay_plan_id).trim() : null;

  return {
    id,
    key: slug,
    slug,
    name,
    description: row.description ? String(row.description) : null,
    price: priceNum,
    formatted_price: formatPlanPrice(priceNum, currency),
    currency,
    currency_plan_app: currencyPlanApp,
    interval,
    interval_count: intervalCount,
    interval_label: getIntervalLabel(interval, intervalCount),
    pack_duration: packDuration,
    trial_days: trialDays,
    is_active: row.is_active === undefined ? true : Boolean(Number(row.is_active)),
    is_featured: Boolean(Number(row.is_featured)),
    sort_order: Number(row.sort_order) || 0,
    stripe_plan_id: stripePlanId,
    stripe_price_id: stripePriceId,
    stripe_product_id: stripeProductId,
    paypal_plan_id: paypalPlanId,
    razorpay_plan_id: razorpayPlanId,
    features,
    eligibilities: {
      max_devices: maxDevices,
      max_profiles: maxProfiles,
    },
    max_devices: maxDevices,
    max_profiles: maxProfiles,
    monthly_incentive: null,
    yearly_incentive: null,
    has_stripe: Boolean(stripePriceId || stripePlanId),
    has_paypal: Boolean(paypalPlanId),
    has_razorpay: Boolean(razorpayPlanId),
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

export function syncPlansJsonFile(plans: PlanRecord[]): void {
  try {
    const dir = path.join(process.cwd(), 'storage', 'app', 'plan-craft');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, 'plans.json');
    fs.writeFileSync(filePath, JSON.stringify(plans, null, 2), 'utf8');
  } catch {
    // Ignore on read-only serverless filesystems
  }
}

export async function getAllCatalogPlans(conn: Connection): Promise<PlanRecord[]> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT * FROM plans ORDER BY sort_order ASC, id ASC`
  );
  const plans = rows.map((r) => normalizePlanRow(r));
  syncPlansJsonFile(plans);
  return plans;
}

export async function createCatalogPlan(
  conn: Connection,
  input: Record<string, unknown>
): Promise<PlanRecord> {
  const payload = (input.plan && typeof input.plan === 'object' ? input.plan : input) as Record<
    string,
    unknown
  >;

  const name = String(payload.name || '').trim();
  if (!name) {
    throw new Error('El nombre del plan es obligatorio.');
  }

  let baseSlug = String(payload.slug || payload.key || slugifyPlanName(name)).trim();
  baseSlug = slugifyPlanName(baseSlug);

  // Ensure unique slug
  const [existingSlug] = await conn.query<RowDataPacket[]>(
    'SELECT id FROM plans WHERE slug = ? LIMIT 1',
    [baseSlug]
  );
  const slug = existingSlug.length > 0 ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;

  const priceNum = Number.parseFloat(String(payload.price ?? '0'));
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    throw new Error('El precio del plan debe ser un número válido.');
  }

  const rawInterval = String(payload.interval || 'month').toLowerCase();
  const interval: PlanInterval =
    rawInterval === 'day' || rawInterval === 'week' || rawInterval === 'year'
      ? rawInterval
      : 'month';
  const intervalCount = Math.max(1, Number(payload.interval_count) || 1);
  const packDuration = String(
    computePackDurationDays(interval, intervalCount, payload.pack_duration as string)
  );
  const currency = String(payload.currency || 'USD')
    .trim()
    .toUpperCase()
    .slice(0, 3);
  const currencyPlanApp = String(payload.currency_plan_app || currency).trim();
  const description = payload.description ? String(payload.description).trim() : null;
  const features = parseFeaturesField(payload.features);
  const maxDevices = Math.max(1, Number(payload.max_devices) || 1);
  const maxProfiles = Math.max(1, Number(payload.max_profiles) || 1);
  const isFeatured = payload.is_featured ? 1 : 0;
  const isActive = payload.is_active === undefined ? 1 : payload.is_active ? 1 : 0;
  const sortOrder = Number(payload.sort_order) || 0;
  const trialDays = Math.max(0, Number(payload.trial_days) || 0);

  let stripePriceId = payload.stripe_price_id ? String(payload.stripe_price_id).trim() : null;
  let stripePlanId = payload.stripe_plan_id ? String(payload.stripe_plan_id).trim() : null;

  // Si se envió stripe_price_id pero no stripe_plan_id, sincronizar ambos para compatibilidad
  if (stripePriceId && !stripePlanId) {
    stripePlanId = stripePriceId;
  } else if (stripePlanId && !stripePriceId) {
    stripePriceId = stripePlanId;
  }

  const stripeProductId = payload.stripe_product_id ? String(payload.stripe_product_id).trim() : null;
  const paypalPlanId = payload.paypal_plan_id ? String(payload.paypal_plan_id).trim() : null;
  const razorpayPlanId = payload.razorpay_plan_id ? String(payload.razorpay_plan_id).trim() : null;

  const [res] = await conn.query<ResultSetHeader>(
    `INSERT INTO plans (
      name, slug, description, features, price,
      stripe_plan_id, stripe_price_id, stripe_product_id, paypal_plan_id, razorpay_plan_id,
      pack_duration, currency_plan_app, currency, \`interval\`, interval_count,
      max_devices, max_profiles, is_featured, is_active, sort_order, trial_days,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      name,
      slug,
      description,
      JSON.stringify(features),
      priceNum.toFixed(2),
      stripePlanId,
      stripePriceId,
      stripeProductId,
      paypalPlanId,
      razorpayPlanId,
      packDuration,
      currencyPlanApp,
      currency,
      interval,
      intervalCount,
      maxDevices,
      maxProfiles,
      isFeatured,
      isActive,
      sortOrder,
      trialDays,
    ]
  );

  const all = await getAllCatalogPlans(conn);
  const created = all.find((p) => p.id === res.insertId) || all[all.length - 1];
  return created;
}

export async function updateCatalogPlan(
  conn: Connection,
  id: number,
  input: Record<string, unknown>
): Promise<PlanRecord> {
  const payload = (input.plan && typeof input.plan === 'object' ? input.plan : input) as Record<
    string,
    unknown
  >;

  const [existing] = await conn.query<RowDataPacket[]>('SELECT * FROM plans WHERE id = ?', [id]);
  if (!existing || existing.length === 0) {
    throw new Error(`Plan con ID ${id} no encontrado.`);
  }

  const prev = existing[0];
  const name = payload.name !== undefined ? String(payload.name).trim() : prev.name;
  if (!name) {
    throw new Error('El nombre del plan no puede estar vacío.');
  }

  let slug = prev.slug;
  if (payload.slug !== undefined || payload.key !== undefined) {
    const rawSlug = String(payload.slug || payload.key || name).trim();
    slug = slugifyPlanName(rawSlug);
  }

  const priceNum =
    payload.price !== undefined
      ? Number.parseFloat(String(payload.price))
      : Number.parseFloat(String(prev.price));

  const rawInterval = String(payload.interval !== undefined ? payload.interval : prev.interval).toLowerCase();
  const interval: PlanInterval =
    rawInterval === 'day' || rawInterval === 'week' || rawInterval === 'year'
      ? rawInterval
      : 'month';
  const intervalCount = Math.max(
    1,
    Number(payload.interval_count !== undefined ? payload.interval_count : prev.interval_count) || 1
  );
  const packDuration = String(
    computePackDurationDays(
      interval,
      intervalCount,
      payload.pack_duration !== undefined ? (payload.pack_duration as string) : prev.pack_duration
    )
  );

  const currency = String(payload.currency !== undefined ? payload.currency : prev.currency || 'USD')
    .trim()
    .toUpperCase()
    .slice(0, 3);
  const currencyPlanApp = String(
    payload.currency_plan_app !== undefined ? payload.currency_plan_app : prev.currency_plan_app || currency
  ).trim();

  const description =
    payload.description !== undefined
      ? payload.description
        ? String(payload.description).trim()
        : null
      : prev.description;

  const features =
    payload.features !== undefined ? parseFeaturesField(payload.features) : parseFeaturesField(prev.features);

  const maxDevices = Math.max(
    1,
    Number(payload.max_devices !== undefined ? payload.max_devices : prev.max_devices) || 1
  );
  const maxProfiles = Math.max(
    1,
    Number(payload.max_profiles !== undefined ? payload.max_profiles : prev.max_profiles) || 1
  );
  const isFeatured =
    payload.is_featured !== undefined ? (payload.is_featured ? 1 : 0) : prev.is_featured ? 1 : 0;
  const isActive =
    payload.is_active !== undefined ? (payload.is_active ? 1 : 0) : prev.is_active ? 1 : 0;
  const sortOrder = Number(payload.sort_order !== undefined ? payload.sort_order : prev.sort_order) || 0;
  const trialDays = Math.max(
    0,
    Number(payload.trial_days !== undefined ? payload.trial_days : prev.trial_days) || 0
  );

  let stripePlanId =
    payload.stripe_plan_id !== undefined
      ? payload.stripe_plan_id
        ? String(payload.stripe_plan_id).trim()
        : null
      : prev.stripe_plan_id;
  let stripePriceId =
    payload.stripe_price_id !== undefined
      ? payload.stripe_price_id
        ? String(payload.stripe_price_id).trim()
        : null
      : prev.stripe_price_id;

  if (stripePriceId && !stripePlanId) {
    stripePlanId = stripePriceId;
  } else if (stripePlanId && !stripePriceId) {
    stripePriceId = stripePlanId;
  }
  const stripeProductId =
    payload.stripe_product_id !== undefined
      ? payload.stripe_product_id
        ? String(payload.stripe_product_id).trim()
        : null
      : prev.stripe_product_id;
  const paypalPlanId =
    payload.paypal_plan_id !== undefined
      ? payload.paypal_plan_id
        ? String(payload.paypal_plan_id).trim()
        : null
      : prev.paypal_plan_id;
  const razorpayPlanId =
    payload.razorpay_plan_id !== undefined
      ? payload.razorpay_plan_id
        ? String(payload.razorpay_plan_id).trim()
        : null
      : prev.razorpay_plan_id;

  await conn.query(
    `UPDATE plans SET
      name = ?, slug = ?, description = ?, features = ?, price = ?,
      stripe_plan_id = ?, stripe_price_id = ?, stripe_product_id = ?, paypal_plan_id = ?, razorpay_plan_id = ?,
      pack_duration = ?, currency_plan_app = ?, currency = ?, \`interval\` = ?, interval_count = ?,
      max_devices = ?, max_profiles = ?, is_featured = ?, is_active = ?, sort_order = ?, trial_days = ?,
      updated_at = NOW()
     WHERE id = ?`,
    [
      name,
      slug,
      description,
      JSON.stringify(features),
      priceNum.toFixed(2),
      stripePlanId,
      stripePriceId,
      stripeProductId,
      paypalPlanId,
      razorpayPlanId,
      packDuration,
      currencyPlanApp,
      currency,
      interval,
      intervalCount,
      maxDevices,
      maxProfiles,
      isFeatured,
      isActive,
      sortOrder,
      trialDays,
      id,
    ]
  );

  const all = await getAllCatalogPlans(conn);
  const updated = all.find((p) => p.id === id);
  if (!updated) {
    throw new Error('Error al recargar el plan actualizado.');
  }
  return updated;
}

export async function deleteCatalogPlan(conn: Connection, id: number): Promise<boolean> {
  const [res] = await conn.query<ResultSetHeader>('DELETE FROM plans WHERE id = ?', [id]);
  await getAllCatalogPlans(conn); // sincroniza el JSON
  return res.affectedRows > 0;
}

export interface SubscriptionItem {
  id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  user_avatar?: string | null;
  name: string;
  provider: 'stripe' | 'paypal' | 'offline' | 'manual' | string;
  provider_id: string | null;
  provider_status: string | null;
  provider_plan_id: string | null;
  stripe_id: string;
  stripe_status: string;
  stripe_plan: string | null;
  quantity: number | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  ends_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_active: boolean;
  status_label: string;
}

export function computeSubscriptionStatus(row: RowDataPacket): { is_active: boolean; status_label: string } {
  const stripeStatus = String(row.stripe_status || row.provider_status || '').toLowerCase();
  const endsAt = row.ends_at ? new Date(row.ends_at).getTime() : null;
  const currentPeriodEnd = row.current_period_end ? new Date(row.current_period_end).getTime() : null;
  const now = Date.now();

  if (stripeStatus === 'canceled' || stripeStatus === 'cancelled') {
    if (endsAt && endsAt > now) {
      return { is_active: true, status_label: 'Cancelada (Periodo de gracia)' };
    }
    return { is_active: false, status_label: 'Cancelada' };
  }

  if (endsAt && endsAt < now) {
    return { is_active: false, status_label: 'Expirada' };
  }

  if (currentPeriodEnd && currentPeriodEnd < now && (!endsAt || endsAt < now)) {
    return { is_active: false, status_label: 'Vencida' };
  }

  if (stripeStatus === 'active' || stripeStatus === 'trialing' || stripeStatus === 'paid') {
    return { is_active: true, status_label: 'Activa' };
  }

  if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') {
    return { is_active: false, status_label: 'Pago pendiente' };
  }

  return { is_active: true, status_label: stripeStatus || 'Activa' };
}


