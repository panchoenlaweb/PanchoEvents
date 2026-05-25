export interface User {
  id: string;
  username: string;
  email: string | null;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  notes?: string | null;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  thumbnail_url: string | null;
  stream_url: string | null;
  status: 'active' | 'inactive';
  slug: string;
  created_at: string;
  user_count?: number;
}

export interface UserEvent extends Event {
  assigned_at: string;
}

export interface UserEventPayment {
  event_id: string;
  payment_status: 'pending' | 'paid' | 'refunded';
  payment_amount: number | null;
  payment_method: string | null;
}

export interface AccessLog {
  id: string;
  user_id: string | null;
  username: string | null;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: 'admin' | 'user';
  sessionToken: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}
