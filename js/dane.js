// Wczytywanie i zapis w formacie z zadania:
// { "wersja": 1, "zadania": [ { id, tytul, opis, termin, priorytet, wykonane, tagi } ] }
const Dane = (function () {
  const D = (typeof module !== 'undefined' && module.exports) ? require('./daty.js') : Daty;

  const PRIORYTETY = ['niski', 'sredni', 'wysoki'];

  function poprawPriorytet(wartosc) {
    if (typeof wartosc !== 'string') return null;
    const p = wartosc.trim().toLowerCase().replace('ś', 's');
    return PRIORYTETY.includes(p) ? p : null;
  }

  function poprawTagi(wartosc) {
    if (typeof wartosc === 'string') wartosc = wartosc.split(',');
    if (!Array.isArray(wartosc)) return [];
    const tagi = [];
    wartosc.forEach((t) => {
      if (typeof t !== 'string') return;
      t = t.trim();
      if (t && !tagi.includes(t)) tagi.push(t);
    });
    return tagi;
  }

  // Zamienia tekst pliku na listę zadań. Plik od kogoś innego może mieć drobne braki,
  // więc co się da naprawiamy i zapisujemy uwagę, zamiast odrzucać całość.
  // Zwraca { wersja, zadania, uwagi }. Rzuca Error, gdy pliku nie da się w ogóle użyć.
  function wczytajTekst(tekst) {
    let dane;
    try {
      dane = JSON.parse(String(tekst).replace(/^\uFEFF/, ''));
    } catch (e) {
      throw new Error('To nie jest poprawny plik JSON.');
    }

    let lista;
    let wersja = 1;
    if (Array.isArray(dane)) {
      lista = dane; // sama lista zadań, bez "opakowania" – też przyjmujemy
    } else if (dane && typeof dane === 'object' && Array.isArray(dane.zadania)) {
      lista = dane.zadania;
      if (dane.wersja !== undefined) wersja = dane.wersja;
    } else {
      throw new Error('W pliku nie ma listy „zadania”.');
    }

    const uwagi = [];
    const zadania = [];
    const zajeteId = new Set();
    const bezId = [];

    lista.forEach((surowe, i) => {
      const nr = 'Pozycja ' + (i + 1);
      if (!surowe || typeof surowe !== 'object' || Array.isArray(surowe)) {
        uwagi.push(nr + ': pominięta, bo to nie jest zadanie.');
        return;
      }
      const tytul = typeof surowe.tytul === 'string' ? surowe.tytul.trim() : '';
      if (!tytul) {
        uwagi.push(nr + ': pominięta, bo nie ma tytułu.');
        return;
      }

      // Kopiujemy też pola, których nie znamy – przy zapisie wrócą do pliku nietknięte.
      const z = Object.assign({}, surowe);
      z.tytul = tytul;
      z.opis = typeof surowe.opis === 'string' ? surowe.opis : '';
      z.wykonane = surowe.wykonane === true;
      z.tagi = poprawTagi(surowe.tagi);

      z.termin = null;
      if (typeof surowe.termin === 'string' && surowe.termin.trim() !== '') {
        const data = surowe.termin.trim().slice(0, 10); // na wypadek "2026-11-18T10:00"
        if (D.poprawna(data)) z.termin = data;
        else uwagi.push(nr + ' („' + tytul + '”): nie rozumiem terminu „' + surowe.termin + '”, zostawiam bez terminu.');
      }

      z.priorytet = poprawPriorytet(surowe.priorytet);
      if (!z.priorytet) {
        z.priorytet = 'sredni';
        uwagi.push(nr + ' („' + tytul + '”): nieznany priorytet, ustawiam średni.');
      }

      if (Number.isInteger(surowe.id) && !zajeteId.has(surowe.id)) {
        zajeteId.add(surowe.id);
      } else {
        z.id = null;
        bezId.push(z);
      }
      zadania.push(z);
    });

    if (bezId.length) {
      let nastepne = Math.max(0, ...zajeteId) + 1;
      bezId.forEach((z) => { z.id = nastepne++; });
      uwagi.push('Nadano nowe id ' + bezId.length + ' zad. (brakowało go albo się powtarzało).');
    }

    return { wersja: wersja, zadania: zadania, uwagi: uwagi };
  }

  // Tekst do zapisania w pliku. Kolejność pól taka sama jak w przykładzie z zadania.
  function doTekstu(zadania, wersja) {
    const lista = zadania.map((z) => {
      const { id, tytul, opis, termin, priorytet, wykonane, tagi, ...reszta } = z;
      return { id, tytul, opis, termin, priorytet, wykonane, tagi, ...reszta };
    });
    return JSON.stringify({ wersja: wersja === undefined ? 1 : wersja, zadania: lista }, null, 2) + '\n';
  }

  return { PRIORYTETY, wczytajTekst, doTekstu, poprawTagi };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Dane;
