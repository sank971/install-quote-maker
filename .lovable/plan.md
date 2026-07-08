
# Refonte Dashboard — Cockpit KPI & Rentabilité

Le Dashboard actuel se limite à quelques compteurs. Cette refonte le transforme en un vrai centre de pilotage financier et opérationnel, avec un moteur de calcul de rentabilité, des filtres globaux, plusieurs sections analytiques et un système d'alertes/recommandations.

Vu l'ampleur, je découpe en **3 phases livrables** pour que vous puissiez valider au fur et à mesure. Cette validation porte sur la Phase 1 + le cadrage des Phases 2/3.

---

## Phase 1 — Fondations (livrée en 1er)

### 1.1 Paramètres globaux de coûts
Nouvelle table `cost_settings` (une ligne par owner) :
- coût moyen au km, prix carburant, consommation véhicule, coût véhicule/km
- coût horaire technicien, coût horaire administratif
- coût moyen envoi pièce
- marge minimum souhaitée
- adresse agence par défaut (départ technicien)

Édition depuis **Paramètres → Coûts & rentabilité**.

### 1.2 Champs de coûts réels (interventions & commandes pièces)
Ajouts colonnes (nullable, saisie manuelle facultative) :
- `interventions` : `distance_km`, `travel_minutes`, `onsite_minutes`, `fuel_cost`, `toll_parking_cost`, `subcontractor_cost`, `admin_minutes`, `extra_cost`, `extra_cost_reason`, `technician_id`, `start_address`
- `part_orders` : `shipping_cost`, `pickup_cost`, `supplier_delivery_cost`
- `part_order_items` : `unit_purchase_cost_actual`

### 1.3 Moteur de calcul de rentabilité (`src/lib/analytics/profitability.ts`)
Fonctions pures côté client, alimentées par les listes existantes (`useList`) + `cost_settings` :
- `computeInterventionCost(intervention, settings)` → coût déplacement + MO + pièces + extras
- `computeQuoteRevenue(quote, items)` → CA MO + déplacement + pièces + forfait
- `aggregateByClient / BySite / ByContract / ByInstallation / ByTechnician / ByPart / BySupplier / ByBrand / ByInstallationType`
- Retourne : CA, coût, marge brute, marge nette, taux de marge, indicateur (vert/orange/rouge selon `min_margin`)

### 1.4 Filtres globaux du Dashboard
Barre de filtres en haut, synchronisée dans l'URL (search params) :
période (jour/semaine/mois/trimestre/année/perso), client, site, contrat, technicien, type installation, marque, fournisseur, statut intervention/devis/commande.

### 1.5 Nouvelle structure de page Dashboard (onglets)
- **Vue d'ensemble** : cartes KPI + graphiques CA/marge/coûts dans le temps
- **Clients** : classement rentabilité + indicateurs couleur
- **Contrats** : rentabilité par contrat, statut auto (rentable / limite / déficitaire)
- **Pièces** : les plus commandées, marges, rotation
- **Fournisseurs** : volumes, délais, comparaison prix
- **Parc** : répartition types/marques/modèles, installations à risque
- **Techniciens** : coûts, CA, résolution 1re visite
- **Alertes & recommandations** : bloc auto généré

### 1.6 Cartes KPI principales (vue d'ensemble)
CA total, marge brute, marge nette estimée, taux de marge, nb interventions, nb devis, taux d'acceptation, montant devis acceptés, montant pièces commandées, coût achats fournisseurs, coût déplacements, coût techniciens, coût envois pièces, bénéfice net, nb contrats actifs / rentables / déficitaires.

---

## Phase 2 — Analytiques détaillées

- Tableaux triables/filtrables par section (Clients, Contrats, Pièces, Fournisseurs, Parc, Techniciens) avec toutes les colonnes demandées.
- Graphiques (recharts, déjà dispo) : évolution CA/marge, top 10 clients/pièces/fournisseurs/marques, coûts par mois, comparaison CA vs coûts, marge par client/site/contrat, répartition parc.
- Fiches analytiques cliquables (client, site, contrat) : résumé financier + graphes + listes liées.

## Phase 3 — Automatisations avancées

- Table `analytics_snapshots` : job manuel "Calculer et figer" pour garder l'historique mensuel.
- Moteur d'alertes automatiques (contrat déficitaire, client non rentable, pièce trop commandée, fournisseur trop cher, technicien éloigné, etc.).
- Recommandations générées à partir des règles (texte + lien vers l'entité).
- Calcul distances/trajets : saisie manuelle d'abord ; intégration API cartes (Mapbox/Google) en option ultérieure si vous fournissez la clé.

---

## Détails techniques

- Migrations SQL groupées : `cost_settings`, colonnes ajoutées, `analytics_snapshots` (Phase 3), RLS scoped `owner_id = auth.uid()`, GRANTs authenticated + service_role.
- Calculs 100% côté client (React Query) — pas de serverFn nécessaire, les données sont déjà chargées par `useList`. Extraction dans `src/lib/analytics/` (profitability, filters, formatters).
- UI : nouveaux composants sous `src/components/dashboard/` (KpiCard, FiltersBar, ProfitTable, RankingList, AlertList). Charts avec `recharts`.
- Route Dashboard réorganisée avec `<Tabs>` shadcn ; chaque onglet = composant dédié.
- Indicateur couleur = badge (`bg-emerald-500/15` / `bg-amber-500/15` / `bg-red-500/15`).
- Aucune donnée de démo injectée — tout se base sur les données réelles du compte.

---

## Ce qui n'est PAS inclus (à confirmer / phase ultérieure)

- Calcul automatique des distances via API cartes (nécessite clé Mapbox/Google + budget).
- Intégration comptable / export vers logiciel de compta.
- Notifications push / email sur alertes (à ajouter si souhaité via edge function).
- Un vrai "coût technicien réel" par personne suppose une table `technicians` avec taux propres ; en Phase 1 j'utilise le taux global de `cost_settings`, en Phase 2 j'ajoute une table `technicians` avec taux individuel et véhicule.

Je livre la Phase 1 dès validation, puis j'enchaîne 2 et 3.
