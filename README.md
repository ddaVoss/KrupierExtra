# Krupier Extra

Trening krupiera na telefon (i komputer): wypłaty na ruletce, blackjacku i pięciu pokerach oraz rozpoznawanie układów.

## Co jest w środku

- **Ruletka** — zakłady na numery (plein, cheval, ulica, carré, linia): liczysz wypłatę w żetonach, potem przeliczasz na złotówki (żeton po 5, 10 lub 25 zł). Serie i sąsiedzi na race tracku (Serie 5/8, Orphelins, Serie 0/2/3, Zero spiel): gracz daje kwotę, a Ty liczysz zwrot, po ile i za ile gra, a po rzucie ile płacisz.
- **Blackjack** — wypłaty 3:2 i ubezpieczenie, pełne rozdania (remisy, fury, podwojenia, splity) oraz gra krupiera (stoi na każdej 17, także miękkiej).
- **Poker** — Royal, Las Vegas, Hold'em, Hold'em Bonus i American: układ krupiera, układ gracza (w Royal także dwa układy), kto wygrywa i wypłaty pole po polu według tabel.
- Po błędzie masz drugą szansę, po drugim błędzie widzisz całe obliczenie.
- Ściąga z tabelami wypłat, statystyki i najsłabsze typy zadań.

## Jak wrzucić na hosting

Wrzuć **całą zawartość tego folderu** (`index.html`, `manifest.webmanifest`, `sw.js` oraz foldery `css`, `js`, `icons`) na dowolny hosting plików statycznych z HTTPS, np.:

- **Netlify Drop** — przeciągnij folder na stronę app.netlify.com/drop,
- **GitHub Pages** lub **Cloudflare Pages**.

Nie trzeba niczego instalować ani budować.

## Na telefonie

Otwórz adres strony, a potem:

- **iPhone (Safari):** Udostępnij → „Do ekranu początkowego”,
- **Android (Chrome):** menu ⋮ → „Dodaj do ekranu głównego”.

Strona otwiera się wtedy jak aplikacja i działa także bez internetu.

## Przydatne

- Plik `index.html` można też po prostu otworzyć w przeglądarce na komputerze — działa, tylko bez trybu offline.
- Postępy i ustawienia zapisują się tylko na danym urządzeniu.
- Tabele wypłat pokerów są w `js/poker.js` (stała `PAY`), opisy zasad w `RULES`.
- Po zmianie plików na hostingu podnieś numer wersji w `sw.js` (np. z `krupier-extra-v13` na `krupier-extra-v14`), żeby telefony od razu pobrały nową wersję.
