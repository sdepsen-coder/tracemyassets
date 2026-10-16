# Arayüz incelemesi ve yeni yapı önerisi

16 Ekim 2026. Test ortamı: yerel frontend ve izole bir test backend'i (geçici SQLite veritabanı, sahte arama sağlayıcısı). Bir test hesabı açıldı, 2 eser yüklendi ve tarandı. İncelenen ekranlar: landing, kayıt/giriş, dashboard, eser kartı, eşleşmeler, check, account, pricing. Ekranlar masaüstü ve telefon genişliğinde (375 px) denendi.

> **Güncelleme (16 Ekim):** Yapı, senin anlattığın akışa göre değişti. Bölüm 2'deki "Overview" ve "Artworks" sayfaları kalktı; yerlerine iki şey geldi:
> - **Protect new artwork:** tek bir eserin adım adım yüklendiği, korunduğu ve tarandığı odaklı bir akış
> - **Monitoring:** tüm eserlerin kutular hâlinde durduğu ana sayfa (duraklat, devam ettir, şimdi tara ve maliyeti, arşivle, sil)
>
> Güncel ekran listesi `stitch-prompts.md` dosyasında. Bölüm 1'deki bulgular hâlâ geçerli.

---

## 1. Bulgular (önem sırasına göre)

### A. Her ekranı etkileyen sorunlar
1. **Kullanıcıya bir geliştirici notu görünüyor.** Üstteki koyu şeritte şu yazıyor: *"Asset uploads and counts use live account data. Monitoring and evidence panels are demo previews."* Ödeme alan bir üründe bu metin güven kaybettirir.
2. **İki ayrı başlık var.** Üstte koyu bir şerit (e-posta, plan, Sign out), altında beyaz bir üst menü (Upload, tema, zil, hesap avatarı). Hesap bilgileri iki yerde tekrar ediyor.
3. **Menüdeki sekmeler karışık.** "Home" landing'e gidiyor; "Dashboard" ile "My Artworks" ise aynı sayfanın farklı yerlerine kaydırıyor. Kullanıcı nerede olduğunu anlayamıyor.
4. **Telefonda menü kesiliyor.** "Matches" sekmesi "Matche" olarak görünüyor. Yüzen "Feedback" butonu kartların üstünü kapatıyor.
5. **Kayıt ve giriş ekranları farklı görünüyor.** Bu ekranlar koyu arka plan ve camgöbeği butonla geliyor, uygulamanın geri kalanı açık arka plan ve lacivert butonla. Ürün iki ayrı sitenin birleşimi gibi duruyor.
6. **Kayıttan sonra otomatik giriş yapılmıyor.** Hesap oluşturulunca kullanıcı giriş ekranına dönüyor, şifre alanı boşalmış oluyor ve şifresini tekrar yazması gerekiyor.

### B. Dashboard ve eserler
7. **Aynı ekranda üç ayrı "Upload artwork" butonu var** (üst menüde, hero alanında, eser listesinde), ayrıca sayfanın ortasında açık duran büyük bir yükleme formu.
8. **En önemli bilgi sayfanın en altında.** "2 new matches need your review" kutusu ancak tüm eserlerin altına inince görünüyor.
9. **Dört istatistik kartı yer kaplıyor ama bir şey söylemiyor.** Yeni kullanıcıda dördü de 0 gösteriyor ("Archived artworks" dahil).
10. **Tarama butonları gizli.** "Standard scan" ve "Deep scan" butonları "Manage monitoring" açılır menüsünün içinde; ilk bakışta bulunamıyor.
11. **İzlemeyi açmak iki adım istiyor.** Önce "Turn on", sonra ayrıca "Save" gerekiyor. "Alert threshold" alanında sadece "80" yazıyor, birimi (yüzde benzerlik) belli değil.
12. **Eser kartında dört buton aynı ağırlıkta** (Original, Protected copy, Archive, Delete). Ana eylem öne çıkmıyor; tehlikeli "Delete" butonu da diğerleriyle yan yana duruyor.

