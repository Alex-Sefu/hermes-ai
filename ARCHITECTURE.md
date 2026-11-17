# Project Name: HERMES AI - Neuro-Olfactory Perfume Recommender

## 1. Project Overview
Hermes AI is a modern web application (Bachelor's Thesis project) that recommends perfumes using an unconventional, scientifically grounded approach combining cross-modal associations, autobiographical memories, environmental context, and biological factors (histocompatibility/skin chemistry).
It features an immersive 3D web interface (inspired by Autoneum Acoustic Garage) with an abstract reactive 3D avatar named "Hermes" and an AI conversational/interactive flow.

## 2. Tech Stack
- **Frontend:** React (Vite), Tailwind CSS, Three.js (@react-three/fiber, @react-three/drei), Framer Motion / GSAP, Lucide React.
- **Backend:** Python 3.11+, FastAPI, Scikit-learn, Pandas, NumPy, Pydantic.
- **Database:** Supabase (PostgreSQL).
- **AI / LLM:** Ollama (local `llama3`) generates Romanian recommendation revelations; a local fallback keeps recommendations available if Ollama is offline.

## 3. Recommendation Scoring Algorithm (Weighted Hybrid Model)
Total Compatibility Score = 100%, divided into 4 main pillars:

1. **Cross-Modal Associations (40%)**
   - Color selection (10%)
   - Shape selection / Bouba-Kiki effect (8%)
   - Texture selection (8%)
   - Environment selection (7%)
   - Music genre preference (7%)

2. **Wear Context (25%)**
   - Day vs. Night (5%)
   - Indoor vs. Outdoor (5%)
   - Occasion (5%)
   - Season (5%)
   - Region / Climate (5%)

3. **Autobiographical Memory (25%)**
   - Favorite memory / associated scent (8%)
   - Childhood defining scent (6%)
   - Previous perfume history (6%)
   - Unpleasant scent memories -> Negative filter / blacklist penalty (5%)

4. **Biological Factors & Skin Chemistry (10%)**
   - Skin evolution response (5%)
   - Natural skin scent perception (5%)
   - This is an explainable heuristic model, not a medical or genetic test.

## 4. Folder Structure
- `/frontend` - React + Vite + R3F application
- `/backend` - FastAPI server, Scikit-learn engine, Ollama service, Price scraper
  - `/backend/app/api` - API routes
  - `/backend/app/core` - Config and database connection
  - `/backend/app/services` - `recommender.py`, `llm_service.py`, `scraper_service.py`
  - `/backend/app/models` - Pydantic schemas
  - `/backend/data` - Dataset scripts and CSVs

## 5. Recommendation API and Seed Catalog
- `POST /api/recommend` accepts the completed cross-modal, context, memory, skin-response, and budget profile and returns the three highest-ranked perfumes.
- When Supabase is configured, recommendation requests and their Top 3 are written to `public.recommendation_history`. Keep the server-side `SUPABASE_KEY` secret and use a service-role key for this server-only insert; history-table row-level security is enabled.
- `backend/data/perfumes_seed.json` is the local catalog and contains 50 curated entries across the five UI budget ranges. Prices are illustrative RON estimates, not live offers.
- `backend/data/supabase_schema.sql` defines the matching `public.perfumes` table. The API reads from Supabase when both credentials are configured and a valid catalog is available; otherwise it logs the fallback and uses the bundled seed.
- Every seed-catalog perfume includes a public product-image URL and a directly researched Parfumo profile URL when an exact profile is available. The API passes `reference_url` through unchanged; the result UI displays catalog images directly without image blending or masking.
- Imported `fra_cleaned.csv` rows keep their source Fragrantica profile in `reference_url`; that dataset does not include product-image URLs. The UI labels external profile links by their actual host, uses a matching curated seed image when available, and shows a graceful placeholder otherwise. Supabase recommendations query only the requested budget slice and page through all rows in that slice.
- The ranking combines weighted categorical cosine similarity, TF-IDF and Romanian scent-keyword matches, an explicit negative-note filter, and heuristic reported skin-response preferences.
- The recommendation endpoint sends the user's profile and Top 3 perfume notes to Ollama for a short Romanian explanation in `revelation`; if Ollama is unavailable, the endpoint returns a fixed Romanian fallback.
- Compatibility scores are recommendation heuristics only. The two skin questions do not measure MHC or establish genetic, medical, or dermatological compatibility.