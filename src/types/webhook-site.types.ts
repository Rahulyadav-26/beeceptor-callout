// ─── Webhook.site Token ───────────────────────────────────────────────────────

export interface WebhookSiteToken {
  uuid: string;
  redirect: string;
  alias: string | null;
  actions: boolean;
  cors: boolean;
  expiry: string | null;
  url: string;
}

// ─── Webhook.site Request Entry ───────────────────────────────────────────────

export interface WebhookSiteRequest {
  uuid: string;
  token_id: string;
  ip: string;
  hostname: string;
  method: string;
  headers: Record<string, string>;
  content: string;
  query: Record<string, string>;
  url: string;
  created_at: string;
  updated_at: string;
  size: number;
  files: Record<string, unknown>;
  sort: string;
}

// ─── Webhook.site Request List Response ──────────────────────────────────────

export interface WebhookSiteRequestList {
  data: WebhookSiteRequest[];
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}
