ALTER TABLE public.part_components
  DROP CONSTRAINT IF EXISTS part_components_relation_kind_check;

ALTER TABLE public.part_components
  ADD CONSTRAINT part_components_relation_kind_check
  CHECK (
    relation_kind IN (
      'kit_component',
      'negotiated_option',
      'accessory',
      'vantail_profile_front',
      'vantail_profile_back',
      'vantail_plinth_top',
      'vantail_plinth_bottom'
    )
  );

COMMENT ON COLUMN public.part_components.relation_kind IS
  'Nature du lien : kit_component, negotiated_option, accessory, ou rôle de composition vantail (profil avant/arrière, plinthe haute/basse).';

ALTER TABLE public.quote_items
  DROP CONSTRAINT IF EXISTS quote_items_relation_kind_check;

ALTER TABLE public.quote_items
  ADD CONSTRAINT quote_items_relation_kind_check
  CHECK (
    relation_kind IS NULL
    OR relation_kind IN (
      'kit_component',
      'negotiated_option',
      'accessory',
      'vantail_profile_front',
      'vantail_profile_back',
      'vantail_plinth_top',
      'vantail_plinth_bottom'
    )
  );
