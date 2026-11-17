# CeMap konferenční kvíz

Jedna stránka pro tablet na stánku. Kvíz běží i bez sítě. Tipy a kontakty se ukládají do prohlížeče a, jakmile je připojená databáze, také do společného Postgresu. V administraci jsou pak vidět tipy ze všech tabletů a telefonů.

## Na konferenci

1. Otevři veřejnou adresu aplikace v Safari nebo Chrome na tabletu.
2. Přidej ji na plochu, ať se otevírá přes celou obrazovku:
   - iPad: Sdílet → Přidat na plochu
   - Android: menu prohlížeče → Přidat na plochu / Nainstalovat aplikaci
3. Jednou ji s internetem otevři, ať se uloží do tabletu. Pak běží i při výpadku wifi.
4. V nastavení tabletu vypni automatický zámek obrazovky (Auto-Lock → Nikdy). Po prvním dotyku se aplikace navíc snaží obrazovku držet zapnutou.
5. Nepoužívej anonymní okno. V něm se kontakty po zavření smažou.

Administrace je 5× klepnutí na logo. Na prvním tabletu zvolte 4místný PIN a stejný PIN zadejte na ostatních. Ve zdrojovém kódu žádný není. V přehledu jde záznamy hledat, omezit na kraj a seřadit podle času, přesnosti tipu nebo skóre. Tři nejlepší tipy se počítají ze všech krajů a ze všech zařízení dohromady.

Společná databáze se zapne v projektu Vercel: Storage → Create Database → Postgres → připojit k tomuto projektu. Vercel tím nastaví `POSTGRES_URL` a znovu nasadí web. Dokud databáze není, každý tablet drží své tipy u sebe. Obnova PINu, kdyby ho někdo nastavil dřív než obsluha, je proměnná `ADMIN_PIN` se čtyřmi číslicemi.

Správné ceny tipovačky jsou 19. 11. 2026 celý den uzamčené. Změna inzerátu ani úprava v administraci se do vyhodnocení nepromítne.

Kdo odešle tip ceny, musí zadat e-mail. Jeden e-mail může do tipovačky jen jednou, i když hraje z jiného tabletu.

Souhrn kontaktů odchází na monika@cemap.cz jen za lidi, kteří na úvodní stránce zvolili „Zatím ne“. Stávající uživatelé v e-mailu nejsou. Posílá se do 19. 11. 2026 (čas Prahy), dokud je stránka na tabletu otevřená a online. Do dne konference nejvýš jednou za 24 hodin, v den 19. 11. 2026 každé 2 hodiny. Doručení zajišťuje FormSubmit. Aktivační tlačítko v jejich mailu je často neplatné. Formulář je proto napojený na kód z toho mailu a souhrny chodí bez kliknutí na něj.

## Lokálně

```bash
python3 -m http.server 8741 --bind 127.0.0.1
```

Otevři `http://127.0.0.1:8741`. Service worker potřebuje stránku přes http, ne jako soubor z disku.
