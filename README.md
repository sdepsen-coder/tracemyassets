# TraceMyAssets

Dijital eserlerin kaydedilmesi, görünmez filigranla işaretlenmesi ve olası
çevrimiçi kullanımlarının incelenmesi için geliştirilen MVP.

> Eserlerinizin olası çevrimiçi kullanımlarını bulun.
> Eşleşmeleri inceleyin, bulguları alın ve nasıl ilerleyeceğinize siz karar verin.

## Projenin yaklaşımı

TraceMyAssets’in amacı teknik bulguları sunmaktır; hak sahipliği veya
telif ihlali hakkında otomatik hukuki karar vermek değildir.

- Görsel benzerliği, izinsiz kullanım olasılığı anlamına gelmez.
- Watermark doğrulaması, görseli bir asset kaydıyla ilişkilendirmeye yardımcı olur.
- İzin ve lisans durumunu kullanıcı değerlendirir.
- Kullanıcının açık onayı olmadan uyarı veya kaldırma bildirimi gönderilmez.

## Geliştirme durumu

Proje aktif geliştirme aşamasındadır; üretime hazır olduğu varsayılmamalıdır.
Aşağıdaki özellikler geliştirme ortamındaki durumu açıklar.

### Uygulanmış temel özellikler

- Kullanıcı kimlik doğrulama ve tarayıcı oturumu.
- PNG, JPEG ve WEBP yükleme.
- 25 MiB dosya boyutu sınırı.
- Asset listeleme ve istatistikler.
- Thumbnail oluşturma ve görüntüleme.
- pHash görsel parmak izi oluşturma.
- Uygun görsellerde görünmez watermark üretimi.
- Watermark üretimi sırasında kalite ve geri okuma kontrolü.
- Yetki kontrollü orijinal dosya ve korumalı PNG indirme endpoint’leri.

### Entegrasyon ve doğrulama aşamasında

- Frontend korumalı dosya indirme akışının uçtan uca testi.
- Diske kaydedilmiş ve yeniden indirilmiş dosyada watermark doğrulaması.
- Farklı görsellerde kapasite ve kalite testleri.

### Planlanan özellikler

- Metadata içinde yardımcı asset referansı.
- “Filigranı doğrula ve göster” arayüzü.
- Çevrimiçi görsel arama ve aday keşfi.
- Celery tabanlı tarama görevleri.
- Aday görsellerin pHash ve watermark ile incelenmesi.
- Kullanıcı kontrollü eşleşme değerlendirmesi.
- Teknik bulgu ve kanıt raporları.
- Uyarı ve kaldırma bildirimi taslakları.
- Ürün maketi ve bölgesel görsel eşleştirme araştırmaları.

## Görünmez watermark nasıl çalışır?

Mevcut deneysel format, tamamen opak 8×8 görüntü bloklarının DCT
katsayılarına doğrulanabilir bir payload gömer.

Payload şunları içerir:

- Asset ID
- Kullanıcı ID’si
- Timestamp
- Nonce

Payload doğrulamasında HMAC kullanılır. Korumalı çıktı PNG olarak kaydedilir.

Bu işlem görselin üzerine görünür bir logo veya yazı yerleştirmez.
Görsel kalitesini korumak için kalite kontrolleri uygulanır; işlem
piksel düzeyinde değişiklik yapar.

### Sınırlar

- Küçük veya şeffaf görsellerde yeterli uygun blok bulunmayabilir.
- Kapasite yetersizliği desteklenen bir doğrulama hatasıdır.
- Ekran görüntüsü, kırpma, yeniden boyutlandırma, döndürme ve kayıplı
  sıkıştırma sonrası dayanıklılık henüz kanıtlanmış değildir.
- Watermark’ın okunamaması, görselin kayıtlı eserle ilişkisiz olduğunu
  tek başına göstermez.
- Watermark doğrulaması tek başına hak sahipliği veya telif ihlali kanıtı değildir.
- Payload timestamp’i bağımsız bir zaman damgası değildir.
- HMAC, herkese açık biçimde doğrulanabilen bir dijital imza değildir.

## Görsel benzerliği

pHash, görüntünün yapısal benzerliğini değerlendirmek için kullanılır.

