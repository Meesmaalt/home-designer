# KoduDisain

Krundi- ja majadisain (2D/3D) · konto + pilv · **etapp 5: 2D plaan, ruumid m², PDF**.

## Teenused

| Teenus | Port |
|--------|------|
| frontend | 8080 |
| PocketBase | 8090 |

```bash
cp .env.example .env
docker compose up -d --build
```

## Etapp 5

- Seina **otste lohistamine** (sinised käepidemed) + **nurga snap**
- **2D sümbolid** ustele/akendele
- **Ruumide tuvastus** suletud seintest → m²
- **PDF**: plaan (SVG) + ruumide tabel + pakkumine

## Kasutus

1. 2D vaade · joonista seinad (W)
2. Vali sein → lohista otsi
3. „Tuvasta ruumid (m²)“
4. „PDF: plaan + pakkumine“ → Ctrl+P

JSON + pilv (login) endiselt olemas.
