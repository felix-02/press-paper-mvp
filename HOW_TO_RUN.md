# How to run & demo Presspaper

A one‑page guide. For the full technical write‑up see **DOCUMENTATION.md**.

---

## 1. Run it

### The simplest way (offline, no tools)
Double‑click **`dist/index.html`** (or drag it into a browser tab). That's it.

The whole application — JavaScript, CSS and fonts — is inlined into that single file, so it runs from your hard drive with **no web server and no internet**. Works in Chrome, Edge, Firefox and Safari. Designed for a 13–16" laptop at roughly 1440px wide.

### The developer way
```bash
npm install
npm run dev          # opens http://localhost:5173
```

To regenerate the offline file:
```bash
npm run build        # type-checks, then writes a self-contained dist/index.html
npm run preview      # preview the built output at http://localhost:4173
```

---

## 2. Where to start

The presenter is treated as already signed in. You can enter either experience from the public pages:

- **Institution studio** → on **Log In**, click *Sign in as an institution* (or choose *As an Institution* on **Sign Up**). You start on the institution **Dashboard** (`#/inst`).
- **Individual reader** → on **Log In**, click *Log In* (or choose *As an Individual* on **Sign Up**). You start on the **Home** feed (`#/home`).

You can also jump straight to a screen by editing the hash in the address bar, e.g. `…/index.html#/inst/analytics` or `…/index.html#/home`.

---

## 3. The two scripted flows

### Flow A — Institution publishes a release
1. Enter the **institution** experience → **Dashboard**.
2. Open **Publish** from the sidebar.
3. Type a **Headline**, optionally a summary and body, choose a **Release type** and a **Cover**. The live preview on the right updates as you type.
4. Press **Review & Publish**.
5. You arrive on **Releases** — your new release is the **top row**, tagged **New**, and a success toast appears.

*Edge case to show:* press **Review & Publish** with an empty headline. Nothing breaks — the field highlights, focus jumps to it, and a gentle toast asks for a headline. Add one and it publishes.

### Flow B — Individual reads a release
1. Enter the **individual** experience → **Home**.
2. Open the **Welsh Government** release (click its headline or image).
3. On the full release page:
   - Read the **AI Summary** in the right rail.
   - Click an **Ask Anything** suggestion → a canned answer appears in the thread. You can also type a question and press send.
   - Use **Translate** → switch to **Cymraeg** to see the release in Welsh; switch back to English.
   - Press **Save** → a toast confirms it.
4. Open **Saved** from the sidebar — the release you saved is listed there.

---

## 4. Good things to point out

- **Follow** an institution anywhere (feed cards, suggestions, an institution's public page) and the state stays consistent everywhere you see it.
- Every button is reachable. Controls that aren't part of these flows are deliberately **inert** — they never throw an error or lead to a dead end.
- The charts are **identical every run** (seeded), so your demo is repeatable.
- **Log Out** (individual **Profile**) returns you to the public landing page and resets the session.

---

## 5. Notes

- This is a **front‑end prototype**: content is static, there is no login, no server and no database, and **nothing is saved after you close the tab**.
- Best viewed on a laptop screen; it is intentionally desktop‑only, in English, with a dark product theme and pure‑black public pages, exactly as specified.
