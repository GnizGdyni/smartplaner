// Daty trzymamy wszędzie jako tekst "RRRR-MM-DD" – dokładnie tak jak w pliku JSON.
// Dzięki temu nie ma niespodzianek ze strefami czasowymi
// (new Date("2026-11-18") to północ w UTC, a nie u nas).
const Daty = (function () {
  const DNI = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  const DNI_KROTKO = ['nd', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob'];

  function dwieCyfry(n) {
    return String(n).padStart(2, '0');
  }

  function naTekst(d) {
    return d.getFullYear() + '-' + dwieCyfry(d.getMonth() + 1) + '-' + dwieCyfry(d.getDate());
  }

  function zTekstu(tekst) {
    const c = tekst.split('-').map(Number);
    return new Date(c[0], c[1] - 1, c[2]);
  }

  function dzis() {
    return naTekst(new Date());
  }

  function dodajDni(tekst, ile) {
    const d = zTekstu(tekst);
    d.setDate(d.getDate() + ile);
    return naTekst(d);
  }

  // Ile dni od "od" do "doKiedy". Ujemne = data już minęła.
  // Math.round, bo przy zmianie czasu doba ma 23 albo 25 godzin.
  function roznicaDni(od, doKiedy) {
    return Math.round((zTekstu(doKiedy) - zTekstu(od)) / 86400000);
  }

  function poprawna(tekst) {
    if (typeof tekst !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(tekst)) return false;
    return naTekst(zTekstu(tekst)) === tekst; // odrzuca np. 2026-02-31
  }

  // odmiana(3, 'zadanie', 'zadania', 'zadań') -> 'zadania'
  function odmiana(n, jeden, kilka, wiele) {
    n = Math.abs(n);
    if (n === 1) return jeden;
    const j = n % 10;
    const d = n % 100;
    if (j >= 2 && j <= 4 && (d < 12 || d > 14)) return kilka;
    return wiele;
  }

  function dzienTygodnia(tekst) {
    return DNI[zTekstu(tekst).getDay()];
  }

  // "czw 26.11", a jeśli to inny rok niż bieżący, to "czw 26.11.2027"
  function krotko(tekst, dzisiaj) {
    const d = zTekstu(tekst);
    let wynik = DNI_KROTKO[d.getDay()] + ' ' + dwieCyfry(d.getDate()) + '.' + dwieCyfry(d.getMonth() + 1);
    if (dzisiaj && d.getFullYear() !== zTekstu(dzisiaj).getFullYear()) wynik += '.' + d.getFullYear();
    return wynik;
  }

  // Termin po ludzku: "dziś", "jutro", "2 dni po terminie", "piątek (za 5 dni)"...
  // stan: 'po' | 'dzis' | 'blisko' | 'dalej' – używany do kolorowania.
  function opisTerminu(termin, dzisiaj) {
    const dni = roznicaDni(dzisiaj, termin);
    if (dni < 0) {
      return { tekst: -dni + ' ' + odmiana(dni, 'dzień', 'dni', 'dni') + ' po terminie', stan: 'po' };
    }
    if (dni === 0) return { tekst: 'dziś', stan: 'dzis' };
    if (dni === 1) return { tekst: 'jutro', stan: 'blisko' };
    if (dni === 2) return { tekst: 'pojutrze', stan: 'blisko' };
    if (dni <= 6) return { tekst: dzienTygodnia(termin) + ' (za ' + dni + ' dni)', stan: 'dalej' };
    return { tekst: krotko(termin, dzisiaj), stan: 'dalej' };
  }

  return {
    naTekst, zTekstu, dzis, dodajDni, roznicaDni, poprawna,
    odmiana, dzienTygodnia, krotko, opisTerminu,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Daty;
