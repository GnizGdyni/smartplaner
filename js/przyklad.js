// Kopia zadań.json – żeby działało też przy otwarciu index.html z dysku (bez serwera).
const PRZYKLAD_ZADAN = {
  "wersja": 1,
  "zadania": [
    {
      "id": 1,
      "tytul": "Kolokwium z sieci komputerowych",
      "opis": "Rozdziały 3–5",
      "termin": "2026-11-18",
      "priorytet": "wysoki",
      "wykonane": false,
      "tagi": ["studia"]
    },
    {
      "id": 2,
      "tytul": "Projekt z baz danych – schemat ERD",
      "opis": "Diagram + opis tabel, oddanie przez Moodle",
      "termin": "2026-11-24",
      "priorytet": "wysoki",
      "wykonane": false,
      "tagi": ["studia", "projekt"]
    },
    {
      "id": 3,
      "tytul": "Zrobić zakupy na tydzień",
      "opis": "",
      "termin": "2026-11-22",
      "priorytet": "niski",
      "wykonane": false,
      "tagi": ["dom"]
    },
    {
      "id": 4,
      "tytul": "Sprawozdanie z laboratorium fizyki",
      "opis": "Ćwiczenie 7, wahadło matematyczne",
      "termin": "2026-11-20",
      "priorytet": "sredni",
      "wykonane": true,
      "tagi": ["studia"]
    },
    {
      "id": 5,
      "tytul": "Oddać książki do biblioteki",
      "opis": "Dwie pozycje z algorytmów",
      "termin": "2026-11-23",
      "priorytet": "niski",
      "wykonane": false,
      "tagi": []
    },
    {
      "id": 6,
      "tytul": "Kolokwium z analizy matematycznej",
      "opis": "Całki oznaczone i szeregi",
      "termin": "2026-11-26",
      "priorytet": "wysoki",
      "wykonane": false,
      "tagi": ["studia"]
    },
    {
      "id": 7,
      "tytul": "Prezentacja na angielski",
      "opis": "5 minut, temat: remote work",
      "termin": "2026-11-26",
      "priorytet": "sredni",
      "wykonane": false,
      "tagi": ["studia", "angielski"]
    },
    {
      "id": 8,
      "tytul": "Zapłacić za akademik",
      "opis": "",
      "termin": "2026-11-25",
      "priorytet": "wysoki",
      "wykonane": false,
      "tagi": ["finanse"]
    },
    {
      "id": 9,
      "tytul": "Trening – siłownia",
      "opis": "",
      "termin": null,
      "priorytet": "niski",
      "wykonane": false,
      "tagi": ["zdrowie"]
    },
    {
      "id": 10,
      "tytul": "Zadania domowe z programowania obiektowego",
      "opis": "Lista 5, zadania 1–4",
      "termin": "2026-11-26",
      "priorytet": "sredni",
      "wykonane": false,
      "tagi": ["studia"]
    },
    {
      "id": 11,
      "tytul": "Umówić wizytę u dentysty",
      "opis": "",
      "termin": null,
      "priorytet": "sredni",
      "wykonane": false,
      "tagi": ["zdrowie"]
    },
    {
      "id": 12,
      "tytul": "Spotkanie koła naukowego",
      "opis": "Sala 204, godz. 17:00",
      "termin": "2026-11-19",
      "priorytet": "niski",
      "wykonane": true,
      "tagi": ["koło"]
    },
    {
      "id": 13,
      "tytul": "Przeczytać artykuł o sieciach neuronowych",
      "opis": "Na seminarium",
      "termin": "2026-12-02",
      "priorytet": "niski",
      "wykonane": false,
      "tagi": ["studia"]
    },
    {
      "id": 14,
      "tytul": "Wysłać CV na praktyki",
      "opis": "Oferta z portalu uczelni, rekrutacja do końca listopada",
      "termin": "2026-11-30",
      "priorytet": "wysoki",
      "wykonane": false,
      "tagi": ["kariera"]
    },
    {
      "id": 15,
      "tytul": "Pranie",
      "opis": "",
      "termin": null,
      "priorytet": "niski",
      "wykonane": true,
      "tagi": ["dom"]
    },
    {
      "id": 16,
      "tytul": "Projekt zespołowy – podział zadań",
      "opis": "Ustalić, kto robi frontend, a kto backend",
      "termin": "2026-11-21",
      "priorytet": "sredni",
      "wykonane": false,
      "tagi": ["studia", "projekt"]
    },
    {
      "id": 17,
      "tytul": "Kupić prezent urodzinowy dla Oli",
      "opis": "",
      "termin": "2026-12-05",
      "priorytet": "sredni",
      "wykonane": false,
      "tagi": []
    },
    {
      "id": 18,
      "tytul": "Powtórka do egzaminu z algorytmów",
      "opis": "Grafy, programowanie dynamiczne",
      "termin": "2026-12-10",
      "priorytet": "wysoki",
      "wykonane": false,
      "tagi": ["studia"]
    },
    {
      "id": 19,
      "tytul": "Odebrać legitymację z dziekanatu",
      "opis": "Dziekanat czynny 10–14",
      "termin": "2026-11-27",
      "priorytet": "niski",
      "wykonane": false,
      "tagi": ["studia"]
    },
    {
      "id": 20,
      "tytul": "Zapisać się na turniej planszówek",
      "opis": "",
      "termin": null,
      "priorytet": "niski",
      "wykonane": false,
      "tagi": []
    }
  ]
};
