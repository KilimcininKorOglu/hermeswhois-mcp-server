# NPM Publishing Guide

Bu dokümantasyon, HermesWhois MCP Server paketini NPM'e yayınlama adımlarını içerir.

## Ön Hazırlık

### 1. NPM Hesabı

NPM hesabınız yoksa oluşturun:

- <https://www.npmjs.com/signup> adresinden kayıt olun
- Email adresinizi doğrulayın

### 2. NPM CLI ile Giriş

```bash
npm login
```

Kullanıcı adı, şifre ve email adresinizi girin.

### 3. Paket Adı Kontrolü

Paket adınız müsait mi kontrol edin:

```bash
npm search hermeswhois-mcp-server
```

Eğer başka biri kullanıyorsa, `package.json` içinde adı değiştirin:

```json
{
  "name": "@yourusername/hermeswhois-mcp-server"
}
```

## Yayınlama Öncesi Kontroller

### 1. package.json Kontrolü

Aşağıdaki alanların doğru olduğundan emin olun:

```json
{
  "name": "hermeswhois-mcp-server",
  "version": "1.0.0",
  "description": "...",
  "main": "./build/index.js",
  "types": "./build/index.d.ts",
  "bin": {
    "hermeswhois-mcp-server": "./build/index.js"
  },
  "files": [
    "build/",
    "README.md",
    "LICENSE"
  ],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/yourusername/hermeswhois-mcp-server.git"
  },
  "keywords": [
    "mcp",
    "whois",
    "ssl",
    "domain-lookup"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT"
}
```

### 2. README.md

README.md dosyasının güncel ve eksiksiz olduğundan emin olun.

### 3. LICENSE

LICENSE dosyasının mevcut olduğunu kontrol edin.

### 4. .npmignore

Yayınlanmaması gereken dosyalar `.npmignore` içinde olmalı:

```bash
src/
*.ts
!*.d.ts
test-*.js
whois-api.wantolan.net/
node_modules/
.git/
```

### 5. Build Test

```bash
# Temiz build
npm run clean
npm run build

# Build edilmiş dosyaları kontrol edin
ls -la build/
```

### 6. Local Test

Paketi local olarak test edin:

```bash
# Paketi local olarak kur
npm link

# Başka bir dizinde test edin
cd /tmp
hermeswhois-mcp-server --help

# Link'i kaldırın
npm unlink -g hermeswhois-mcp-server
```

## Yayınlama Adımları

### 1. Versiyon Güncelleme

Semantic Versioning kullanın (major.minor.patch):

```bash
# Patch update (1.0.0 -> 1.0.1)
npm version patch

# Minor update (1.0.0 -> 1.1.0)
npm version minor

# Major update (1.0.0 -> 2.0.0)
npm version major
```

veya manuel olarak `package.json` içinde `version` alanını güncelleyin.

### 2. Git Commit ve Tag

```bash
git add .
git commit -m "Release v1.0.0"
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

### 3. Dry Run (Test)

Yayınlamadan önce ne yayınlanacağını kontrol edin:

```bash
npm publish --dry-run
```

Çıktıyı kontrol edin ve `files` listesinin doğru olduğundan emin olun.

### 4. NPM'e Yayınla

```bash
# Public paket olarak yayınla
npm publish --access public
```

**Scoped paket (@username/package) için:**

```bash
npm publish --access public
```

### 5. Yayın Doğrulama

```bash
# Paketi NPM'de arayın
npm search hermeswhois-mcp-server

# Paket sayfasını kontrol edin
open https://www.npmjs.com/package/hermeswhois-mcp-server
```

## Güncelleme Yayınlama

Yeni versiyon yayınlamak için:

```bash
# 1. Değişiklikleri yapın
# ...

# 2. Build edin
npm run build

# 3. Test edin
npm test

# 4. Versiyon artırın
npm version patch  # veya minor/major

# 5. Git'e push edin
git push origin main --tags

# 6. NPM'e yayınlayın
npm publish
```

## Unpublish (Geri Çekme)

**DİKKAT**: Sadece 72 saat içinde unpublish yapabilirsiniz!

```bash
# Belirli bir versiyonu kaldır
npm unpublish hermeswhois-mcp-server@1.0.0

# Tüm paketi kaldır (tehlikeli!)
npm unpublish hermeswhois-mcp-server --force
```

## Deprecate (Kullanımdan Kaldırma)

Eski versiyonları deprecated olarak işaretle:

```bash
npm deprecate hermeswhois-mcp-server@1.0.0 "Deprecated. Use version 2.0.0+"
```

## NPM Scripts

### package.json'a Eklenebilecek Script'ler

```json
{
  "scripts": {
    "prepublishOnly": "npm run build && npm test",
    "preversion": "npm test",
    "version": "npm run build && git add -A",
    "postversion": "git push && git push --tags",
    "publish:patch": "npm version patch && npm publish",
    "publish:minor": "npm version minor && npm publish",
    "publish:major": "npm version major && npm publish"
  }
}
```

Kullanım:

```bash
npm run publish:patch
```

## GitHub Actions ile Otomatik Yayınlama

`.github/workflows/publish.yml` oluşturun:

```yaml
name: Publish to NPM

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Publish to NPM
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**NPM Token Oluşturma:**

1. <https://www.npmjs.com/settings/YOUR_USERNAME/tokens>
2. "Generate New Token" > "Automation"
3. Token'ı kopyala
4. GitHub repo > Settings > Secrets > New repository secret
5. Name: `NPM_TOKEN`, Value: token

## Best Practices

### 1. Semantic Versioning

- **MAJOR** (1.0.0 -> 2.0.0): Breaking changes
- **MINOR** (1.0.0 -> 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 -> 1.0.1): Bug fixes

### 2. CHANGELOG.md

Her release için changelog tutun:

```markdown
# Changelog

## [1.0.1] - 2025-10-04
### Fixed
- SSL certificate validation bug

## [1.0.0] - 2025-10-04
### Added
- Initial release
- WHOIS lookup
- SSL certificate lookup
```

### 3. Pre-release Versions

Beta/alpha versiyonları için:

```bash
npm version 1.1.0-beta.1
npm publish --tag beta

# Kullanımı
npm install hermeswhois-mcp-server@beta
```

### 4. NPM Stats

Paket istatistiklerini takip edin:

- <https://www.npmjs.com/package/hermeswhois-mcp-server>
- Download sayıları
- GitHub stars
- Issues

## Troubleshooting

### 403 Forbidden

```bash
# NPM'den çıkış yapıp tekrar giriş yapın
npm logout
npm login
```

### Package Name Already Taken

```bash
# Scoped package kullanın
"name": "@yourusername/hermeswhois-mcp-server"
```

### Files Not Included

```bash
# .npmignore kontrol edin
# package.json "files" arrayini kontrol edin
npm pack --dry-run
```

## Useful Commands

```bash
# Paket bilgisi
npm view hermeswhois-mcp-server

# Versiyonları listele
npm view hermeswhois-mcp-server versions

# Download stats
npm download-stats hermeswhois-mcp-server

# Paket içeriğini görüntüle
npm pack --dry-run
```

## Support

Sorular için:

- NPM Support: <https://www.npmjs.com/support>
- GitHub Issues: <https://github.com/yourusername/hermeswhois-mcp-server/issues>
