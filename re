POST https://snxunodxgbeldliiqlab.supabase.co/rest/v1/rpc/receive_ticket_quote
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNueHVub2R4Z2JlbGRsaWlxbGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzOTA3OTEsImV4cCI6MjA5NTk2Njc5MX0.FwqbKKCn3PYSsa2eFw0Jt_1EVjS8EAFNWJjEOIZEMQs
Content-Type: application/json
X-Webhook-Secret: <secret partagé ci-dessus>

https://install-quote-maker.lovable.app/api/webhooks/tickets/e2e9feb7fff345f3832ecac308ca61b93d2c667b04ba4b479236e2eeee14582b
test : https://install-quote-maker.lovable.app/api/webhooks/e2e9feb7fff345f3832ecac308ca61b93d2c667b04ba4b479236e2eeee14582b

{
  "event": "status_en_attente_devis",
  "ticket": {
    "id": "b1f6b8b2-70f0-4a2b-9d9d-8f0b1c2d3e4f",
    "number": "T-1042",
    "title": "Porte sectionnelle bloquée",
    "description": "Le client signale un blocage complet de la porte.",
    "priority": "haute"
  },
  "problem": {
    "panne_description": "Ressort de torsion cassé",
    "actions_done": "Mise en sécurité",
    "recommendation": "Remplacement du jeu de ressorts"
  },
  "client": {
    "name": "Société Dupont"
  },
  "site": {
    "name": "Agence Paris",
    "address": "10 rue de Paris",
    "postal_code": "75001",
    "city": "Paris"
  },
  "equipment": {
    "code": "P-03",
    "equipment_type": "Porte sectionnelle",
    "serial_number": "SN-12345",
    "state": "hs"
  }
}
