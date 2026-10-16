# Stitch prompt'ları (sürüm 3: "cam" template stili)

**Ne değişti:** Görsel stil artık sellingpilot değil, v0-modern-agentic.vercel.app tarzı. Bu stil tüm sitede, bir template gibi tutarlı kullanılacak. Akış ve ekranlar aynı kalıyor:
- Tek eserlik Protect akışı
- Monitoring kutuları
- Eşleşmeler ve karşılaştırma paneli
- Landing, Pricing, Account, Check, Auth

Ekran prompt'ları (1–9) içeriği tarif ediyor; görünümü 0. bölümdeki yeni tasarım dili belirliyor. Bir ekran prompt'unda "blue pill" ya da "bold heading" geçiyorsa, **yeni tasarım dili geçerlidir.**

## Kullanım

1. Stitch'te **"TraceMyAssets redesign"** projesini aç.
2. **Önce tasarım sistemini güncelle:** "0. Tasarım dili" bloğunu yapıştır ve şunu ekle: *"Replace the project's design system with this one."* Stil referansı olarak v0 sitesinin bir ekran görüntüsünü de yükleyebilirsin. Ama o sitenin görsellerini, metinlerini ve rakamlarını kopyalatma.
3. **Mevcut 4 ekranı yeniden stillendir:** Her ekran için "R. Yeniden stillendirme" bloğunu kullan.
4. **Kalan ekranları üret:** 5–9 numaralı ekran prompt'larını kullan. Sıra: 7 (Landing) → 8 → 9 → 6 → 5.
5. **Cam görseller:** "G. Cam görseller" bölümündeki prompt'larla üret. Beğendiklerini koda uygularken projeye indirip kaydedeceğim; Stitch'in bağlantıları kalıcı değil.
6. **Kaydetme:** Her ekran bitince Stitch oturumuna "ekran X hazır" de. Ekran `design/stitch/` klasörüne kaydedilir ve ben koda uygularım.

**Kredi ve tarama kuralları.** Ekranlarda bunlar doğru yazılmalı:
- Elle başlatılan Standard scan aylık hakkından düşer (Free planda ayda 5).
- Otomatik taramalar plana dahildir; hiçbir haktan düşmez.
- Deep scan 1 kredi harcar.

---

## 0. Tasarım dili

