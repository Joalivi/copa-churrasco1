export interface User {
  id: string;
  name: string;
  instagram: string | null;
  phone: string | null;
  cpf: string | null;
  photo_url: string | null;
  email: string | null;
  auth_provider: string;
  supabase_auth_id: string;
  status: string;
  created_at: string;
}

export interface Activity {
  id: string;
  name: string;
  description: string | null;
  cost_type: string;
  cost_fixed: number | null;
  bottle_price: number | null;
  people_per_bottle: number | null;
  total_cost: number | null;
  unit_label: string | null;
  unit_price: number | null;
  max_participants: number | null;
  is_mandatory: boolean;
  emoji: string | null;
  sort_order: number;
  created_at: string;
}

export interface ActivityCheckin {
  id: string;
  user_id: string;
  activity_id: string;
  created_at: string;
}

export interface BolaoTicket {
  id: string;
  user_id: string;
  home_score: number;
  away_score: number;
  cost: number;
  created_at: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  receipt_url: string | null;
  split_among_all: boolean;
  added_by: string;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  payment_method: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export interface PaymentItem {
  id: string;
  payment_id: string;
  item_type: string;
  item_id: string | null;
  description: string;
  amount: number;
}
