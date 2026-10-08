# KoduDisain

Kodu, aia ja hoone planeerija: 2D/3D, ruumilahendused, materjalid, ehitusmahtude hinnangud ja projektide jagamine.

## Kohalik käivitamine

Vajalik Node.js 24 või uuem.

```bash
npm ci
npm start
```

Ava `http://127.0.0.1:3000`. Porti saab muuta `PORT` keskkonnamuutujaga. Kohalik server kuulab vaikimisi ainult oma arvutis; konteineris kasuta `HOST=0.0.0.0`.

Kohalik Node server sisaldab PocketBase API-ga ühilduvat failisalvestust. Konto loomine ja sisse logimine on eraldi toimingud. Uue konto parool peab sisaldama vähemalt 8 märki. Olemasolevad kohalikud paroolid teisendatakse käivitamisel scrypt räsideks ning kasutajad ja projektid säilivad. Seansid on allkirjastatud ja kehtivad 7 päeva. Andmed on `.storage.json` failis; allkirjastamise võti on kõrvalfailis `.storage.json.session-key`. Varunda need koos. `DATA_FILE` ja `SESSION_SECRET` võimaldavad kasutada teist asukohta või võtit. Repositooriumi varasemad näidiskontod on ainult kohalikuks proovimiseks.

## Töölaud

- **Projekt**: uus projekt, JSON-faili avamine ja allalaadimine, näidisprojektid, kontod ja pilveprojektid.
- **Tööriistad**: plaani ja 3D-mudeli eksport, energia, päike, karkass, materjalivaated ja fotorežiim.
- **Kuva**: kaamera, korrused, valgus, haakumine ja muud kuva seaded.
- Muudatused salvestuvad automaatselt **samas brauseris**. See on üks taastatav töölaud; olulised variandid salvesta eraldi JSON-failidena või pilve.
- `Ctrl+Z` võtab tagasi, `Ctrl+Shift+Z` või `Ctrl+Y` teeb uuesti, `Ctrl+S` laadib projektifaili alla. Redigeerimise ajalugu on kuni 40 tegevust.
- Pilveprojekti juures **Peata jagamine** tühistab olemasoleva jagamislingi ligipääsu.
- Väiksel ekraanil ava külgpaneelid tööala servanupust. Paneelid sulguvad ka `[` ja `]` klahviga.

3D-vaade vajab WebGL-i ning internetti Three.js ja PocketBase kliendi laadimiseks. Kui käivitamine ebaõnnestub, näidatakse taastamisnuppu; brauseri salvestus säilib.

## Kontrollimine

```bash
npm run lint
npm test
npm run build
```

Kontrollid hõlmavad kõigi JavaScript-failide süntaksit, kontode ja projektide ligipääsu, jagamise peatamist, olemasolevate paroolide teisendamist, projektifailide valideerimist, menüüs säilinud tööriistu ning muutumatuid undo/redo ajaloo koopiaid. `build` kontrollib staatilist rakendust; eraldi bundlerit ei kasutata. GitHub Actions käivitab samad kontrollid.

## Teenused

| Teenus | Port |
|--------|------|
| frontend | 8080 |
| PocketBase | 8090 |

```bash
cp .env.example .env
docker compose up -d --build
```

## Plaani tööriistad

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
