# Hermes - Neuro-Olfactory AI Recommender

Hermes este un prototip de cercetare dezvoltat în cadrul unei lucrări de licență. Proiectul explorează recomandarea personalizată de parfumuri prin combinarea asocierilor cross-modale, a amintirilor olfactive autobiografice, a contextului de utilizare și a preferințelor declarate privind evoluția parfumului pe piele. Aplicația prezintă trei recomandări din catalog, scoruri euristice de compatibilitate și o explicație în limba română generată de un model lingvistic local.

Scorurile au caracter experimental și nu reprezintă măsurători medicale, genetice sau dermatologice și nici indicatori validați științific ai compatibilității individuale.

## Arhitectură

- **Frontend:** React, TypeScript și Vite, cu o experiență interactivă 3D construită cu Three.js și React Three Fiber.
- **Backend:** Python și FastAPI expun API-ul de recomandare. Un algoritm hibrid ponderat clasifică parfumurile din catalog pe baza răspunsurilor utilizatorului.
- **Catalog și persistență:** În mod implicit, aplicația folosește catalogul seed inclus în proiect. Supabase (PostgreSQL) este opțional pentru citirea catalogului și salvarea istoricului recomandărilor.
- **Explicații AI:** Ollama rulează local modelul `llama3`. Hermes transmite profilul utilizatorului și notele parfumurilor recomandate către Ollama pentru a genera o explicație scurtă în română. Dacă Ollama nu este disponibil, API-ul returnează un mesaj alternativ predefinit.

## Cerințe

- Python 3.11 sau o versiune mai nouă
- Node.js și npm
- [Ollama](https://ollama.com/) pentru generarea locală a explicațiilor

Supabase este opțional. Fără `SUPABASE_URL` și `SUPABASE_KEY`, backendul folosește catalogul local inclus și nu salvează istoricul recomandărilor în baza de date.

## Rulare locală (Windows PowerShell)

Deschideți trei terminale PowerShell în directorul proiectului.

### 1. Porniți Ollama

Instalați Ollama și descărcați modelul o singură dată:

```powershell
ollama pull llama3
```

Pe Windows, Ollama rulează de obicei ca serviciu în fundal. Dacă nu este deja pornit, lansați-l:

```powershell
ollama serve
```

Backendul se conectează la API-ul Ollama de la `http://localhost:11434`.

### 2. Porniți backendul

În al doilea terminal:

```powershell
Set-Location .\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

API-ul este disponibil la `http://localhost:8000`. Documentația interactivă se găsește la `http://localhost:8000/docs`, iar verificarea stării serviciului la `http://localhost:8000/health`.

Pentru a folosi Supabase, copiați `backend/.env.example` în `backend/.env` și completați `SUPABASE_URL` și `SUPABASE_KEY`. Păstrați cheia server-side privată și nu o introduceți în variabilele frontendului. Catalogul local funcționează și fără această configurare.

### 3. Porniți frontendul

În al treilea terminal:

```powershell
Set-Location .\frontend
npm install
npm run dev
```

Deschideți adresa Vite afișată în terminal (implicit `http://localhost:5173`). Frontendul folosește implicit API-ul de la `http://localhost:8000`. Pentru a schimba adresa, setați `VITE_API_BASE_URL` în `frontend/.env.local`.

## Verificări pentru dezvoltare

Rulați comenzile următoare din directorul `frontend/`:

```powershell
npm run typecheck
npm run test
npm run build
```

Rulați testele backendului din `backend/`, cu mediul virtual activat:

```powershell
python -m unittest discover -s tests -p "test_*.py"
```

## Date și Git

`backend/data/perfumes_seed.json` este catalogul inclus pentru rularea locală. Fișierul brut `backend/data/fra_cleaned.csv` este exclus intenționat din Git; păstrați-l local dacă aveți nevoie de el pentru importul datelor. Fișierele de mediu cu setări locale sau credențiale sunt, de asemenea, ignorate, în timp ce fișierele `.env.example` pot fi păstrate în repository ca șabloane.