Uyumlu pHash değerleri için temel skor:

```text
Benzerlik skoru = 100 × (1 − Hamming mesafesi / hash bit uzunluğu)
```

Örneğin “%83 görsel benzerliği”:

- %83 telif ihlali olasılığı anlamına gelmez.
- Görsel alanının %83’ünün aynı olduğunu ifade etmez.
- Kullanılan algoritmanın ürettiği bir benzerlik skorudur.

Watermark doğrulaması ve benzerlik skoru ayrı sonuçlardır.
Watermark doğrulanması, benzerlik skorunu otomatik olarak %100 yapmaz.

## Teknoloji

### Mevcut uygulama bileşenleri

- Python ve FastAPI
- SQLAlchemy
- Pillow, ImageHash, NumPy ve SciPy
- Next.js, React ve TypeScript
- Tailwind CSS

### Hedef mimarinin ek bileşenleri

- PostgreSQL
- Görsel embedding çalışmaları için pgvector
- Celery ve Redis
- Görsel arama servisi adaptörleri

Hedef mimaride listelenmesi, ilgili entegrasyonun tamamlandığı anlamına gelmez.

## Proje yapısı

```text
backend/
  app/
    api/v1/endpoints/
    crud/
    models/
    schemas/
    services/
  tests/
  requirements.txt
  .env.example

frontend/
  src/
    components/
    lib/
```

## Yerel geliştirme — Windows

Aşağıdaki komutlar bağımlılıkları ve ortam ayarları daha önce hazırlanmış
bir geliştirme ortamı içindir; sıfırdan kurulum rehberi değildir.

Backend ve frontend’i iki ayrı terminalde çalıştırın.

### Backend

Proje ana klasöründen:

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level debug
```

Adresler:

- API: http://127.0.0.1:8000
- Swagger: http://127.0.0.1:8000/docs

Bu komutta otomatik yeniden yükleme kapalıdır.
Backend kodu değiştiğinde mevcut işlemi durdurup yeniden başlatın.
Aynı portta ikinci bir backend başlatmayın.

### Frontend

Proje ana klasöründen, ayrı terminalde:

```powershell
cd frontend
npm.cmd run dev
```

Varsayılan adres:

- http://localhost:3000

Terminal farklı port gösterirse o adresi kullanın.

### Ortam ayarları

- Gerekli ayarlar için `backend/.env.example` dosyasını inceleyin.
- Gerçek değerleri yerel `.env` dosyasında tutun.
- `.env`, secret, token veya kullanıcı dosyalarını Git’e eklemeyin.
- Watermark secret’ı backend tarafında tutulmalıdır.
- Mevcut dosyaları doğrulamak için kullanılan anahtarı koruyun.
  Anahtarı değiştirmek eski watermark’ların yeni anahtarla
  doğrulanmasını engelleyebilir.

## Asset API

| Metot | Yol | İşlev |
|---|---|---|
| GET | `/api/v1/assets/stats` | Asset istatistikleri |
| GET | `/api/v1/assets` | Kullanıcının asset listesi |
| POST | `/api/v1/assets` | Görsel yükleme |
| GET | `/api/v1/assets/{asset_id}` | Asset detayı |
| GET | `/api/v1/assets/{asset_id}/thumbnail` | Thumbnail |
| GET | `/api/v1/assets/{asset_id}/download` | Orijinal dosya |
| GET | `/api/v1/assets/{asset_id}/download-watermarked` | Korumalı PNG |

Bu endpoint’ler kimlik doğrulama gerektirir.
Tekil asset işlemlerinde kullanıcı sahipliği kontrol edilir.

## Güvenlik ve gizlilik

- Secret’ları istemciye veya dosya metadata’sına koymayın.
- Yetkilendirme olmadan kullanıcı dosyalarını sunmayın.
- Metadata’yı güvenilir kanıt olarak kabul etmeyin.
- İndirilen aday görselleri ve metadata’yı güvenilmeyen veri olarak işleyin.
- Hukuki bildirimleri kullanıcı incelemesi ve açık onayı olmadan göndermeyin.

## Ürün ilkesi

**TraceMyAssets bulur, ölçer, doğrular ve belgeler.
Kararı kullanıcı verir.**