### C. Eşleşmeler
13. **"Review" butonu yanıltıcı.** Tıklayınca bir inceleme ekranı açılmıyor; sadece durum "Reviewing" oluyor ve buton "Mark reviewed" adını alıyor. Üstteki "Needs review 2" sayacı da değişmiyor.
14. **Kontroller çok fazla.** 5 sekme, bir güç filtresi, bir onay kutusu ve "Select all" aynı anda görünüyor.
15. **Eşleşme gücü varsayılan olarak gizli.** Ürünün en önemli bilgisi, kullanıcı "Show match strength on cards" kutusunu işaretlemeden görünmüyor.
16. **Her kartta sekiz buton var.** Dört durum butonu (Review, Ignore, Archive, Delete) ve dört geri bildirim butonu (Useful, Irrelevant, Unrelated, Different). Ignore, Archive ve Delete'in farkı belli değil; geri bildirim seçeneklerinin anlamları da birbirine çok yakın.
17. **"Found online" kutusunda bulunan görsel yok**, sadece bir dünya ikonu var. Kullanıcı iki resmi yan yana karşılaştıramıyor.
18. **"Match ID #4" gibi iç numaralar kullanıcıya gösteriliyor.**

### D. Hesap, check ve fiyatlandırma
19. **Account sayfasında plan ve fatura bölümü yok** (Free kullanıcıda). Sayfada sadece "Download my data" ve "Delete account" var: plan, kalan krediler, yükseltme, şifre değiştirme görünmüyor. Backend'de `/billing/portal` endpoint'i var ama ücretli kullanıcının bu sayfada ne gördüğünü ödeme testinde ayrıca kontrol edeceğim.
20. **Check sayfası ve "Back to dashboard" bağlantısı** ana menüden kopuk, ayrı bir sayfa gibi duruyor. Burada büyük bir sorun yok, sadece yeni stile geçmesi yeterli.
21. **Landing ve pricing'de çelişkili metinler var:**
    - "Private beta · free while we learn" ve "Paid plans are not open yet" yazıyor, oysa ödemeli çıkışa hazırlanıyoruz.
    - "Coming soon" altında e-posta uyarıları ve mektup şablonları duruyor; ikisi de zaten yapılmış. Gerçekten henüz olmayan tek şey kanıt paketi (PDF).
    - Amazon ve Etsy "Coming to the beta" olarak geçiyor. Sağlayıcılar kodda var; canlıda açık olup olmadıklarını senin söylemen gerekiyor.

### E. Sadece yerelde görülen sorun
22. Yerel dev ortamında ikon fontu yüklenmiyor; ikonların yerinde "shield", "arrow_forward" gibi metinler görünüyor. Canlı sitede ikonlar düzgün. Yeniden tasarımda ikonları fonta bağlı olmayan SVG'ler olarak koymayı öneriyorum; böylece bu sorun tamamen ortadan kalkar.

---

## 2. Önerilen yeni yapı

### Sayfalar
| Ziyaretçi (giriş yapmamış) | Giriş yapmış kullanıcı |
|---|---|
| `/` Landing | `/` Overview (kısa özet) |
| `/pricing` | `/artworks` Eserler (yeni, ayrı sayfa) |
| `/help`, `/about`, yasal sayfalar | `/matches` Eşleşmeler |
| Giriş / kayıt (uygulamayla aynı stilde) | `/check` Resim kontrolü |
| | `/account` Hesap: profil, plan ve fatura, veri |

### Tek bir üst menü (koyu şerit kalkıyor)
- **Solda:** Logo. Giriş yapmış kullanıcıda Overview'a, ziyaretçide landing'e gider.
- **Ortada:** Overview · Artworks · Matches (bekleyen eşleşme sayısıyla) · Check an image
- **Sağda:** "Upload artwork" (tek ana buton) · bildirim zili · hesap menüsü. Hesap menüsünde e-posta, plan, kalan krediler, Account, Help, tema seçimi ve Sign out bulunur.
- **Telefonda:** Menü sekmeleri hamburger menüye ya da alt sekme çubuğuna taşınır. Feedback butonu hesap menüsüne geçer.

### Overview (her ekranın tek bir ana eylemi var)
- **Yeni kullanıcı:** 3 adımlı bir başlangıç listesi (eser yükle → izlemeyi aç → ilk taramayı yap), ilerledikçe adımlar işaretlenir. Bu ekranda istatistik kartı yok.
- **Mevcut kullanıcı:** En üstte "X eşleşme inceleme bekliyor" ve "İncele" butonu. Altında son tarama hareketleri ve plan kullanımı ("bu ay 3/5 tarama kaldı · 3 kredi").

