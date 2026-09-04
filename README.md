# KoduDisain

Krundi- ja majadisain (2D/3D) **kasutajakontodega**.

Backend: **PocketBase** (sama muster mis õhtu-mängud)  
Frontend: nginx + Three.js  
Salvestus: JSON fail **või** pilv konto alla · jagamislink

## Teenused / pordid

| Teenus | Port | Kirjeldus |
|--------|------|-----------|
| **frontend** | **8080** | Veebirakendus |
| **pocketbase** | **8090** | API, auth, projektid · admin `/_/` |

## Käivitus

```bash
cp .env.example .env
docker compose up -d --build
```

- App: http://localhost:8080  
- PB admin: http://localhost:8090/_/  
  - `admin@kodu.local` / `kodu123456` (muuda `.env`-is)

## Portainer + GitHub

1. Lükka repo GitHubi  
2. Stacks → Add stack → **Repository**  
3. Compose path: `docker-compose.yml`  
4. Environment (valikuline): `PB_ADMIN_PASSWORD=...`  
5. Deploy  

## Kasutajale

1. **Loo konto** / logi sisse  
2. Kujunda krunt  
3. **☁ Pilv** – salvestub sinu konto alla  
4. **📁** – ava teises seadmes sama kontoga  
5. **🔗 Jaga** – avalik link (`?share=TOKEN`)  
6. **📄 JSON** – töötab ka ilma serverita (offline)

## PB_PUBLIC_URL

| Olukord | Väärtus |
|---------|---------|
| Arendus, port 8090 avatud | tühi (auto `host:8090`) |
| Ainult 8080 avalik | `PB_PUBLIC_URL=/pb` (nginx proksi) |
| Eraldi domeen | `https://pb.example.com` |

## Struktuur

```
docker-compose.yml
.env.example
pb/pb_migrations/     # projects collection
frontend/             # UI + Dockerfile
```

## Turve

Muuda kindlasti `PB_ADMIN_PASSWORD` tootmises. Kasutajad registreeruvad ise (users createRule avatud).
