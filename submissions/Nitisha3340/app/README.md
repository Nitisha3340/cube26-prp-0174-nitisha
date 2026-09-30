# Prep Manager Demo App

Local operator-facing demo for the headless Prep Manager agent. The UI does not call Gemini directly: the browser posts one unit capture to `/api/analyze`, the server selects the explicit provider, and the existing agent pipeline remains the source of truth for verdicts and evidence.

## Run locally

From this directory:

```sh
npm install
npm run dev
```

Open `http://localhost:3000`.

The default provider is **Deterministic mock**, which is intentionally transparent and returns `UNCERTAIN` observations when no visual finding is configured. To use Gemini, select **Gemini REST** and provide server-side environment variables before starting Next.js:

```powershell
$env:GEMINI_API_KEY = "<paste-your-Gemini-key-in-your-local-shell-only>"
$env:GEMINI_MODEL = "gemini-3.8-flash"
npm run dev
```

Set the key in the shell that starts Next.js; do not paste it into source, browser code, logs, or a committed file. Do not create a `.env` file with credentials. The key is read only by the server provider and is never included in client code or API responses. `GEMINI_MODEL` is optional; omit it to use the provider default.

## Demo workflow

1. Enter unit, record, and organisation IDs.
2. Optionally add work order, SKU, and FNSKU context.
3. Select multiple product photographs and remove/reselect them as needed.
4. Choose the deterministic mock or Gemini REST provider.
5. Select **Analyze Preparation**.
6. Review the overall status and the evidence for each of the six checks.

No product images or evaluation labels are included. Uploaded images are runtime inputs only.

## Browser extension hydration note

The app does not render `data-gr-c-s-check-loaded` or `data-gr-ext-installed`. If those attributes appear in a hydration warning, they were added by a browser extension such as Grammarly. Verify the page in a clean/incognito browser with extensions disabled; do not hide the warning with `suppressHydrationWarning`.
