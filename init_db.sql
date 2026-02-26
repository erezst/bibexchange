BEGIN;

-- =========================
-- CLEAN START (drops EVERYTHING this script creates)
-- =========================
DROP TABLE IF EXISTS public.email_outbox CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.sellers CASCADE;
DROP TABLE IF EXISTS public.buyer_queue CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- =========================
-- UPDATED_AT helpers
-- =========================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================
-- EVENTS
-- =========================
CREATE TABLE public.events (
  id              bigserial PRIMARY KEY,
  name            text NOT NULL,
  distance_label  text NOT NULL,
  distance_meters integer,
  is_open         boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX events_open_idx ON public.events (is_open);
CREATE INDEX events_name_idx ON public.events (name);

-- =========================
-- PROFILES (stores email + basic metadata for sending)
-- =========================
CREATE TABLE public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  full_name  text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX profiles_email_idx ON public.profiles (email);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users
INSERT INTO public.profiles (id, email, full_name)
SELECT
  u.id,
  COALESCE(u.email, ''),
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')
FROM auth.users u
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

-- =========================
-- BUYER QUEUE
-- =========================
CREATE TABLE public.buyer_queue (
  id             bigserial PRIMARY KEY,
  user_id        uuid NOT NULL,
  event_id       bigint NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  joined_at      timestamptz NOT NULL DEFAULT now(),
  status         text NOT NULL DEFAULT 'waiting'
                 CHECK (status IN ('waiting', 'matched', 'paused', 'confirmed', 'expired', 'cancelled')),
  match_id       bigint NULL, -- FK added after matches exists
  cooldown_until timestamptz NULL
);

CREATE UNIQUE INDEX buyer_queue_user_event_unique
ON public.buyer_queue (user_id, event_id);

CREATE INDEX buyer_queue_event_status_joined_idx
ON public.buyer_queue (event_id, status, joined_at);

CREATE INDEX buyer_queue_user_status_idx
ON public.buyer_queue (user_id, status);

CREATE INDEX buyer_queue_waiting_event_joined_idx
ON public.buyer_queue (event_id, joined_at)
WHERE status = 'waiting';

-- =========================
-- SELLERS
-- =========================
CREATE TABLE public.sellers (
  id             bigserial PRIMARY KEY,
  user_id        uuid NOT NULL,
  event_id       bigint NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  status         text NOT NULL DEFAULT 'waiting'
                 CHECK (status IN ('waiting', 'matched', 'confirmed', 'expired', 'cancelled')),
  match_id       bigint NULL, -- FK added after matches exists
  cooldown_until timestamptz NULL
);

CREATE INDEX sellers_event_status_created_idx
ON public.sellers (event_id, status, created_at);

CREATE INDEX sellers_user_status_idx
ON public.sellers (user_id, status);

CREATE INDEX sellers_waiting_event_created_idx
ON public.sellers (event_id, created_at)
WHERE status = 'waiting';

-- =========================
-- MATCHES (new simplified workflow)
-- =========================
CREATE TABLE public.matches (
  id                        bigserial PRIMARY KEY,
  event_id                   bigint NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  buyer_queue_id             bigint NOT NULL REFERENCES public.buyer_queue(id) ON DELETE CASCADE,
  seller_id                  bigint NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  matched_at                 timestamptz NOT NULL DEFAULT now(),
  status                     text NOT NULL DEFAULT 'active_intro'
                             CHECK (status IN (
                               'active_intro',
                               'seller_transferred',
                               'completed',
                               'seller_cancelled',
                               'buyer_cancelled_pre_transfer',
                               'stale_unconfirmed',
                               'disputed_not_received',
                               'failed'
                             )),
  intro_deadline_at          timestamptz NULL,
  seller_confirmed_at        timestamptz NULL,
  buyer_confirmed_at         timestamptz NULL,
  buyer_confirm_deadline_at  timestamptz NULL,
  seller_cancelled_at        timestamptz NULL,
  buyer_cancelled_at         timestamptz NULL,
  disputed_at                timestamptz NULL,
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_matches_updated_at ON public.matches;
CREATE TRIGGER trg_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX matches_event_idx ON public.matches (event_id);

CREATE INDEX matches_status_intro_deadline_idx
ON public.matches (status, intro_deadline_at)
WHERE status = 'active_intro';

CREATE INDEX matches_status_buyer_confirm_deadline_idx
ON public.matches (status, buyer_confirm_deadline_at)
WHERE status = 'seller_transferred';

-- Add match_id FKs now that matches exists
ALTER TABLE public.buyer_queue
ADD CONSTRAINT buyer_queue_match_fk
FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE SET NULL;

ALTER TABLE public.sellers
ADD CONSTRAINT sellers_match_fk
FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE SET NULL;

-- =========================
-- EMAIL OUTBOX
-- =========================
CREATE TABLE public.email_outbox (
  id         bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  email_type text NOT NULL,
  match_id   bigint NULL REFERENCES public.matches(id) ON DELETE SET NULL,

  to_email   text NOT NULL,
  to_name    text NULL,

  subject    text NOT NULL,
  html       text NOT NULL,
  text       text NOT NULL,

  status     text NOT NULL DEFAULT 'queued'
             CHECK (status IN ('queued', 'sending', 'sent', 'failed')),
  attempts   int NOT NULL DEFAULT 0,
  last_error text NULL,
  send_after timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_email_outbox_updated_at ON public.email_outbox;
CREATE TRIGGER trg_email_outbox_updated_at
BEFORE UPDATE ON public.email_outbox
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX email_outbox_status_send_after_idx
ON public.email_outbox (status, send_after);

-- =========================
-- RLS
-- =========================
ALTER TABLE public.buyer_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- buyer_queue policies
DROP POLICY IF EXISTS buyer_queue_select_own ON public.buyer_queue;
CREATE POLICY buyer_queue_select_own
ON public.buyer_queue
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS buyer_queue_insert_own ON public.buyer_queue;
CREATE POLICY buyer_queue_insert_own
ON public.buyer_queue
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS buyer_queue_update_own ON public.buyer_queue;
CREATE POLICY buyer_queue_update_own
ON public.buyer_queue
FOR UPDATE
USING (auth.uid() = user_id);

-- sellers policies
DROP POLICY IF EXISTS sellers_select_own ON public.sellers;
CREATE POLICY sellers_select_own
ON public.sellers
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS sellers_insert_own ON public.sellers;
CREATE POLICY sellers_insert_own
ON public.sellers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS sellers_update_own ON public.sellers;
CREATE POLICY sellers_update_own
ON public.sellers
FOR UPDATE
USING (auth.uid() = user_id);

-- matches: participants can view
DROP POLICY IF EXISTS matches_select_participants ON public.matches;
CREATE POLICY matches_select_participants
ON public.matches
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.buyer_queue b
    WHERE b.id = buyer_queue_id
      AND b.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.sellers s
    WHERE s.id = seller_id
      AND s.user_id = auth.uid()
  )
);

-- profiles policies
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- no policies for email_outbox => client denied; service role bypasses RLS

-- =========================
-- SEED DATA (Valencia 2026)
-- =========================
INSERT INTO public.events (name, distance_label, distance_meters, is_open)
VALUES
  ('Valencia Marathon 2026', '42K', 42195, true),
  ('Valencia Marathon 2026', '21K', 21097, true);

COMMIT;
