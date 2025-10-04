# Deployment Guide

Bu dokümantasyon, HermesWhois MCP Server'ı web üzerinde yayınlama adımlarını içerir.

## Deployment Seçenekleri

### 1. Docker ile Deployment

#### Gereksinimler

- Docker 20.10+
- Docker Compose 2.0+

#### Adımlar

1. **Projeyi klonlayın**

```bash
git clone https://github.com/yourusername/hermeswhois-mcp-server.git
cd hermeswhois-mcp-server
```

2. **Environment dosyasını oluşturun**

```bash
cp .env.example .env
# .env dosyasını düzenleyin
```

3. **Docker image build edin**

```bash
docker build -t hermeswhois-mcp-server .
```

4. **Container'ı çalıştırın**

```bash
docker run -d \
  --name hermeswhois-mcp \
  -p 3000:3000 \
  --restart unless-stopped \
  hermeswhois-mcp-server
```

#### Docker Compose ile

```bash
# Docker Compose ile başlatın
docker-compose up -d

# Logları izleyin
docker-compose logs -f hermeswhois-mcp

# Durdurmak için
docker-compose down
```

### 2. SSL/HTTPS Yapılandırması

#### Nginx Reverse Proxy Yapılandırması

**1. DNS A Kaydı Ekleyin**

```text
mcp.hermeswhois.tr -> your-server-ip
```

**2. Let's Encrypt SSL Sertifikası Alın**

```bash
# Certbot kurulumu (Ubuntu/Debian)
sudo apt update
sudo apt install certbot python3-certbot-nginx

# SSL sertifikası al
sudo certbot --nginx -d mcp.hermeswhois.tr
```

**3. Nginx Yapılandırması**

`/etc/nginx/sites-available/hermeswhois-mcp` dosyası oluşturun:

```nginx
server {
    listen 80;
    server_name mcp.hermeswhois.tr;

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name mcp.hermeswhois.tr;

    ssl_certificate /etc/letsencrypt/live/mcp.hermeswhois.tr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.hermeswhois.tr/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # SSE specific headers
        proxy_set_header X-Accel-Buffering no;
        proxy_buffering off;
        proxy_read_timeout 24h;
    }

    location /health {
        proxy_pass http://localhost:3000/health;
    }
}
```

**4. Nginx Yapılandırmasını Aktif Edin**

```bash
# Symlink oluştur
sudo ln -s /etc/nginx/sites-available/hermeswhois-mcp /etc/nginx/sites-enabled/

# Nginx yapılandırmasını test et
sudo nginx -t

# Nginx'i yeniden başlat
sudo systemctl reload nginx
```

**5. SSL Otomatik Yenileme**

```bash
# Certbot otomatik yenileme test et
sudo certbot renew --dry-run

# Cron job (otomatik kurulur)
sudo systemctl status certbot.timer
```

### 3. PM2 ile Node.js Deployment

```bash
# PM2 kurulumu
npm install -g pm2

# Build
npm run build

# PM2 ile başlat
pm2 start build/server-sse.js --name hermeswhois-mcp

# Startup script oluştur
pm2 startup
pm2 save

# Logları izle
pm2 logs hermeswhois-mcp

# Yeniden başlat
pm2 restart hermeswhois-mcp
```

### 4. Cloud Platform Deployment

#### Heroku

1. **Heroku CLI kurulumu**

```bash
heroku login
```

2. **App oluştur**

```bash
heroku create hermeswhois-mcp
```

3. **Deploy**

```bash
git push heroku main
```

4. **Environment variables**

```bash
heroku config:set NODE_ENV=production
```

#### DigitalOcean App Platform

1. **App oluştur**: DigitalOcean kontrol panelinden
2. **GitHub repository bağla**
3. **Build Command**: `npm run build`
4. **Run Command**: `npm run start:sse`
5. **Environment Variables**: `PORT=3000`

#### Railway

1. **Railway CLI**

```bash
npm install -g @railway/cli
railway login
```

2. **Deploy**

```bash
railway init
railway up
```

### 5. Claude Desktop ile Bağlantı

SSE server deploy edildikten sonra, Claude Desktop config'ini güncelleyin:

```json
{
  "mcpServers": {
    "hermeswhois": {
      "url": "https://mcp.hermeswhois.tr/sse"
    }
  }
}
```

## Health Check

Server çalışıyor mu kontrol edin:

```bash
curl https://mcp.hermeswhois.tr/health
```

Beklenen yanıt:

```json
{
  "status": "ok",
  "timestamp": "2025-10-04T12:00:00.000Z"
}
```

## Monitoring & Logging

### Docker Logs

```bash
docker logs -f hermeswhois-mcp
```

### PM2 Monitoring

```bash
pm2 monit
```

### Health Check Endpoint

```bash
# Her 30 saniyede bir kontrol
watch -n 30 curl https://mcp.hermeswhois.tr/health
```

## Güvenlik Önerileri

1. **CORS Yapılandırması**: Sadece güvenilir origin'lere izin verin
2. **Rate Limiting**: İsteğe bağlı rate limiter ekleyin
3. **API Key**: Gerekirse authentication ekleyin
4. **HTTPS**: Mutlaka SSL/TLS kullanın
5. **Firewall**: Sadece gerekli portları açın (80, 443, 3000)

## Troubleshooting

### SSE Connection Fails

1. CORS headers kontrol edin
2. Reverse proxy buffer ayarlarını kontrol edin (`proxy_buffering off`)
3. Timeout ayarlarını artırın

### Port Already in Use

```bash
# Portun kullanımını kontrol edin
lsof -i :3000

# Process'i durdurun
kill -9 <PID>
```

### SSL Certificate Issues

```bash
# Let's Encrypt yenileme
certbot renew --dry-run
```

## Scaling

### Horizontal Scaling

```bash
# Docker ile birden fazla instance
docker-compose up -d --scale hermeswhois-mcp=3
```

### Load Balancer

Nginx veya HAProxy ile load balancing ekleyin.

## Backup

```bash
# Docker volume backup
docker run --rm \
  -v hermeswhois_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/backup.tar.gz /data
```

## Support

Sorunlar için:

- GitHub Issues: <https://github.com/yourusername/hermeswhois-mcp-server/issues>
- Documentation: README.md
