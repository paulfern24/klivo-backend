# Klivo API (cloud)

API Node + FFmpeg para queimar equipas e sponsors nos clipes da app Klivo.

## Deploy no Render (recomendado)

1. Cria conta em [render.com](https://render.com)
2. **New → Blueprint** → liga o repo `paulfern24/klivo-backend` (ou faz upload desta pasta)
3. O `render.yaml` cria o serviço `klivo-api` com Docker + FFmpeg
4. Após deploy, abre:
   - `https://TEU-SERVICO.onrender.com/health` → `{ "ok": true }`
   - `https://TEU-SERVICO.onrender.com/health/ready` → `{ "ffmpeg": true }`
5. Em **Environment**, copia o valor de `API_KEY` (gerado automaticamente)

## Configurar a app móvel

Em `mobile-app/app.json` → `extra`:

```json
"klivoApiBaseUrl": "https://klivo-api.onrender.com",
"klivoApiKey": "cola-a-api-key-do-render",
"enableServerClipOverlay": true
```

Faz **1 build EAS** (0.5.0+). Depois disso, ao gravar clip com 2 equipas, o telemóvel envia o vídeo à cloud e recebe o MP4 com overlay.

## Endpoints

| Método | URL | Uso |
|--------|-----|-----|
| GET | `/health` | Health check |
| GET | `/health/ready` | Verifica FFmpeg |
| POST | `/clips/apply-overlay` | Queima overlay (multipart: `video` + `broadcast` JSON) |
| GET | `/public/klivo-free-sponsors.json` | Sponsors Free (opcional) |

Header opcional: `x-api-key` (se `API_KEY` estiver definida no servidor).

## Local

```bash
npm install
npm start
```

Windows: `iniciar-backend-overlay.bat` (precisa FFmpeg no PATH).

## Notas

- Plano free Render “dorme” após inatividade — 1.º pedido pode demorar ~30 s
- Clipes até ~120 MB
- Se a cloud falhar, a app guarda o clip **sem** overlay (não crasha)
