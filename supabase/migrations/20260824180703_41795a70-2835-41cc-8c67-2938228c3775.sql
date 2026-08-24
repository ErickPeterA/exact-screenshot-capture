-- Papéis
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Sessões da jornada
CREATE TABLE public.journey_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_version text NOT NULL DEFAULT 'v1',
  name text NOT NULL,
  company text NOT NULL,
  status text NOT NULL DEFAULT 'started',
  current_node text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.journey_sessions TO service_role;
ALTER TABLE public.journey_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sessions" ON public.journey_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.session_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.journey_sessions(id) ON DELETE CASCADE,
  node_code text NOT NULL,
  option_code text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, node_code)
);
GRANT ALL ON public.session_answers TO service_role;
ALTER TABLE public.session_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read answers" ON public.session_answers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX session_answers_session_idx ON public.session_answers(session_id);

CREATE TABLE public.result_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.journey_sessions(id) ON DELETE CASCADE,
  dimension_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  service_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  priorities jsonb NOT NULL DEFAULT '[]'::jsonb,
  opportunities jsonb NOT NULL DEFAULT '[]'::jsonb,
  structured_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  uncertainty_rate numeric NOT NULL DEFAULT 0,
  journey_version text NOT NULL DEFAULT 'v1',
  engine_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);
GRANT ALL ON public.result_snapshots TO service_role;
ALTER TABLE public.result_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read snapshots" ON public.result_snapshots FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.journey_sessions(id) ON DELETE CASCADE,
  email text NOT NULL,
  whatsapp text,
  wants_contact boolean NOT NULL DEFAULT true,
  consent boolean NOT NULL DEFAULT false,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read leads" ON public.leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.journey_sessions(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  node_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read analytics" ON public.analytics_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX analytics_events_name_idx ON public.analytics_events(event_name, occurred_at DESC);