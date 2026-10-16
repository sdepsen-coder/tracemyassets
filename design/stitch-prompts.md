# Stitch prompt'ları (sürüm 2)

Bu sürüm senin anlattığın akışa göre yazıldı:
- Kullanıcı bir eser yüklediğinde **sadece o eser** ekranda olur. Ekran onu adım adım yönlendirir: yükle → koru → taramayı seç → tara → sonucu gör.
- Tarama bitince eser **Monitoring** sayfasına geçer. Bu sayfada tüm eserler kutular hâlinde durur. Her kutuda şunlar görünür: otomatik tarama sıklığı, bir sonraki tarama, son sonuç, durdurma ve devam ettirme, "şimdi tara" ve bunun neye mal olacağı.
- İşi biten eserler arşive alınır ya da silinir.
- Kullanıcı hiçbir şeyi aramaz. Her ekranda "sıradaki adım" tek ve belirgin bir butondur.
- Görsel tarz sellingpilot.com'dan esinlenildi: beyaz zemin, büyük ve kalın başlıklar, yuvarlak (hap biçimli) butonlar, her bölümde tek mesaj, bol boşluk.

## Kullanım
1. https://stitch.withgoogle.com adresini aç ve **Web** modunu seç.
2. İlk ekranda "0. Tasarım dili" ve "1. Yükleme akışı" bloklarını birlikte yapıştır. Sonraki ekranların başına şu cümleyi ekle: *"Same design system, header and components as the previous screens."*
3. Landing için (7. ekran) gönderdiğin hırsız görselini Stitch'e referans resim olarak yükle. Dosya projede şurada duruyor: `design/images/hero-thief-stop.webp`
4. Her ekranı bitirdiğinde **Code** olarak dışa aktar ve ekran görüntüsünü indir. İkisini şöyle bir klasöre koy: `design/stitch/<numara-ad>/code.html` ve `screen.png`
5. Göndereceğin sıra: **1 → 2 → 3 → 4 → 7 → 5, 6, 8, 9.** İlk ekran gelir gelmez koda uygulamaya başlarım.

**Kredi ve tarama kuralları.** Ekranlarda bu kuralların doğru yazılması önemli; prompt'lar bunlara göre hazırlandı:
- Elle başlatılan Standard scan, aylık hakkından düşer (Free planda ayda 5).
- Otomatik (zamanlanmış) taramalar plana dahildir ve hiçbir haktan düşmez.
- Deep scan 1 kredi harcar.

---

## 0. Tasarım dili

```
Design system for "TraceMyAssets", a web app that protects artists' work: it adds an invisible watermark to an artwork and keeps scanning the web for copies. Users are independent artists, not technical people. The product must guide them: every screen has ONE obvious next step, nothing to search for.

Visual style: clean, bright and confident, like sellingpilot.com — white backgrounds, very large bold headings, lots of whitespace, one message per section, rounded pill buttons, real product UI shown as rounded screenshots with soft shadows.

Colors: background #FFFFFF, soft section background #F5F7FB, borders #E6E8F0, text #0F172A, secondary text #5B6475.
Primary #1D4ED8 (pill buttons, links, active states), primary hover #1E40AF, primary soft #E8EEFF.
Status: success #0E9F6E on #E7F8F1, warning #B45309 on #FEF3E2, danger #DC2626 on #FDECEC, paused grey #6B7280 on #F1F2F5.
Dark band color for dramatic sections: #0B0F19.

Typography: headings "Poppins" 700 (hero 56px, section 40px, card titles 18px 600), body "Inter" 15-16px, numbers tabular.
Shape: pill buttons (fully rounded, 44px tall, 600 weight), cards 16px radius with 1px border and no shadow, floating elements (menus, dialogs) with soft shadow.
Icons: thin outline icons (Lucide style), always next to a text label on buttons.
Cost labels: any action that uses up something shows it right under or inside the button in small text, e.g. "Uses 1 of your 5 monthly scans" or "Uses 1 Deep scan credit · 3 left".
Status chips: small pills, e.g. "Auto-scan weekly" (green), "Paused" (grey), "Scanning…" (blue with spinner), "2 copies found" (amber), "No copies found" (green).
App header (signed in): white, 64px, logo left ("TraceMyAssets" with a small shield icon); nav center: "Monitoring", "Matches" (with count badge), "Check an image"; right: primary pill "+ Protect new artwork", bell, avatar menu. Only one header bar.
All UI text in English.

Imagery rules:
- Marketing pages (landing, pricing, sign-in): add visuals where they help — rounded product screenshots of the app, and a few illustrations for empty or explanatory spots. Illustration style: clean, modern, slightly dimensional (3D-ish), cool palette that matches the colors above, about art, artists, shields and searching. One dramatic photographic image is allowed only in the landing's dark band.
- App screens (protect flow, monitoring, matches, account, check): no decorative images. Show only artwork thumbnails and, in empty states or success/"nothing found" moments, one small friendly illustration.
- Never use stock photos of people, fake customer logos, fake testimonials or fake statistics.
```

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
Left: "1. Pick your artwork" — grid of the user's artwork thumbnails, one selected with a blue ring.
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