### Artworks
- Eserler kart ızgarasında gösterilir. Her kartta resim, başlık ve bir durum etiketi ("Haftalık izleniyor" ya da "İzleme kapalı") bulunur.
- Tek ana buton **"Scan now"**. Deep scan bu butonun yanındaki küçük bir seçenek olur.
- İkincil eylemler (Original, Protected copy, Archive, Delete) "⋯" menüsüne taşınır. Delete her zaman onay ister.
- İzleme ayarları yan panelde açılır: tek bir aç/kapa anahtarı (otomatik kaydeder), sıklık, ve "%80 benzerlikte uyar" gibi açık bir eşik ayarı.
- Yükleme sayfada açık duran bir form olmaktan çıkar; üst menüdeki butondan açılan bir pencere olur. "İzlemeyi başlat" seçeneği varsayılan olarak açık gelir.

### Matches
- Sekmeler üçe iner: **İncelenecek · Onaylanan · Elenen** ("Ignored" ve "Archived" tek sekmede birleşir).
- Eşleşme gücü her kartta her zaman görünür (etiket ya da çubuk olarak). Filtre "Sadece filigranı doğrulananlar" seçeneğine sadeleşir.
- **Kart:** solda kullanıcının eseri, sağda bulunan görsel, büyük ve yan yana. Altında güç bilgisi, kaynak (Free planda kilitli ve "Kaynağı görmek için yükselt" bağlantısıyla) ve tarih. Tek ana buton: **"Aç"**.
- **Detay paneli (karta tıklayınca açılır):**
  - karşılaştırma ve sinyaller (pHash, filigran, ORB, sade bir dille)
  - "aynı resim N sayfada daha bulundu" bilgisi
  - sonraki adımlar ve kopyalanabilir mektuplar
  - iki karar butonu: **"Evet, bu benim eserim"** ve **"Kopya değil"**. İkincisi tek bir kısa geri bildirim sorusuyla birleşir.
  - Silme ve arşivleme "⋯" menüsüne taşınır. İç numaralar (Match ID) gösterilmez.

### Account
Sayfa üç bölüme ayrılır:
1. **Profil ve güvenlik:** e-posta, şifre değiştirme, tüm cihazlardan çıkış
2. **Plan ve fatura:** mevcut plan, kalan krediler, "Yükselt" ya da "Aboneliği yönet" (Paddle portalı), kredi paketi satın alma
3. **Verilerin:** veriyi indir, hesabı sil

### Landing ve fiyatlandırma
- Yapı korunur, metinler güncellenir: beta ve ödeme ifadeleri çıkış durumuna göre düzeltilir, "Coming soon" listesinde sadece kanıt paketi kalır, kaynaklar listesi gerçek duruma göre yazılır.
- Kayıt ve giriş ekranları bu sayfalarla aynı açık/koyu temayı kullanır. Google ile giriş butonu en üstte durur.

### İsim değişiklikleri
| Şu an | Öneri |
|---|---|
| Home / Dashboard / My Artworks | Overview / Artworks (landing'e logo ve footer'dan gidilir) |
| Review → Mark reviewed | Aç (detay paneli) ve karar butonları |
| Ignore / Archive | Elenen (tek durum) |
| Alert threshold "80" | "%80 ve üzeri benzerlikte uyar" |
| Standard scan / Deep scan | Scan now / Deep scan (1 kredi) |
| Useful / Irrelevant / Unrelated / Different | "Kopya değil" seçildiğinde tek bir soru: "Neden?" |

---

## 3. Senden gereken kararlar
1. Bu yapıyı onaylıyor musun, değiştirmek istediğin bir yer var mı?
2. Amazon ve Etsy kaynakları canlıda açık mı?
3. Çıkışta "beta" ifadesi tamamen kalkacak mı, yoksa "Erken erişim" gibi bir etiket kalsın mı?

Onaylarsan bir sonraki adımda ortak tasarım dili prompt'unu ve her ekran için ayrı Stitch prompt'larını bu klasöre (`design/stitch-prompts.md`) yazacağım.
