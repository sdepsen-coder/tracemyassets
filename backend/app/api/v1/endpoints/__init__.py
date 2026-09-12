```python
class Kullanici:
    def __init__(self, ad, soyad, yas):
        self.ad = ad  # First name of the user
        self.soyad = soyad  # Last name of the user
        self.yas = yas  # Age of the user

    def tam_ad(self):
        return f"{self.ad} {self.soyad}"  # Returns the full name of the user

    def yas_kontrol(self):
        if self.yas >= 18:
            return "Kullanıcı reşit."  # User is an adult.
        else:
            return "Kullanıcı reşit değil."  # User is not an adult.

def kullanici_bilgisi_goster(kullanici):
    print(f"Ad: {kullanici.ad}")  # First name
    print(f"Soyad: {kullanici.soyad}")  # Last name
    print(f"Yaş: {kullanici.yas}")  # Age
    print(f"Tam Ad: {kullanici.tam_ad()}")  # Full name
    print(kullanici.yas_kontrol())  # Age check

# Example usage
kullanici1 = Kullanici("Ahmet", "Yılmaz", 20)
kullanici_bilgisi_goster(kullanici1)
```