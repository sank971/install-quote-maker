-- Compatibilité avec les rapports existants utilisant un type principal de pièce défaillante.
ALTER TABLE public.intervention_reports
  ADD COLUMN IF NOT EXISTS problem_part_type TEXT;
