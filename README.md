# HermesWhois MCP Server

Model Context Protocol (MCP) sunucusu - HermesWhois servisi üzerinden domain WHOIS ve SSL sertifika bilgilerini sorgulama aracı.

## Genel Bakış

Bu MCP sunucusu, Claude Desktop ve diğer MCP uyumlu uygulamalar için HermesWhois API'sine erişim sağlar. İki temel işlev sunar:

1. **WHOIS Sorgulama**: Domain kayıt bilgileri, registrar detayları ve DNS yapılandırması
2. **SSL Sertifika Analizi**: Sertifika geçerliliği, issuer bilgileri ve alternative names

## Teknik Özellikler

### WHOIS Sorgulama Yetenekleri
- Domain kayıt tarihi ve bitiş tarihi bilgileri
- Registrar ve kayıt URL'si
- Name server (DNS) konfigürasyonu
- DNSSEC durumu
- Domain statüsü ve transfer bilgileri
- Ham WHOIS verisi
- 12 saatlik cache mekanizması

### SSL Sertifika Sorgulama Yetenekleri
- Sertifika geçerlilik tarihleri
- Kalan süre hesaplama
- Issuer (Certificate Authority) bilgileri
- Sertifika serial number ve hash değerleri
- Subject Alternative Names (SAN) listesi
- Sertifika versiyonu
- 1 saatlik cache mekanizması

## Kurulum

### Gereksinimler
- Node.js 16.x veya üzeri
- npm veya yarn

### Kurulum Adımları

```bash
# Bağımlılıkları yükleyin
npm install

# TypeScript kodunu derleyin
npm run build
```

## Yapılandırma

### Claude Desktop Entegrasyonu

Claude Desktop konfigürasyon dosyanızı (`claude_desktop_config.json`) düzenleyin:

#### Windows

```json
{
  "mcpServers": {
    "hermeswhois": {
      "command": "node",
      "args": ["C:\\path\\to\\hermeswhois-mcp-server\\build\\index.js"]
    }
  }
}
```

#### macOS / Linux

```json
{
  "mcpServers": {
    "hermeswhois": {
      "command": "node",
      "args": ["/path/to/hermeswhois-mcp-server/build/index.js"]
    }
  }
}
```

### Geliştirme Ortamı

```bash
# Watch mode - otomatik derleme
npm run watch

# Development mode - ts-node ile çalıştırma
npm run dev
```

## MCP Tools Referansı

### whois_lookup

Domain için WHOIS bilgilerini sorgular ve detaylı kayıt bilgilerini döndürür.

#### Parametreler

| Parametre | Tip    | Zorunlu | Açıklama                                      |
|-----------|--------|---------|-----------------------------------------------|
| domain    | string | Evet    | Sorgulanacak domain adı (URL formatında da olabilir) |

#### Kullanım Örneği

```
Query: Can you look up whois information for example.com?
```

#### Örnek Yanıt

```
=== HermesWhois Domain Lookup ===

Domain: example.com
Created: 1995-08-14
Expires: 2024-08-13
Updated: 2023-08-14
Status: clientDeleteProhibited clientTransferProhibited
Registrar: MarkMonitor Inc.
Registrar URL: http://www.markmonitor.com
Name Servers: a.iana-servers.net, b.iana-servers.net
DNSSEC: unsigned

Cache Status: true

=== Raw Whois Data ===
[Detaylı WHOIS verisi...]
```

### ssl_lookup

Domain için SSL sertifika bilgilerini sorgular ve geçerlilik detaylarını döndürür.

#### Parametreler

| Parametre | Tip    | Zorunlu | Açıklama                                      |
|-----------|--------|---------|-----------------------------------------------|
| domain    | string | Evet    | SSL sertifikası kontrol edilecek domain adı |

#### Kullanım Örneği

```
Query: Check the SSL certificate for example.com
```

#### Örnek Yanıt

```
=== SSL Certificate Information ===

Domain: example.com
SSL Domain (CN): *.example.com
Valid From: 2024-01-15 10:30:00
Valid To: 2025-01-15 10:30:00
Days Until Expiry: 245 days

Issuer: Let's Encrypt Authority X3
Issuer Organization: Let's Encrypt

Serial Number: 03A1B2C3D4E5F6789012345678901234
Hash: a1b2c3d4
Version: 2

=== Subject Alternative Names ===
DNS:*.example.com
DNS:example.com
DNS:www.example.com

Cache Status: false
```

## API Dokümantasyonu

### WHOIS API

**Endpoint**: `https://hermeswhois.tr/whois.php`

**HTTP Method**: POST, GET

**Request Format**:
```
Content-Type: application/x-www-form-urlencoded
Body: domain=<domain_name>
```

**Response Format**: JSON

**Cache Duration**: 12 saat

**Response Schema**:
```typescript
{
  main: {
    domain: string,
    CreationDate: string,
    ExpiryDate: string,
    UpdatedDate: string,
    SponsoringRegistrar: string,
    RegistrarURL: string,
    DomainStatus: string,
    DNS: string,
    DNSSEC: string,
    // ... diğer alanlar
  },
  result: string,
  whois: string,
  cache: string
}
```

### SSL API

**Endpoint**: `https://hermeswhois.tr/ssl.php`

**HTTP Method**: POST, GET

**Request Format**:
```
Content-Type: application/x-www-form-urlencoded
Body: domain=<domain_name>
```

**Response Format**: JSON

**Cache Duration**: 1 saat

**Response Schema**:
```typescript
{
  main: {
    domain: string,
    ssl_domain: string,
    issuer: string,
    issuer_organization: string,
    valid_from_timestamp: number,
    valid_to_timestamp: number,
    serial_number: string,
    hash: string,
    version: number,
    alt_names: string,
    valid_from_date: string,
    valid_to_date: string
  },
  result: string,
  cache: string
}
```

## Hata Yönetimi

### WHOIS Sorguları

- `Invalid Domain`: Geçersiz domain formatı
- `Domain is not registered`: Domain kayıtlı değil
- `API Error`: HermesWhois API hatası

### SSL Sorguları

- `SSL Connection Failed`: SSL bağlantısı kurulamadı
- `Invalid SSL Certificate`: Geçersiz sertifika
- `HTTP error`: API erişim hatası

## Test

### API Test Script'leri

```bash
# WHOIS API testi
node test-api.js

# SSL API testi
node test-ssl.js
```

## Proje Yapısı

```
hermeswhois-mcp-server/
├── src/
│   └── index.ts          # Ana MCP sunucu kodu
├── build/                # Derlenmiş JavaScript dosyaları
├── test-api.js          # WHOIS API test script'i
├── test-ssl.js          # SSL API test script'i
├── package.json         # NPM bağımlılıkları
├── tsconfig.json        # TypeScript yapılandırması
└── README.md           # Bu dosya
```

## Teknik Detaylar

### Kullanılan Teknolojiler

- **TypeScript**: Tip güvenli geliştirme
- **@modelcontextprotocol/sdk**: MCP protokol implementasyonu
- **node-fetch**: HTTP istekleri için
- **Node.js**: Runtime environment

### Bağımlılıklar

**Runtime Dependencies**:
- @modelcontextprotocol/sdk: ^1.0.4
- node-fetch: ^3.3.2

**Development Dependencies**:
- @types/node: ^22.10.2
- ts-node: ^10.9.2
- typescript: ^5.7.2

## Lisans

MIT License

## Katkıda Bulunma

Bu proje açık kaynak değildir ve katkıya kapalıdır.

## Destek

Sorularınız veya sorunlarınız için lütfen proje sahibi ile iletişime geçin.
