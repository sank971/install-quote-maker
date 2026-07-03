-- Ajoute le SIRET des clients et les informations de paiement des fournisseurs.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS siret TEXT;

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS iban TEXT,
  ADD COLUMN IF NOT EXISTS bic TEXT,
  ADD COLUMN IF NOT EXISTS account_holder TEXT;
