# CeMap konferenční kvíz

Jedna stránka pro tablet na stánku. Kvíz, tip ceny a kontakty účastníků zůstávají v prohlížeči toho tabletu. Nic se neposílá na server.

## Na konferenci

1. Otevři veřejnou adresu aplikace v Safari nebo Chrome na tabletu.
2. Přidej ji na plochu, ať se otevírá přes celou obrazovku:
   - iPad: Sdílet → Přidat na plochu
   - Android: menu prohlížeče → Přidat na plochu / Nainstalovat aplikaci
3. Jednou ji s internetem otevři, ať se uloží do tabletu. Pak běží i při výpadku wifi.
4. V nastavení tabletu vypni automatický zámek obrazovky (Auto-Lock → Nikdy). Po prvním dotyku se aplikace navíc snaží obrazovku držet zapnutou.
5. Nepoužívej anonymní okno. V něm se kontakty po zavření smažou.

Administrace je 5× klepnutí na logo. Při prvním otevření si na tabletu zvolíte vlastní PIN. Ve zdrojovém kódu žádný není a kontakty z tabletu se na jiném zařízení neukážou. Před koncem dne je exportujte do CSV.

Souhrn kontaktů odchází na monika@cemap.cz do 19. 11. 2026 (čas Prahy), dokud je stránka na tabletu otevřená a online. Do dne konference nejvýš jednou za 24 hodin, v den 19. 11. 2026 každé 2 hodiny. Doručení zajišťuje FormSubmit. Aktivační tlačítko v jejich mailu je často neplatné. Formulář je proto napojený na kód z toho mailu a souhrny chodí bez kliknutí na něj.

## Lokálně

```bash
python3 -m http.server 8741 --bind 127.0.0.1
```

Otevři `http://127.0.0.1:8741`. Service worker potřebuje stránku přes http, ne jako soubor z disku.
