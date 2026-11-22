// Szybkie dodawanie: z jednego zdania wyciągamy termin, priorytet i tagi.
//   "Kolokwium z sieci w piątek !wysoki #studia"
//   -> tytuł "Kolokwium z sieci", termin = najbliższy piątek, priorytet wysoki, tag studia
const Parser = (function () {
  const D = (typeof module !== 'undefined' && module.exports) ? require('./daty.js') : Daty;

  // Klucze bez polskich znaków, bo porównujemy po bezOgonkow().
  // Są też formy odmienione, żeby działało "do piątku" i "na środę".
  const DNI_TYGODNIA = {
    niedziela: 0, niedziele: 0, niedzieli: 0,
    poniedzialek: 1, poniedzialku: 1,
    wtorek: 2, wtorku: 2,
    sroda: 3, srode: 3, srody: 3,
    czwartek: 4, czwartku: 4,
    piatek: 5, piatku: 5,
    sobota: 6, sobote: 6, soboty: 6,
  };

  const MIESIACE = {
    stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
    lipca: 7, sierpnia: 8, wrzesnia: 9, pazdziernika: 10, listopada: 11, grudnia: 12,
  };

  const PRIORYTETY = {
    wysoki: 'wysoki', w: 'wysoki', pilne: 'wysoki', wazne: 'wysoki',
    sredni: 'sredni', s: 'sredni',
    niski: 'niski', n: 'niski',
  };

  // "w piątek", "na jutro", "do 18.11" – przyimek przed datą nie powinien zostać w tytule
  const PRZYIMKI = ['w', 'we', 'na', 'do'];

  function bezOgonkow(tekst) {
    return tekst.toLowerCase()
      .replace(/ł/g, 'l')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function slowo(slowa, i) {
    if (i >= slowa.length) return '';
    return bezOgonkow(slowa[i]).replace(/[.,;:?]+$/, '');
  }

  function zDniaIMiesiaca(dzien, miesiac, rok, dzisiaj) {
    const zbuduj = (r) => r + '-' + String(miesiac).padStart(2, '0') + '-' + String(dzien).padStart(2, '0');
    if (rok) {
      if (rok < 100) rok += 2000;
      const data = zbuduj(rok);
      return D.poprawna(data) ? data : null;
    }
    // Bez roku: bierzemy najbliższą taką datę. "15.01" wpisane w listopadzie to styczeń za rok.
    const tenRok = Number(dzisiaj.slice(0, 4));
    let data = zbuduj(tenRok);
    if (!D.poprawna(data)) return null;
    if (data < dzisiaj) data = zbuduj(tenRok + 1);
    return D.poprawna(data) ? data : null;
  }

  // Sprawdza, czy od słowa nr i zaczyna się data.
  // Zwraca { termin, ile } (ile słów zajęła) albo null.
  function dataOd(slowa, i, dzisiaj) {
    const a = slowo(slowa, i);
    const b = slowo(slowa, i + 1);
    const c = slowo(slowa, i + 2);

    if (a === 'dzis' || a === 'dzisiaj') return { termin: dzisiaj, ile: 1 };
    if (a === 'jutro' || a === 'jutra') return { termin: D.dodajDni(dzisiaj, 1), ile: 1 };
    if (a === 'pojutrze') return { termin: D.dodajDni(dzisiaj, 2), ile: 1 };

    if (a === 'za') {
      if (b === 'tydzien') return { termin: D.dodajDni(dzisiaj, 7), ile: 2 };
      if (/^\d{1,3}$/.test(b)) {
        const n = Number(b);
        if (c === 'dni' || c === 'dzien') return { termin: D.dodajDni(dzisiaj, n), ile: 3 };
        if (/^tygodni/.test(c)) return { termin: D.dodajDni(dzisiaj, n * 7), ile: 3 };
      }
      return null;
    }

    if (Object.prototype.hasOwnProperty.call(DNI_TYGODNIA, a)) {
      // Najbliższy taki dzień, ale nie dzisiejszy – na dziś jest słowo "dziś".
      let ile = (DNI_TYGODNIA[a] - D.zTekstu(dzisiaj).getDay() + 7) % 7;
      if (ile === 0) ile = 7;
      return { termin: D.dodajDni(dzisiaj, ile), ile: 1 };
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(a)) {
      return D.poprawna(a) ? { termin: a, ile: 1 } : null;
    }

    // 18.11 albo 18.11.2026
    const m = a.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}|\d{2}))?$/);
    if (m) {
      const termin = zDniaIMiesiaca(Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : null, dzisiaj);
      return termin ? { termin: termin, ile: 1 } : null;
    }

    // "18 listopada" albo "18 listopada 2026"
    if (/^\d{1,2}$/.test(a) && MIESIACE[b]) {
      const zRokiem = /^\d{4}$/.test(c);
      const termin = zDniaIMiesiaca(Number(a), MIESIACE[b], zRokiem ? Number(c) : null, dzisiaj);
      return termin ? { termin: termin, ile: zRokiem ? 3 : 2 } : null;
    }

    return null;
  }

  function analizuj(tekst, dzisiaj) {
    dzisiaj = dzisiaj || D.dzis();
    const slowa = tekst.trim().split(/\s+/).filter(Boolean);
    const tytul = [];
    const tagi = [];
    let termin = null;
    let priorytet = null;

    for (let i = 0; i < slowa.length; i++) {
      const s = slowa[i];

      if (s.length > 1 && s[0] === '#') {
        const tag = s.slice(1).replace(/[.,;:?]+$/, '').toLowerCase();
        if (tag && !tagi.includes(tag)) tagi.push(tag);
        continue;
      }

      if (s.length > 1 && s[0] === '!') {
        const p = PRIORYTETY[slowo(slowa, i).slice(1)];
        if (p) {
          priorytet = p;
          continue;
        }
      }

      // Bierzemy tylko pierwszą datę. Jak ktoś napisze dwie, druga zostaje w tytule.
      if (termin === null) {
        const znalezione = dataOd(slowa, i, dzisiaj);
        if (znalezione) {
          termin = znalezione.termin;
          i += znalezione.ile - 1;
          if (tytul.length && PRZYIMKI.includes(bezOgonkow(tytul[tytul.length - 1]))) tytul.pop();
          continue;
        }
      }

      tytul.push(s);
    }

    return { tytul: tytul.join(' '), termin: termin, priorytet: priorytet, tagi: tagi };
  }

  return { analizuj, bezOgonkow };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Parser;