## 7. Landing (sellingpilot tarzı) → `07-landing`

> Bu prompt doldurulmuş, olduğu gibi yapıştırabilirsin. Verilen kararlar:
> - Beta etiketi yok. Sitenin hiçbir yerinde "Coming soon" ya da "beta" ifadesi kullanılmayacak, çünkü ürün yarım işliyormuş gibi bir izlenim veriyor.
> - Kaynaklar: Google web araması (Standard scan) ve Google Lens (Deep scan). Etsy ve Amazon ilanları Google üzerinden bulunuyor; ayrı bir Etsy/Amazon entegrasyonu iddia edilmiyor.

```
Web screen: marketing landing page for TraceMyAssets in the style of sellingpilot.com: white, very large bold Poppins headings, pill buttons, generous whitespace, one idea per section, real product screenshots in rounded frames with soft shadows.

Header: logo left; links "How it works", "Pricing", "Help"; right "Sign in" (text) and primary pill "Start free".
1. Hero (two columns): no badge or label above the headline; headline "Someone is using your art. Find out where." with "Find out where." in primary blue; subtext "Add an invisible watermark to your artwork and let us keep scanning the web for copies. When we find one, we show you the proof — you decide what to do."; primary pill "Protect your first artwork — free", secondary pill "See how it works"; tiny "No credit card needed". Right: a rounded screenshot of the Monitoring page with artwork boxes and a "2 copies found" chip.
2. Sources strip (text and simple icons, no third-party logos): "Where we look" — three items, each with a simple icon (no status chips): "Web search — billions of indexed pages and images (Standard scan)", "Visual search — finds re-cropped and edited copies (Deep scan)", and "Marketplace listings — copies on shops such as Etsy and Amazon show up when their pages are indexed". Small grey note under the strip: "We search the public web, so we find copies wherever search engines can see them."
3. Dramatic dark band (#0B0F19), full width: use the uploaded reference image (a hand stopping a thief carrying a laptop with a copyright symbol, a house model and a camera) on the left half; right half white text: heading "Stop copies before they spread.", text "Copies of artwork turn up on marketplaces, print shops and social media every day. TraceMyAssets finds them and gives you the evidence.", pill "Start free".
4. "How it works" — three big numbered steps with small product UI crops: "1. Upload and protect" (invisible watermark), "2. We keep watching" (weekly or monthly automatic scans), "3. Review the proof" (side-by-side comparison, watermark found).
5. Two alternating feature rows (text left, screenshot right, then reversed): "Every match is double-checked" — "Search results are only leads. We compare each one with your original before we show it." / "Proof you can use" — "See where it was found, how strong the match is, and whether your watermark is inside. Copy a ready-written message to send yourself."
6. Pricing teaser: three compact cards Free $0 / Pro $12.99 / Extra $29.99 with one line each and link "Compare plans".
7. Honest note band (soft grey): "Matches are technical signals, not legal proof. We never contact anyone for you."
8. FAQ accordion (5 questions) and a final blue band "Your art deserves to be watched." with pill "Protect your first artwork".
Footer: About · Pricing · Help · Privacy · Terms · Refunds · Support.
Do not use the words "beta", "early access", "coming soon" or "on the way" anywhere on the page.
```

## 8. Fiyatlandırma → `08-pricing`

```
Web screen: "Pricing" page in the same sellingpilot-like style.
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
Web screen: "Create your account" page, white, same style. Two columns: left a soft blue panel with the logo, the line "Your art, watched over." and a small product screenshot; right the form.
Form: heading "Create your account", full-width pill "Continue with Google" (Google logo), divider "or", Email, Password (with Show toggle, helper "At least 8 characters"), primary pill "Create account", note "No credit card needed", link "Already have an account? Sign in".
Second frame: "Sign in" with the same layout and a "Forgot password?" link.
After sign-up the user lands directly in step 1 of "Protect new artwork" (no second sign-in).
```