```
Design system for "TraceMyAssets", a web app that protects artists' work: it adds an invisible watermark to an artwork and keeps scanning the web for copies. Users are independent artists, not technical people. Every screen has ONE obvious next step; nothing to search for.

Visual style: calm, premium, editorial — a light "glass and crystal" template used consistently on every page (marketing and app). Inspired by modern AI-product landing pages: warm off-white canvas, very large LIGHT-weight headlines, generous whitespace, frosted-glass surfaces, and iridescent glass 3D objects as imagery. Quiet and confident, never loud.

Colors:
- Canvas #F5F4F0 (warm off-white), surfaces #FFFFFF at 70–90% opacity with backdrop blur (frosted glass), soft section tint #EEECE6.
- Text #111111, secondary text #6B6A66, hairline borders #E2E0DA.
- Primary action: solid near-black pill #111111 with white text. Secondary action: transparent pill with a 1px border in #111111 at 20% opacity.
- Accent: an iridescent gradient (lavender #C9C3F5 → sky #BFD9F7 → pearl #F3E9F7) used only for highlights, selected states, progress and imagery — never for body text.
- Status (muted, small): success #2F7A55 on #E6F2EA, attention #9A5B12 on #F7EEDD, danger #B4322B on #F8E5E3, neutral #6B6A66 on #EEECE6.
Dark mode: canvas #0E0E10, surfaces #17171A with blur, text #F2F1EE, secondary #A3A19C, borders #2A2A2E, primary pill #F2F1EE with dark text.

Typography:
- Headlines "IBM Plex Sans" weight 300, tight letter-spacing (-2%): hero 80–96px, page titles 48px, section titles 40px.
- Body and UI "Geist" 15–16px weight 400; card titles 18px weight 500.
- Small labels: 11px uppercase with wide letter-spacing (+8%), e.g. "MONITORING", "STEP 2 OF 4", shown inside a subtle rounded tag.
- Numbers tabular.

Shape and surfaces:
- Header: a floating frosted-glass bar with rounded corners (16px), inset 16px from the screen edges, sticky.
- Cards: 20px radius, frosted white, 1px hairline border, no heavy shadows (a very soft, wide shadow only on floating panels and menus).
- Buttons: pills, 44px tall (36px small), uppercase 12px tracked labels for primary and secondary actions ("PROTECT NEW ARTWORK", "SCAN NOW").
- Inputs: 48px, 12px radius, hairline border, white.
- Icons: thin 1.5px outline icons, always next to a text label on buttons.

App header (signed in): floating glass bar; left the wordmark "TRACEMYASSETS" in spaced uppercase with a small glass shield icon; center links "Monitoring", "Matches" (with a small count), "Check an image"; right a black pill "+ PROTECT NEW ARTWORK", a bell, an avatar menu. Only one header.

Cost labels: any action that uses something up shows its cost in small secondary text right under the button, e.g. "Uses 1 of your 5 monthly scans · 3 left" or "Uses 1 Deep scan credit · 3 left".
Status chips: small rounded tags, e.g. "AUTO-SCAN WEEKLY", "AUTO-SCAN OFF", "SCANNING…" (with an iridescent shimmer), "2 COPIES", "NO COPIES FOUND".
Motion: gentle fade-up on scroll, soft shimmer on progress; nothing bouncy.

Imagery rules:
- Imagery is iridescent glass/crystal 3D objects on soft light backgrounds: a glass shield, a glass magnifying glass, a glass picture frame, glass prisms, a glass fingerprint, soft light caustics. Use them in heroes, feature cards, empty states and success moments.
- App screens stay focused: the user's artwork thumbnails are the main images; glass objects only in empty states, the scanning moment and results.
- Never use stock photos of people, fake customer logos, fake testimonials or fake statistics (no "50M+ users", no uptime numbers).
All UI text in English.
```

---

## R. Yeniden stillendirme (mevcut 4 ekran için)

Ekranı seçip şunu yaz:

```
Restyle this screen with the project's new design system: warm off-white canvas, floating frosted-glass header, IBM Plex Sans Light headlines, Geist body, black and outlined pill buttons with uppercase labels, frosted white cards with 20px radius, iridescent glass accents. Keep every piece of content, every state and the layout order exactly as they are. Remove any claim that isn't in the content (no "court-admissible", no "SHA-256", no engine or domain counts).
```

---

## G. Cam görseller

Her birini ayrı üret. İstediğin kadar varyasyon dene; beğendiklerini bana söyle.

1. **Hero:** `An iridescent glass shield floating above a glass picture frame that holds a soft abstract painting, light caustics and prism reflections, warm off-white background, soft studio light, 3D render, high detail, no text`
2. **Search:** `An iridescent glass magnifying glass hovering over small glass picture frames, rainbow light refractions, warm off-white background, 3D render, no text`
3. **Watermark:** `A transparent glass fingerprint embedded in a frosted glass pane, subtle iridescent edges, warm off-white background, 3D render, no text`
4. **Protected (success):** `A small iridescent glass shield with a soft glow, minimal composition, warm off-white background, 3D render, no text`
5. **Nothing found (calm):** `A clear glass sphere resting on a white surface with gentle rainbow caustics, minimal, calm, warm off-white background, 3D render, no text`
6. **Matches / comparison:** `Two glass picture frames side by side connected by a thin beam of prismatic light, warm off-white background, 3D render, no text`

> Senin gönderdiğin hırsız görseli bu açık ve camlı stile uymuyor (koyu ve fotoğraf gibi). Landing'deki koyu bandı da bu yüzden cam görsellerle değiştirdim. Yine de kullanmak istersen söyle; ayrı bir bölüme koyarız.

---

## 1. Yükleme akışı: tek eser, adım adım → `01-protect-flow`

