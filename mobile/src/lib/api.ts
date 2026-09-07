import Constants from "expo-constants";
import { getToken, clearAuth } from "./auth";

const BASE = (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? "http://localhost:3000";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const { skipAuth, ...init } = options;
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  if (!skipAuth) {
    const token = await getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 401 || res.status === 403) {
    await clearAuth();
    throw new ApiError(res.status, "Session expired");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// ─── Typed endpoints ─────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (name: string, password: string) =>
      apiFetch<{ ok: boolean; role: string; token: string; session: unknown }>("/api/admin/auth", {
        method: "POST", skipAuth: true,
        body: JSON.stringify({ name, password }),
      }),
    logout: () => apiFetch("/api/admin/auth", { method: "DELETE" }),
  },

  dashboard: () => apiFetch<DashboardData>("/api/admin/dashboard"),

  bookings: {
    list: (q?: string, status?: string) =>
      apiFetch<Booking[]>(`/api/admin/bookings${qs({ q, status })}`),
    get: (id: string) => apiFetch<BookingDetail>(`/api/admin/bookings/${id}`),
    patch: (id: string, body: object) =>
      apiFetch(`/api/admin/bookings/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    issueToken: (id: string) =>
      apiFetch<{ stayUrl: string }>(`/api/admin/bookings/${id}/token`, { method: "POST", body: "{}" }),
  },

  turnovers: {
    list: () => apiFetch<Turnover[]>("/api/admin/ops/turnover"),
    get: (id: string) => apiFetch<TurnoverDetail>(`/api/admin/ops/turnover/${id}`),
    patch: (id: string, body: object) =>
      apiFetch(`/api/admin/ops/turnover/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    patchItem: (id: string, itemId: string, body: object) =>
      apiFetch(`/api/admin/ops/turnover/${id}/items/${itemId}`, { method: "PATCH", body: JSON.stringify(body) }),
    addDamage: (id: string, body: object) =>
      apiFetch(`/api/admin/ops/turnover/${id}/damage`, { method: "POST", body: JSON.stringify(body) }),
  },

  maintenance: {
    list: (propertyId?: string) =>
      apiFetch<MaintenanceTicket[]>(`/api/admin/ops/maintenance${qs({ propertyId })}`),
    get: (id: string) => apiFetch<MaintenanceTicket>(`/api/admin/ops/maintenance/${id}`),
    patch: (id: string, body: object) =>
      apiFetch(`/api/admin/ops/maintenance/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    create: (body: object) =>
      apiFetch(`/api/admin/ops/maintenance`, { method: "POST", body: JSON.stringify(body) }),
  },

  requests: {
    list: () => apiFetch<RequestsData>("/api/admin/requests"),
    getGuest: (id: string) => apiFetch<GuestRequest>(`/api/admin/requests/guest/${id}`),
    patchGuest: (id: string, body: object) =>
      apiFetch(`/api/admin/requests/guest/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    getService: (id: string) => apiFetch<ServiceRequest>(`/api/admin/requests/service/${id}`),
    patchService: (id: string, body: object) =>
      apiFetch(`/api/admin/requests/service/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    regeneratePayment: (id: string) =>
      apiFetch(`/api/admin/requests/service/${id}/payment`, { method: "POST", body: "{}" }),
  },

  inventory: {
    list: (propertyId: string) =>
      apiFetch<InventoryItem[]>(`/api/admin/ops/inventory/${propertyId}`),
    patch: (propertyId: string, itemId: string, body: object) =>
      apiFetch(`/api/admin/ops/inventory/${propertyId}/${itemId}`, { method: "PATCH", body: JSON.stringify(body) }),
  },

  properties: () => apiFetch<Property[]>("/api/admin/properties"),

  team: {
    list: () => apiFetch<TeamMember[]>("/api/admin/team"),
    create: (body: object) => apiFetch<TeamMember>("/api/admin/team", { method: "POST", body: JSON.stringify(body) }),
    patch: (id: string, body: object) => apiFetch<TeamMember>(`/api/admin/team/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  },

  services: {
    list: () => apiFetch<Service[]>("/api/admin/services"),
    create: (body: object) => apiFetch<Service>("/api/admin/services", { method: "POST", body: JSON.stringify(body) }),
    patch: (id: string, body: object) => apiFetch<Service>(`/api/admin/services/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  },
};

function qs(params: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardData {
  arrivals:        Array<{ id: string; guest_first_name: string; guest_last_name: string; properties: { name: string } | { name: string }[] }>;
  departures:      Array<{ id: string; guest_first_name: string; guest_last_name: string; properties: { name: string } | { name: string }[] }>;
  openRequests:    Array<{ id: string; category: string; urgency: string; created_at: string; bookings: { guest_first_name: string; properties: { name: string } | { name: string }[] } }>;
  activeTurnovers: Turnover[];
  openTickets:     MaintenanceTicket[];
  pendingServices: ServiceRequest[];
  invAlerts:       Array<{ id: string; alert_type: string; severity: string; message: string; property_id: string }>;
}

export interface Booking {
  id: string; guest_first_name: string; guest_last_name: string;
  check_in: string; check_out: string; status: string; source: string; created_at: string;
  properties: { id: string; name: string } | { id: string; name: string }[];
}

export interface BookingDetail extends Omit<Booking, "properties"> {
  guest_email: string | null; guest_phone?: string | null; guestPhone?: string | null;
  guest_lang: string; guests_count: number; guest_count?: number; external_ref: string | null;
  guest_nationality?: string | null; internal_notes?: string | null;
  doorCode: string | null; property_id: string; dnd_active: boolean;
  properties: { id: string; name: string; name_ar: string } | { id: string; name: string; name_ar: string }[];
  arrivalPrefs: { arrival_time?: string | null; transport_mode?: string | null; special_requests?: string | null; submitted_at: string } | null;
  tokens: Array<{ id: string; type: string; token_value?: string; open_count: number; expires_at: string; revoked_at: string | null }>;
  rating: { overall_rating?: number; stars?: number; public_comment?: string | null; comment?: string | null } | null;
}

export interface Turnover {
  id: string; status: string; assigned_to: string | null; created_at: string; condition?: string | null;
  properties: { id: string; name: string } | { id: string; name: string }[];
  bookings?: { check_out: string; guest_first_name: string; guest_last_name: string } | null;
}

export interface TurnoverItem {
  id: string; room: string; label: string; sort_order: number; is_done: boolean; done_at: string | null; done_by: string | null;
}

export interface TurnoverDetail extends Turnover {
  notes: string | null; damage_notes: string | null; approved_by: string | null; approved_at: string | null;
  turnover_items: TurnoverItem[];
  turnover_damage_items: Array<{ id: string; quantity: number; condition: string; notes: string | null; inventory_items: { name: string } }>;
}

export interface MaintenanceTicket {
  id: string; title: string; priority: string; status: string; category: string;
  description: string | null; notes: string | null; assigned_to: string | null; resolution_notes: string | null;
  photo_urls: string[]; created_at: string; property_id: string;
  properties: { id: string; name: string } | { id: string; name: string }[] | null;
}

export interface RequestsData {
  serviceRequests: ServiceRequest[];
  guestRequests:   GuestRequest[];
}

export interface GuestRequest {
  id: string; category: string; message: string; body?: string; urgency: string; status: string;
  admin_notes: string | null; created_at: string;
  bookings: { id: string; guest_first_name: string; guest_last_name: string; property_id: string; properties: { name: string } | { name: string }[] } | null;
}

export interface ServiceRequest {
  id: string; status: string; quantity: number; notes: string | null; guest_notes?: string | null;
  payment_link: string | null; paymob_payment_url?: string | null;
  payment_status: string | null; payment_amount_egp: number | null; paid_at: string | null;
  scheduled_at: string | null; created_at: string; admin_notes?: string | null;
  services: { name_en: string; name_ar?: string; price_egp: number; category?: string } | { name_en: string; name_ar?: string; price_egp: number; category?: string }[] | null;
  bookings: { id: string; guest_first_name: string; guest_last_name: string; property_id: string; properties: { name: string } | { name: string }[] } | null;
}

export interface InventoryItem {
  id: string; property_id: string; name: string; category: string; unit: string;
  par_level: number; current_stock: number;
}

export interface Property { id: string; name: string; name_ar: string; slug: string; }
export interface TeamMember { id: string; name: string; role: string; is_active: boolean; created_at: string; }
export interface Service {
  id: string; name_en: string; name_ar: string; category: string; price_egp: number;
  is_active: boolean; sort_order: number; lead_hours: number;
}
