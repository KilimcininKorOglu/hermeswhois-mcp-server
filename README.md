# HermesWhois MCP Server

Model Context Protocol (MCP) sunucusu - HermesWhois servisi üzerinden domain WHOIS ve SSL sertifika bilgilerini sorgulama aracı.

## Genel Bakış

Bu MCP sunucusu, Claude Desktop ve diğer MCP uyumlu uygulamalar için HermesWhois API'sine erişim sağlar. İki temel işlev sunar:

1. **WHOIS Sorgulama**: Domain kayıt bilgileri, registrar detayları ve DNS yapılandırması
2. **SSL Sertifika Analizi**: Sertifika geçerliliği, issuer bilgileri ve alternative names

### Hızlı Kullanım (Code Mode)

MCP server'a bağlanmadan doğrudan script ile sorgulama yapabilirsiniz:

```bash
# WHOIS sorgusu
node scripts/hermeswhois-api.js whois google.com

# SSL sorgusu
node scripts/hermeswhois-api.js ssl github.com

# Her ikisi birden
node scripts/hermeswhois-api.js both cloudflare.com
```

> **Not**: Code Mode yaklaşımı token kullanımını %80-98 azaltır. Detaylar için: [Cloudflare Code Mode Blog](https://blog.cloudflare.com/code-mode/)

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

### IDE Entegrasyonları

#### Claude Desktop

Claude Desktop konfigürasyon dosyanızı (`claude_desktop_config.json`) düzenleyin:

**Windows:**

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

**macOS / Linux:**

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

Config dosyası konumu:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

#### Cursor IDE

Cursor için MCP server konfigürasyonu `.cursor/mcp.json` dosyasına eklenir:

**Global konfigürasyon** (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "hermeswhois": {
      "command": "node",
      "args": ["/absolute/path/to/hermeswhois-mcp-server/build/index.js"]
    }
  }
}
```

**Proje bazlı konfigürasyon** (`.cursor/mcp.json` proje klasöründe):

```json
{
  "mcpServers": {
    "hermeswhois": {
      "command": "node",
      "args": ["${workspaceFolder}/hermeswhois-mcp-server/build/index.js"]
    }
  }
}
```

**Konum:**

- **Windows**: `%USERPROFILE%\.cursor\mcp.json` (global)
- **macOS/Linux**: `~/.cursor/mcp.json` (global)
- Proje için: `.cursor/mcp.json` dosyasını proje kök dizininde oluşturun

#### Visual Studio Code

VSCode için MCP extension kurulumu:

1. MCP extension'ı yükleyin
2. Command Palette (`Cmd/Ctrl + Shift + P`) açın
3. "MCP: Add Server" komutunu çalıştırın veya "MCP: Open User Configuration" ile manuel düzenleyin

**User-level konfigürasyon** (`mcp.json`):

**Konum:**

- **Windows**: `%APPDATA%\Code\User\mcp.json`
- **macOS**: `~/Library/Application Support/Code/User/mcp.json`
- **Linux**: `~/.config/Code/User/mcp.json`

```json
{
  "mcpServers": {
    "hermeswhois": {
      "command": "node",
      "args": ["/absolute/path/to/hermeswhois-mcp-server/build/index.js"]
    }
  }
}
```

**Workspace konfigürasyon** (`.vscode/mcp.json`):

```json
{
  "mcpServers": {
    "hermeswhois": {
      "command": "node",
      "args": ["${workspaceFolder}/hermeswhois-mcp-server/build/index.js"]
    }
  }
}
```

#### Claude Code (CLI)

Claude Code için proje konfigürasyonu oluşturun:

**.claude/mcp.json** dosyası oluşturun:

```json
{
  "mcpServers": {
    "hermeswhois": {
      "command": "node",
      "args": ["./build/index.js"]
    }
  }
}
```

Veya global kullanım için home directory'nizde:

**~/.claude/mcp.json**:

```json
{
  "mcpServers": {
    "hermeswhois": {
      "command": "node",
      "args": ["/absolute/path/to/hermeswhois-mcp-server/build/index.js"]
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

# SSE server development mode
npm run dev:sse
```

## Web Deployment

MCP server'ı internet üzerinden yayınlamak için SSE (Server-Sent Events) transport kullanabilirsiniz.

### Hızlı Başlangıç

```bash
# Dependencies yükleyin
npm install

# Build edin
npm run build

# SSE server'ı başlatın
npm run start:sse
```

Server `http://localhost:3000/sse` adresinde çalışacaktır.

### Docker ile Deployment

```bash
# Docker image build edin
docker build -t hermeswhois-mcp-server .

# Container'ı çalıştırın
docker run -d -p 3000:3000 hermeswhois-mcp-server
```

### Claude Desktop Bağlantısı (SSE)

Web üzerinden yayınlanan server için Claude Desktop config:

```json
{
  "mcpServers": {
    "hermeswhois": {
      "url": "https://mcp.hermeswhois.tr/sse"
    }
  }
}
```

**Detaylı deployment bilgisi için**: [DEPLOYMENT.md](DEPLOYMENT.md)

## NPM Package

### NPM'den Kurulum

```bash
npm install -g hermeswhois-mcp-server
```

### Çalıştırma

```bash
# Stdio mode (Claude Desktop için)
hermeswhois-mcp-server
```

### NPM'e Yayınlama

Paketi NPM'e yayınlamak için: [NPM_PUBLISH.md](NPM_PUBLISH.md)

## MCP Tools Referansı

### whois_lookup

Domain için WHOIS bilgilerini sorgular ve detaylı kayıt bilgilerini döndürür.

#### Parametreler

| Parametre | Tip    | Zorunlu | Açıklama                                      |
|-----------|--------|---------|-----------------------------------------------|
| domain    | string | Evet    | Sorgulanacak domain adı (URL formatında da olabilir) |

#### Kullanım Örneği

```text
Query: Can you look up whois information for example.com?
```

#### Örnek Yanıt

```text
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

```text
Query: Check the SSL certificate for example.com
```

#### Örnek Yanıt

```text
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

```text
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

```text
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

```bash
hermeswhois-mcp-server/
├── src/
│   ├── index.ts          # Stdio transport (Claude Desktop)
│   └── server-sse.ts     # SSE transport (Web deployment)
├── scripts/
│   └── hermeswhois-api.js # Standalone API script (Code Mode)
├── build/                # Derlenmiş JavaScript dosyaları
├── test-api.js          # WHOIS API test script'i
├── test-ssl.js          # SSL API test script'i
├── skill.md             # TypeScript API tanımı (LLM için)
├── CLAUDE.md            # Claude Code rehberi
├── AGENTS.md            # AI agent rehberi
├── package.json         # NPM bağımlılıkları
├── tsconfig.json        # TypeScript yapılandırması
└── README.md            # Bu dosya
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
- express: ^4.18.2
- cors: ^2.8.5

**Development Dependencies**:

- @types/node: ^22.10.2
- @types/express: ^4.17.21
- @types/cors: ^2.8.17
- ts-node: ^10.9.2
- typescript: ^5.7.2

## Code Mode

AI agent'lar için optimize edilmiş kullanım. MCP tool call overhead'i olmadan doğrudan API erişimi:

| Dosya | Açıklama |
|-------|----------|
| `scripts/hermeswhois-api.js` | Standalone çalıştırılabilir script |
| `skill.md` | TypeScript API tanımı (LLM context için) |

### Örnek Çıktı

```bash
$ node scripts/hermeswhois-api.js whois cloudflare.com
```

```json
{
  "domain": "cloudflare.com",
  "creationDate": "2009-02-17",
  "expiryDate": "2033-02-17",
  "registrarUrl": "http://www.cloudflare.com",
  "dnssec": "signedDelegation",
  "cached": true
}
```

```bash
$ node scripts/hermeswhois-api.js ssl github.com
```

```json
{
  "domain": "github.com",
  "sslDomain": "github.com",
  "validFrom": "2025-02-05 03:00:00",
  "validTo": "2026-02-06 02:59:59",
  "daysUntilExpiry": 48,
  "expired": false,
  "issuer": "Sectigo ECC Domain Validation Secure Server CA",
  "cached": false
}
```

> Referans: [Cloudflare Code Mode Blog](https://blog.cloudflare.com/code-mode/)

## Lisans

MIT License

## Katkıda Bulunma

Bu proje açık kaynak değildir ve katkıya kapalıdır.

## Destek

Sorularınız veya sorunlarınız için lütfen proje sahibi ile iletişime geçin.
