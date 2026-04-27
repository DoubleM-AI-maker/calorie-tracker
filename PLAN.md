# Kalorie-Tracker Implementierungsplan

Basierend auf den Spezifikationen (`kalorie-tracker-spec.md`, `DESIGN.md` und `AGENT_VPS_INSTRUCTIONS.md`) habe ich den folgenden Plan für die Umsetzung der App erstellt.

## 1. Verständnis der Milestones & Scope
Die App ist als Single-User Kalorien-Tracker konzipiert. Der Fokus liegt auf extrem schneller Datenerfassung via Sprache oder Bild. Die Backend-Datenhaltung wird über Drizzle/Postgres abgewickelt, Bilder in MinIO gespeichert.

*   **Milestone 1 – Gerüst**: Next.js App Router Setup, TailwindCSS/shadcn Styling, lokale Docker Compose (Postgres/MinIO), Mock-Auth Middleware für lokales Dev (simuliert Authelia).
*   **Milestone 2 – DB + Nährwert-Import**: Drizzle Schema Setup (User, Food, Meal, Profile). Import-Skript für USDA (CSV) und Anbindung an Open Food Facts.
*   **Milestone 3 – Manuelle Erfassung**: Claude LLM Parsing Pipeline für manuelle Texteingabe. Bestätigungs-Dialog, Speicherung in DB.
*   **Milestone 4 – Sprach- und Foto-Input**: UI für Audio-Recording (Whisper) und Foto-Upload (Claude Vision). Integration in dieselbe Auflösungs-Pipeline.
*   **Milestone 5 – Auswertungen**: Dashboard (Home-Ansicht, Woche, Monat) mit Balken-/Linien-Diagrammen und Ziel-Erreichung.
*   **Milestone 6 – Ziele & Favoriten**: UI für Makro-Ziel-Konfiguration (`goal_profile`) und schnelles Hinzufügen von Favoriten.
*   **Milestone 7 – Lernfähigkeit**: Tracking der Korrekturen in `correction_event`, Auto-Erzeugen von User-Aliasen bei $N=3$.
*   **Milestone 8 – PWA + Backup + Polishing**: Deployment-Vorbereitungen (PWA-Manifest, Docker Caddy-Regeln, Subdomain Routing), Backup Container Setup, README Anpassungen.

## 2. Repo-Struktur
Das Projekt basiert auf Next.js 15 (App Router). 
Die grobe Struktur sieht wie folgt aus:
```text
calorie-tracker/
├── src/
│   ├── app/                # Next.js App Router (Pages, Layouts, API Routes)
│   ├── components/         # React Komponenten (UI nach DESIGN.md)
│   ├── lib/
│   │   ├── db/             # Drizzle Schema & Client
│   │   ├── llm/            # OpenAI & Anthropic Clients (Whisper, Claude)
│   │   ├── auth/           # Middleware für Authelia Header Parsing
│   │   └── nutrition/      # USDA & OFF API Resolver
│   └── types/              # Zentrale TypeScript Interfaces (JSON Schema)
├── scripts/                # USDA Import Scripts
├── docker-compose.yml      # Lokales DB/MinIO Setup
├── Dockerfile              # Next.js Prod Build Image
└── next.config.ts          # basePath Config für VPS Deployment
```

## 3. Library-Entscheidungen
*   **ORM**: **Drizzle ORM**. Nah am SQL, leichtgewichtig, sehr gute Next.js (Server Actions) Integration.
*   **UI/Design**: **TailwindCSS + shadcn/ui**. Implementierung des "Precision Atelier" Ansatzes (keine Hard-Borders, Glassmorphism, Ghost Borders, Inter Font).
*   **Chart-Library**: **Recharts**. Bewährt für Next.js und React. Leicht anpassbar für Balken und Linien-Graphen.
*   **PWA-Library**: **@serwist/next** (der offizielle Nachfolger von `next-pwa`). Modern und kompatibel mit dem Next.js 15 App Router.
*   **Logging**: **pino**.
*   **Form-State**: UI Forms via modernem React 19 / Next.js Server Actions Setup (`useActionState`, `useFormStatus`).

## Open Questions

1. **VPS Subfolder / Base Path**: Unter welchem genauen Pfad wird die App gehostet? Die Specs sprechen allgemein vom Setup `camaja-n8n.com/my-app`. Soll die Base Path für diese App `/kalorie-tracker` oder etwas anderes lauten?
2. **Open Food Facts (OFF)**: Zitat Spec: *"JSONL-Dump oder laufende API-Abfragen"*. Da die OFF Datenbank extrem groß ist, würde ich für den Anfang **laufende API-Abfragen via REST** vorschlagen. Lokales Caching in unsere DB findet statt, sobald ein Produkt 1x aufgelöst wurde. Ist das in Ordnung oder bevorzugst du einen kompletten Bulk-Download?
3. **Local Dev Authentifizierung**: Für lokales Developement entwickle ich eine Fallback-Middleware, die simulierte Authelia-Header (`Remote-User`, `Remote-Groups`) setzt, solange `NODE_ENV === 'development'`. Einverstanden? 

## 4. Deployment-Strategie (Neu)
- **Repository**: [https://github.com/DoubleM-AI-maker/calorie-tracker](https://github.com/DoubleM-AI-maker/calorie-tracker)
- **CI/CD**: GitHub Actions (`.github/workflows/deploy.yml`)
- **Secrets**: Werden über GitHub Repository Secrets verwaltet (`HOST`, `USERNAME`, `SSH_KEY`).
- **Sicherheit**: `.env` Dateien und lokale Test-Skripte mit API-Keys sind über `.gitignore` ausgeschlossen. Direkte VPS-Deployments wurden durch den GitHub-Workflow ersetzt.
