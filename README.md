# SmartPlaner

Planner zadań dla studenta — zadanie eliminacyjne SmartApp (BEST Gdańsk).

Aplikacja webowa: lista to-do z wczytywaniem/zapisem JSON oraz własnym „smart” silnikiem, który podpowiada **co robić teraz**.

## Jak uruchomić

1. Pobierz / sklonuj repozytorium.
2. Otwórz plik `index.html` w przeglądarce (Chrome, Edge, Firefox).

Nie trzeba instalować niczego ani odpalać serwera — przykładowe zadania są w `js/przyklad.js`, więc działa też przy otwarciu z dysku.

Opcjonalnie z lokalnym serwerem:

```bash
npx --yes serve .
```

Potem wejdź na adres pokazany w terminalu.

## Co działa

Wymagania z zadania:

- [x] lista zadań
- [x] dodawanie
- [x] edycja
- [x] oznaczanie jako zrobione / cofanie
- [x] usuwanie
- [x] wczytywanie z pliku JSON (format z zadania)
- [x] zapis do pliku JSON w tym samym formacie

Dodatkowo:

- szybkie dodawanie jednym zdaniem (`jutro`, `w piątek`, `!wysoki`, `#studia`)
- widoki: Na dziś, Po terminie, Ten tydzień, Bez terminu, Zrobione
- wyszukiwanie, sortowanie, filtry po tagach
- automatyczny zapis w `localStorage`
- jasny / ciemny motyw
- przeciąganie pliku JSON na stronę

## Czego nie zdążyliśmy zrobić

- synchronizacja między urządzeniami / konto użytkownika
- przypomnienia push / e-mail
- wersja mobilna jako osobna aplikacja (PWA) — działa w przeglądarce na telefonie, ale bez instalacji „na pulpit”
- testy automatyczne jednostkowe (logika w `js/smart.js`, `parser.js`, `dane.js` jest wydzielona pod testy, ale suite’u nie dopięliśmy)

## Co dodaliśmy od siebie i dlaczego

### 1. Karta „Co teraz?”

Zwykła lista nie mówi, od czego zacząć. SmartPlaner liczy **pilność** z terminu i priorytetu (np. kolokwium „wysokie” zaczyna „się palić” wcześniej niż oddanie książki) i pokazuje jedno zadanie z uzasadnieniem po polsku. Można je odhaczyć albo **pominąć na razie** — wtedy podsuwa następne.

### 2. Szybkie dodawanie po polsku

Student wpisuje jak w notatniku:  
`Kolokwium z sieci w piątek !wysoki #studia`  
Parser wyciąga termin, priorytet i tagi — bez klilkania po formularzu.

### 3. Tydzień obciążenia

Pasek 7 dni pokazuje, ile rzeczy wpada na każdy dzień. Jeśli któryś dzień jest przeładowany, aplikacja o tym ostrzega *zanim* będzie za późno.

### 4. Statystyki „Jak mi idzie”

Procent zrobionych, ile po terminie, ile na dziś — żeby widać było tempo, nie tylko listę.

### 5. Odporny import JSON

Przy wczytywaniu naprawiamy drobne braki (zły priorytet → średni, brak id → nowe), zamiast odrzucać cały plik. Przy zapisie zachowujemy kolejność pól jak w przykładzie z zadania.

## Struktura

```
index.html          – UI
css/style.css       – wygląd
zadania.json        – 20 przykładowych zadań
js/daty.js          – daty bez pułapek stref czasowych
js/parser.js        – szybkie dodawanie z tekstu
js/smart.js         – pilność, „co teraz”, tydzień, statystyki
js/dane.js          – wczytywanie / zapis formatu JSON
js/app.js           – stan aplikacji i DOM
prezentacja/        – slajdy na 2 minuty
```

## Prezentacja

Otwórz `prezentacja/index.html` w przeglądarce. Strzałki / spacja = następny slajd. Całość mieści się w ~2 minutach mówienia.
