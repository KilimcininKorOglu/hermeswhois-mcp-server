# HermesWhois Skill

Bu dosya, HermesWhois MCP Server'ın tool'larını TypeScript API olarak tanımlar.
Claude Code veya diğer AI agent'lar bu API tanımını kullanarak doğrudan kod yazabilir.

## Hızlı Kullanım (CLI)

```bash
node scripts/hermeswhois-api.js whois google.com
node scripts/hermeswhois-api.js ssl github.com
node scripts/hermeswhois-api.js both cloudflare.com
```

## API Tanımı

```typescript
/**
 * HermesWhois API - Domain WHOIS ve SSL sertifika sorguları
 * 
 * Bu API, hermeswhois.tr servisi üzerinden domain bilgilerini sorgular.
 * Tüm fonksiyonlar async/await ile çalışır.
 */

interface WhoisResult {
  domain: string;
  creationDate?: string;
  expiryDate?: string;
  updatedDate?: string;
  registrar?: string;
  registrarUrl?: string;
  nameServers?: string;
  dnssec?: string;
  status?: string;
  cached: boolean;
  rawWhois?: string;
}

interface SSLResult {
  domain: string;
  sslDomain?: string;
  validFrom?: string;
  validTo?: string;
  daysUntilExpiry: number;
  expired: boolean;
  issuer?: string;
  issuerOrganization?: string;
  serialNumber?: string;
  hash?: string;
  version?: number;
  altNames?: string[];
  cached: boolean;
}

declare const hermeswhois: {
  /**
   * Domain WHOIS bilgilerini sorgular.
   * 
   * @param domain - Sorgulanacak domain (örn: "example.com" veya "https://example.com")
   * @returns WHOIS bilgileri veya hata mesajı
   * 
   * @example
   * const result = await hermeswhois.whois_lookup("google.com");
   * console.log(`Domain: ${result.domain}`);
   * console.log(`Expires: ${result.expiryDate}`);
   * console.log(`Registrar: ${result.registrar}`);
   */
  whois_lookup: (domain: string) => Promise<WhoisResult>;

  /**
   * Domain SSL sertifika bilgilerini sorgular.
   * 
   * @param domain - SSL sertifikası kontrol edilecek domain
   * @returns SSL sertifika bilgileri veya hata mesajı
   * 
   * @example
   * const result = await hermeswhois.ssl_lookup("github.com");
   * console.log(`SSL Domain: ${result.sslDomain}`);
   * console.log(`Valid To: ${result.validTo}`);
   * console.log(`Days Until Expiry: ${result.daysUntilExpiry}`);
   * if (result.expired) {
   *   console.log("⚠️ SSL sertifikası süresi dolmuş!");
   * }
   */
  ssl_lookup: (domain: string) => Promise<SSLResult>;
};
```

## Kullanım Örnekleri

### Tek Domain WHOIS Sorgusu
```typescript
const whois = await hermeswhois.whois_lookup("example.com");
console.log(`Domain ${whois.domain} registrar: ${whois.registrar}`);
```

### Birden Fazla Domain SSL Kontrolü
```typescript
const domains = ["google.com", "github.com", "cloudflare.com"];
for (const domain of domains) {
  const ssl = await hermeswhois.ssl_lookup(domain);
  if (ssl.daysUntilExpiry < 30) {
    console.log(`⚠️ ${domain}: ${ssl.daysUntilExpiry} gün kaldı!`);
  }
}
```

### WHOIS ve SSL Birlikte
```typescript
const domain = "example.com";
const [whois, ssl] = await Promise.all([
  hermeswhois.whois_lookup(domain),
  hermeswhois.ssl_lookup(domain)
]);

console.log(`Domain: ${whois.domain}`);
console.log(`Registrar: ${whois.registrar}`);
console.log(`Domain Expires: ${whois.expiryDate}`);
console.log(`SSL Expires: ${ssl.validTo} (${ssl.daysUntilExpiry} gün)`);
```

## API Endpoints

| API | Endpoint | Cache |
|-----|----------|-------|
| WHOIS | `https://hermeswhois.tr/whois.php` | 12 saat |
| SSL | `https://hermeswhois.tr/ssl.php` | 1 saat |

## Önemli Notlar

1. **URL Temizleme**: `https://example.com/path` formatı kabul edilir, otomatik olarak `example.com` çıkarılır.
2. **Kayıtlı Olmayan Domain**: Eğer domain kayıtlı değilse hata döner.
3. **Cache**: Sonuçlar cache'lenir (WHOIS: 12 saat, SSL: 1 saat).
4. **API Limiti**: Rate limiting yoktur ancak makul kullanım önerilir.