```
Web screen: the "Protect new artwork" flow of TraceMyAssets. It is a focused, distraction-free page: same app header, then a centered column (720px) that shows ONLY this one artwork. A horizontal stepper at the top: 1 Upload · 2 Protect · 3 Scan · 4 Results (current step highlighted).

Show step 1 as the main screen:
- big heading "Protect a new artwork", subtext "Upload your original. It stays private — we give you back a protected copy to share."
- a large dashed drop area with an image icon: "Drop your artwork here or browse", small "PNG, JPEG or WEBP · up to 25 MB"
- after choosing: a large preview of the image, field "Title" prefilled "Sunset Study", and a primary pill button "Continue"
Then, as additional frames of the same page:
- Step 2 "Protecting your artwork": the image large in the center with a subtle scanning shimmer, checklist that ticks as it completes: "Visual fingerprint created", "Invisible watermark added", "Protected copy ready". Button "Download protected copy" (secondary) and primary "Continue".
- Step 3 "How should we look for copies?": two big selectable option cards side by side:
  • "Standard scan" — "Searches the web for images like yours." — cost line "Uses 1 of your 5 monthly scans · 4 left"
  • "Deep scan" — "Looks further and finds more hidden copies." — cost line "Uses 1 Deep scan credit · 3 left"
  Below, a toggle row (on by default): "Keep watching automatically — scan weekly" with a small dropdown Weekly / Monthly (Daily shows a lock "Pro"), and a note "Automatic scans are included in your plan and don't use your monthly scans."
  Primary pill "Start scan".
```

## 2. Tarama ve sonuç (tek eser) → `02-scan-result`

```
Web screen: the same focused "Protect new artwork" page at steps 3-4, still showing ONLY this one artwork.

Frame A "Scanning": the artwork large in the center, a calm animated radar/progress ring around it, heading "Looking for copies of Sunset Study", live status lines appearing one by one: "Searching the web…", "Found 12 similar images", "Checking each one against your original…". Text "This usually takes 1–2 minutes. You can leave this page — we'll keep going and add it to Monitoring."

Frame B "Results — copies found": heading "We found 2 possible copies", a row of two small cards each showing your artwork vs. the found image side by side with "Strong match · 94%" and "Watermark found". Primary pill "Review the copies" and secondary text link "Go to Monitoring". A green info line: "Sunset Study is now monitored weekly. Next scan: 23 Oct."

Frame C "Results — nothing found": a calm illustration with a check mark, heading "No copies found right now", text "Good news. We'll keep watching weekly and tell you if anything appears." Primary pill "Go to Monitoring", secondary "Protect another artwork".
```

## 3. Monitoring (ana sayfa, tüm eserler) → `03-monitoring`

```
Web screen: "Monitoring" — the main signed-in page of TraceMyAssets. Same header, "Monitoring" active.

Top:
- heading "Monitoring", subtext "Your protected artworks and their scans."
- a slim summary strip with 4 inline facts separated by dividers: "5 artworks protected" · "4 on auto-scan" · "3 of 5 monthly scans left" · "3 Deep scan credits" with a small "Get more" link
- if anything needs attention, ONE banner above the grid: amber "2 new possible copies need your review" with primary pill "Review now"
Tabs: "Active 5" (selected) and "Archived 2".

Grid of artwork boxes (3 per row, 16px radius cards). Each box:
- image (4:3) with title "Sunset Study" below and grey "Protected · added 16 Oct"
- status chip row: "Auto-scan weekly" + "Next: Thu 23 Oct"
- last result line: "Last scan 2 days ago · 2 copies found → Review" (or "No copies found")
- action row: a pause/resume control "Pause auto-scan" (toggle-style button), and a secondary pill "Scan now"; under "Scan now" tiny cost text "Uses 1 of 3 monthly scans left"
- a "⋯" menu at the top right of the box: Change frequency, Deep scan (1 credit), Download protected copy, Download original, Archive, Delete
Show 5 boxes in different states: (1) auto weekly with 2 copies found, (2) auto monthly with no copies, (3) "Paused" grey with "Resume auto-scan" button, (4) "Scanning…" with a progress bar and the actions disabled, (5) a finished one suggesting "Nothing new in 3 months — archive it?" with a small "Archive" link.
An empty last tile with a dashed border: "+ Protect new artwork".
```

