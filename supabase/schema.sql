-- ============================================
-- SCHEMA: Churras da Copa 2026
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELAS
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  instagram TEXT,
  phone TEXT,
  photo_url TEXT,
  email TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'manual' CHECK (auth_provider IN ('google', 'manual')),
  supabase_auth_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  cost_type TEXT NOT NULL DEFAULT 'fixed' CHECK (cost_type IN ('fixed', 'per_bottle', 'total_split')),
  cost_fixed NUMERIC(10,2) DEFAULT 0,
  bottle_price NUMERIC(10,2),
  people_per_bottle INT,
  total_cost NUMERIC(10,2),
  unit_label TEXT,
  unit_price NUMERIC(10,2),
  max_participants INT,
  is_mandatory BOOLEAN DEFAULT FALSE,
  emoji TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activity_checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, activity_id)
);

CREATE TABLE bolao_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  home_score INT NOT NULL CHECK (home_score >= 0 AND home_score <= 4),
  away_score INT NOT NULL CHECK (away_score >= 0 AND away_score <= 4),
  cost NUMERIC(10,2) NOT NULL DEFAULT 2.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  receipt_url TEXT,
  split_among_all BOOLEAN DEFAULT TRUE,
  added_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE payment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('activity', 'bolao', 'expense_share', 'aviso')),
  item_id UUID,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL
);

CREATE TABLE admin_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_activity_checkins_user ON activity_checkins(user_id);
CREATE INDEX idx_activity_checkins_activity ON activity_checkins(activity_id);
CREATE INDEX idx_bolao_tickets_user ON bolao_tickets(user_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payment_items_payment ON payment_items(payment_id);
CREATE INDEX idx_users_status ON users(status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update" ON users FOR UPDATE USING (true);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities_select" ON activities FOR SELECT USING (true);

ALTER TABLE activity_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checkins_select" ON activity_checkins FOR SELECT USING (true);
CREATE POLICY "checkins_insert" ON activity_checkins FOR INSERT WITH CHECK (true);
CREATE POLICY "checkins_delete" ON activity_checkins FOR DELETE USING (true);

ALTER TABLE bolao_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bolao_select" ON bolao_tickets FOR SELECT USING (true);
CREATE POLICY "bolao_insert" ON bolao_tickets FOR INSERT WITH CHECK (true);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_select" ON expenses FOR SELECT USING (true);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_select" ON payments FOR SELECT USING (true);
CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "payments_update" ON payments FOR UPDATE USING (true);

ALTER TABLE payment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_items_select" ON payment_items FOR SELECT USING (true);
CREATE POLICY "payment_items_insert" ON payment_items FOR INSERT WITH CHECK (true);

ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_config_select" ON admin_config FOR SELECT USING (true);

-- ============================================
-- SEED DATA
-- ============================================

-- Admin config
INSERT INTO admin_config (key, value) VALUES
  ('admin_pin', '2026'),
  ('event_status', 'open');

-- Despesa inicial: aluguel
INSERT INTO expenses (description, amount, category, split_among_all, added_by) VALUES
  ('Aluguel Sitio Sao Jose + Taxa de Limpeza', 1650.00, 'aluguel', true, 'Admin');

-- Atividades
INSERT INTO activities (name, description, cost_type, cost_fixed, is_mandatory, emoji, sort_order) VALUES
  ('Aviso da Chacara', 'Pagamento obrigatorio para confirmar presenca. O restante do aluguel sera dividido entre todos apos o fechamento.', 'fixed', 35.00, true, '🏠', 0);

INSERT INTO activities (name, description, cost_type, cost_fixed, max_participants, emoji, sort_order) VALUES
  ('Pernoite', 'Check-in para quem vai dormir na chacara. 3 quartos, 7 camas.', 'fixed', 0.00, 16, '🛏️', 1);

INSERT INTO activities (name, description, cost_type, cost_fixed, emoji, sort_order) VALUES
  ('Bomba Patch', 'Torneio de Bomba Patch no PS2. Quem leva o caneco?', 'fixed', 15.00, '⚽', 2),
  ('FIFA', 'Torneio de FIFA no PlayStation. Mostre suas habilidades!', 'fixed', 15.00, '🎮', 3),
  ('Truco', 'Torneio de Truco em duplas. Pede seis!', 'fixed', 10.00, '🃏', 4),
  ('Beer Pong', 'Grupo de Beer Pong. Mira afiada?', 'fixed', 10.00, '🍺', 5);

INSERT INTO activities (name, description, cost_type, bottle_price, people_per_bottle, emoji, sort_order) VALUES
  ('Tequila', 'Grupo da Tequila. R$140 por garrafa, 1 garrafa a cada 7 pessoas.', 'per_bottle', 140.00, 7, '🥃', 6);

INSERT INTO activities (name, description, cost_type, unit_label, unit_price, emoji, sort_order) VALUES
  ('Chopp', 'Grupo do Chopp. R$12 por litro, total dividido entre quem entrar.', 'total_split', 'litros', 12.00, '🍻', 7);

INSERT INTO activities (name, description, cost_type, emoji, sort_order) VALUES
  ('Churrasco', 'Grupo do Churrasco. Valor total da carne dividido entre quem entrar.', 'total_split', '🥩', 8);

-- ============================================
-- REALTIME (habilitar para tabelas que precisam de updates em tempo real)
-- ============================================
-- No Supabase Dashboard: Database > Replication > habilitar para:
-- users, activity_checkins, bolao_tickets, payments
