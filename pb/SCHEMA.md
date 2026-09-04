# PocketBase skeem – KoduDisain

## users (sisseehitatud auth)
Registreerimine API kaudu lubatud.

## projects
| Väli | Tüüp | Märkus |
|------|------|--------|
| name | text | Projekti nimi |
| owner | relation → users | Omanik |
| data | json | Kogu plaan (seinad, ruumid, objektid) |
| share_token | text | Jagamislingi võti |
| is_public | bool | Avalik jagamine |
| notes | text | Valikuline |

**Reeglid:** list/view omanik või avalik; create sisselogitud; update/delete omanik.