## 4. Eşleşmeler → `04-matches`

```
Web screen: "Matches" page of TraceMyAssets — the possible copies found by scans. Same header, "Matches" active with badge 2.

Heading "Matches", subtext "Possible copies of your work. Look at each one and tell us what it is."
Tabs: "To review 2" (selected), "Confirmed 1", "Dismissed 4". One filter dropdown on the right: "All artworks".

Each match is a wide card:
- left: your artwork and the found image side by side, same size (140px), arrow between
- middle: "Sunset Study", strength badge always visible ("Strong match · 94%" green / "Possible match · 81%" amber), chip "Watermark found" when true, source "etsy.com · shop listing" (on Free: lock icon "Website hidden on Free plan · Upgrade to see it"), grey "Found 16 Oct · also on 2 other pages"
- right: primary pill "Open"
Clicking "Open" shows (draw as a second frame) a right-side panel: large side-by-side comparison, a plain-language summary ("Very likely your work: the invisible watermark from your protected file was found in this image"), where it was found with "Open page ↗", a "What you can do" section with numbered steps and a "Copy message" button (note "Templates you send yourself — not legal advice"), and a sticky bottom with two big choices: "Yes, this is my work" (primary) and "Not a copy" (secondary).
No checkboxes, no ID numbers, no more than one primary button per card.
```

## 5. Resim kontrolü → `05-check`

```
Web screen: "Check an image" page. Same header.
Heading "Found a suspicious image?", subtext "Compare it with one of your artworks. The image you upload is only used for this check."
Left: "1. Pick your artwork" — grid of the user's artwork thumbnails, one selected with an iridescent ring.
Right: "2. Add the image you found" — dashed drop area, primary pill "Compare".
Result frame below: side-by-side images, "Strong match · 92%", "Watermark found — this image came from your protected file", and 3 plain-language check rows with check icons.
```

## 6. Hesap ve plan → `06-account`

```
Web screen: "Account" page. Same header. Left sub-navigation: "Plan & credits" (active), "Profile & security", "Your data".
"Plan & credits":
- plan card: "Free plan", usage bars "Artworks 3 of 3", "Monthly scans 2 of 5 used · resets 1 Nov", primary pill "Upgrade", link "Compare plans"
- credits card: big "3 Deep scan credits", and three pack cards "10 credits · $4.99", "25 credits · $9.99", "60 credits · $19.99" each with a "Buy" pill
- paid variation: "Pro · $12.99/month · renews 16 Nov", buttons "Manage subscription", "Change plan", note "Cancel anytime; your plan stays active until the end of the paid period."
"Profile & security" variation: email, "Change password", "Sign out of all devices". "Your data" variation: "Download my data", and a red-bordered danger area "Delete account".
```

## 7. Landing → `07-landing`

> Bu prompt doldurulmuş, olduğu gibi yapıştırabilirsin. Verilen kararlar:
> - Beta etiketi yok. Sitenin hiçbir yerinde "Coming soon" ya da "beta" ifadesi kullanılmayacak, çünkü ürün yarım işliyormuş gibi bir izlenim veriyor.
> - Kaynaklar: Google web araması (Standard scan) ve Google Lens (Deep scan). Etsy ve Amazon ilanları Google üzerinden bulunuyor; ayrı bir Etsy/Amazon entegrasyonu iddia edilmiyor.

