# EpiCast — Epidemic Intelligence & Forecasting

A premium, light-mode, production-ready React frontend for monitoring disease
outbreaks, analyzing risk zones, forecasting trends and managing reports.
Tuned for **Hyderabad** demonstrations but supports any city out of the box.

- 🔒 **Firebase Authentication** with role-based protected routes (Authority / Clinic).
- 🗺 **Live maps** with marker clustering, click-to-fly, browser geolocation, and free
  **OpenStreetMap Nominatim** location search.
- 📈 **Forecasting** with elegant Recharts visualizations and skeleton loading.
- 🧱 **Centralized Axios service layer** with token interceptor and graceful API fallback.
- 🦴 **Skeletons + error states** on every async surface — no blank screens.
- ⚡ **Vercel-ready** with optimized vendor chunk splitting.

---

## Quick Start

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production bundle in dist/
npm run preview   # serve the production bundle locally
```

### Demo mode

Without Firebase configured, any non-empty email and password are accepted
and the chosen role is persisted locally. Try:

| Portal    | Email                    | Password    |
| --------- | ------------------------ | ----------- |
| Authority | `admin@epicast.io`       | `demo1234`  |
| Clinic    | `clinic@epicast.io`      | `demo1234`  |

The role is whichever tab is active on the login form (pre-filled from the
`?role=` query string set by the Get Started modal).

---

## Configuration

Copy the example env file and edit values:

```bash
cp .env.example .env
```

| Variable                            | Required | Purpose                                       |
| ----------------------------------- | -------- | --------------------------------------------- |
| `VITE_API_BASE_URL`                 | yes      | Base URL of your REST backend.                |
| `VITE_API_STRICT`                   | no       | `true` disables mock fallback (recommended in prod). |
| `VITE_FIREBASE_API_KEY`             | prod     | Firebase web API key.                         |
| `VITE_FIREBASE_AUTH_DOMAIN`         | prod     | e.g. `your-project.firebaseapp.com`.          |
| `VITE_FIREBASE_PROJECT_ID`          | prod     | Firebase project id.                          |
| `VITE_FIREBASE_STORAGE_BUCKET`      | prod     | e.g. `your-project.appspot.com`.              |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | prod     | Numeric sender id.                            |
| `VITE_FIREBASE_APP_ID`              | prod     | Web app id (`1:0000…:web:…`).                 |

> Firebase web API keys are **not** secrets — they identify your project.
> Access is enforced by Firebase Security Rules and (optionally) custom claims.

---

## Firebase Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project.
2. Under **Authentication → Sign-in method**, enable **Email/Password**.
3. Under **Project settings → Your apps**, register a Web app.
4. Copy the SDK config values into your `.env` (see the table above).
5. (Optional) For role-based custom claims, set them server-side via the Admin SDK; the
   frontend currently stores role in `localStorage` after registration — see
   `src/services/auth.service.js`.

---

## Backend Integration

`src/services/api.js` is the single Axios instance.

- **Request interceptor** attaches `Authorization: Bearer <Firebase ID token>`.
- **Response interceptor** distinguishes 401 / 403 / 5xx / network and surfaces
  friendly toasts.
- **`withFallback(promise, fallback)`** lets each service degrade gracefully to mock
  data on failure (disable with `VITE_API_STRICT=true`).

Service modules: `dashboard`, `reports`, `alerts`, `forecast`, `areas`, `auth`, `location`.

### Expected endpoints (placeholders)

```
GET    /dashboard/metrics
GET    /dashboard/insights
GET    /dashboard/map-points

GET    /reports?type=&disease=&area=&from=&to=&q=
GET    /reports/:id
POST   /reports/case          body: { disease, area, count, notes, lat?, lng?, locationLabel? }
POST   /reports/death         body: { disease, area, count, notes, lat?, lng?, locationLabel? }
DELETE /reports/:id

GET    /alerts?severity=&status=
POST   /alerts/:id/acknowledge
POST   /alerts/:id/resolve

GET    /forecast?disease=
GET    /forecast/trend
GET    /forecast/table?disease=

GET    /areas?q=
POST   /areas                 body: { id?, name, lat, lng, ...meta }
DELETE /areas/:id
GET    /risk-zones?risk=&disease=
GET    /hotspots?risk=&disease=
```

The frontend submits standard JSON bodies; field names match the placeholders.

---

## Location Search (OpenStreetMap Nominatim)

- Free, no API key, no Google Maps.
- Endpoint: `https://nominatim.openstreetmap.org/search?q=...&format=jsonv2`.
- Searches are debounced (280 ms), stale requests aborted automatically.
- Results inside the configured region (Hyderabad by default) are boosted.
- Component: `src/components/map/LocationSearch.jsx` — drop-in autocomplete with
  keyboard navigation, clear, current-location, and skeleton loading.
- Service: `src/services/location.service.js` — `searchLocations(query)` and
  `reverseLookup(lat, lng)`.

To change the default region, edit `src/lib/config.js`:

```js
export const DEFAULT_REGION = {
  name: 'Hyderabad',
  center: [17.385, 78.4867],
  zoom: 11,
  zoomDetail: 14,
  viewbox: [78.20, 17.20, 78.70, 17.60],
};
```

The app still supports any city — only the default starting view + search bias change.

---

## Deployment — Vercel

1. Push the repo to GitHub.
2. Import the project at [vercel.com/new](https://vercel.com/new) — framework is auto-detected as Vite.
3. Add the env vars listed above under **Project → Settings → Environment Variables**.
4. Deploy. The included `vercel.json`:
   - SPA-rewrites all routes to `/` (so deep links work).
   - Sets long-lived cache headers on `/assets/*`.

Alternatives: Netlify (drop in a `_redirects` file with `/* /index.html 200`),
Cloudflare Pages, Firebase Hosting, AWS S3 + CloudFront — all work the same with
the SPA-rewrite caveat.

---

## Architecture

```
src/
  app/
    layouts/        MarketingLayout · AuthLayout · AuthorityLayout · ClinicLayout
    router.jsx      Routes + ProtectedRoute wiring + page transitions
  pages/
    marketing/      Landing
    auth/           Login · Register
    authority/      Dashboard · Areas · Reports · RiskZones · Hotspots ·
                    Forecasting · Alerts · Settings
    clinic/         Dashboard · SubmitCaseReport · SubmitDeathReport ·
                    History · Profile
    NotFound.jsx
  components/
    ui/             Button · Panel · Modal · Tabs · Input · Select · Field · Label ·
                    Textarea · Badge · Table · MetricCard · PageHeader · SectionHeader ·
                    Divider · EmptyState · Skeleton · ErrorState · ErrorBoundary ·
                    AsyncBoundary
    layout/         Sidebar · Navbar · Logo · PageTransition · navConfig
    map/            MapContainer · RiskMarkers · RiskLegend · LocationSearch · leafletFix
    charts/         ForecastChart · TrendChart · ChartTooltip
    alerts/         AlertCard
    reports/        ReportsTable
    marketing/      Section · SectionHeading · CapabilityCard · PlatformPreview ·
                    GetStartedModal
    auth/           ProtectedRoute · BootSplash
  contexts/         AuthContext
  services/         api · auth · dashboard · reports · alerts · forecast · areas · location
                    + _mock/mockData (Hyderabad-flavored demo data)
  hooks/            useAsync · useDebounce
  lib/              firebase · config (DEFAULT_REGION = Hyderabad)
  styles/           index.css (Tailwind v4 @theme tokens)
  App.jsx · main.jsx
```

---

## License

Internal — provided as a deliverable.