```
Web screen: marketing landing page for TraceMyAssets using the project's glass design system: warm off-white canvas, floating frosted-glass header, huge IBM Plex Sans Light headlines, one idea per section, iridescent glass 3D images and real product screenshots in frosted frames.

Header: logo left; links "How it works", "Pricing", "Help"; right "Sign in" (text) and primary pill "Start free".
1. Hero (two columns): no badge or label above the headline; headline "Someone is using your art. Find out where." with "Find out where." on its own line; subtext "Add an invisible watermark to your artwork and let us keep scanning the web for copies. When we find one, we show you the proof — you decide what to do."; primary pill "Protect your first artwork — free", secondary pill "See how it works"; tiny "No credit card needed". Right: a rounded screenshot of the Monitoring page with artwork boxes and a "2 copies found" chip.
2. Sources strip (text and simple icons, no third-party logos): "Where we look" — three items, each with a simple icon (no status chips): "Web search — billions of indexed pages and images (Standard scan)", "Visual search — finds re-cropped and edited copies (Deep scan)", and "Marketplace listings — copies on shops such as Etsy and Amazon show up when their pages are indexed". Small grey note under the strip: "We search the public web, so we find copies wherever search engines can see them."
3. Wide feature band: a large iridescent glass image (glass magnifying glass over glass picture frames) on the left half; right half: heading "Stop copies before they spread.", text "Copies of artwork turn up on marketplaces, print shops and social media every day. TraceMyAssets finds them and gives you the evidence.", black pill "START FREE".
4. "How it works" — three big numbered steps with small product UI crops: "1. Upload and protect" (invisible watermark), "2. We keep watching" (weekly or monthly automatic scans), "3. Review the proof" (side-by-side comparison, watermark found).
5. Two alternating feature rows (text left, screenshot right, then reversed): "Every match is double-checked" — "Search results are only leads. We compare each one with your original before we show it." / "Proof you can use" — "See where it was found, how strong the match is, and whether your watermark is inside. Copy a ready-written message to send yourself."
6. Pricing teaser: three compact cards Free $0 / Pro $12.99 / Extra $29.99 with one line each and link "Compare plans".
7. Honest note band (soft grey): "Matches are technical signals, not legal proof. We never contact anyone for you."
8. FAQ accordion (5 questions) and a final frosted-glass band with a glass shield image, "Your art deserves to be watched." and a black pill "PROTECT YOUR FIRST ARTWORK".
Footer: About · Pricing · Help · Privacy · Terms · Refunds · Support.
Do not use the words "beta", "early access", "coming soon" or "on the way" anywhere on the page.
```

## 8. Fiyatlandırma → `08-pricing`

```
Web screen: "Pricing" page in the project's glass design system.
Heading "Simple plans for working artists", Monthly/Yearly pill switch ("Yearly — save about 23%").
Three plan cards, Pro highlighted "Most popular":
- Free $0 — Up to 3 artworks · 5 hand-started scans a month · Automatic weekly or monthly scans · 3 Deep scan credits once · See that a match exists and how strong it is (website hidden) — pill "Start free"
- Pro $12.99/mo or $120/yr — Up to 40 artworks · Automatic daily, weekly or monthly scans · 30 hand-started scans a month · 10 Deep scan credits every month · See exactly where each copy is · Step-by-step guide and ready-written messages — pill "Choose Pro"
- Extra $29.99/mo or $240/yr — Up to 100 artworks · Everything in Pro · 100 hand-started scans a month · 40 Deep scan credits every month — pill "Choose Extra"
"Need more Deep scans?" three pack cards (10 · $4.99, 25 · $9.99, 60 · $19.99 — one-time, never expire).
Comparison table, FAQ accordion, small print "Prices in US dollars; VAT added at checkout where it applies."
```

## 9. Giriş ve kayıt → `09-auth`

```
Web screen: "Create your account" page in the glass design system. Two columns: left a soft iridescent glass panel (a glass shield image) with the logo, the line "Your art, watched over." and a small product screenshot; right the form.
Form: heading "Create your account", full-width pill "Continue with Google" (Google logo), divider "or", Email, Password (with Show toggle, helper "At least 8 characters"), primary pill "Create account", note "No credit card needed", link "Already have an account? Sign in".
Second frame: "Sign in" with the same layout and a "Forgot password?" link.
After sign-up the user lands directly in step 1 of "Protect new artwork" (no second sign-in).
```
