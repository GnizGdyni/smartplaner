// "Smart" część aplikacji: co robić najpierw, jak wygląda tydzień, statystyki.
// Same obliczenia, bez dotykania strony – dzięki temu da się to testować w Node.
const Smart = (function () {
  const D = (typeof module !== 'undefined' && module.exports) ? require('./daty.js') : Daty;

  const WAGA = { niski: 1, sredni: 2, wysoki: 3 };

  // Ile dni przed terminem zadanie powinno zacząć "się palić".
  // Do kolokwium nie da się przygotować w dniu kolokwium, a książkę do biblioteki
  // można oddać w ostatni dzień – stąd różny zapas dla różnych priorytetów.
  const ZAPAS = { niski: 0, sredni: 1, wysoki: 3 };

  // Im większa liczba, tym wcześniej trzeba się tym zająć.
  function pilnosc(z, dzisiaj) {
    if (z.wykonane) return 0;
    const bonus = (WAGA[z.priorytet] - 1) * 8;
    if (!z.termin) return 6 + bonus;

    const dni = D.roznicaDni(dzisiaj, z.termin);
    const zapas = ZAPAS[z.priorytet];
    let p;
    if (dni < 0) p = 130 + Math.min(-dni, 10) * 3;      // po terminie – im dłużej, tym gorzej
    else if (dni === 0) p = 100;                        // na dziś
    else if (dni <= zapas) p = 90 - (dni - 1) * 5;      // jeszcze jest czas, ale trzeba zacząć
    else p = 70 / (1 + 0.5 * (dni - zapas));            // dalej – spokojnie opada
    return p + bonus;
  }

  function poziom(p) {
    if (p >= 100) return 'ogien';
    if (p >= 60) return 'pilne';
    if (p >= 30) return 'wkrotce';
    return 'luz';
  }

  // Jedno zdanie tłumaczące, czemu akurat to zadanie jest na górze.
  function powod(z, dzisiaj) {
    const wazne = z.priorytet === 'wysoki';
    if (!z.termin) {
      return wazne
        ? 'Nie ma terminu, ale ma wysoki priorytet, a nic pilniejszego teraz nie masz.'
        : 'Nic pilniejszego teraz nie masz, więc można to spokojnie ruszyć.';
    }
    const dni = D.roznicaDni(dzisiaj, z.termin);
    if (dni < 0) {
      return 'Jest ' + (-dni) + ' ' + D.odmiana(dni, 'dzień', 'dni', 'dni') + ' po terminie'
        + (wazne ? ' i ma wysoki priorytet' : '') + '. Zrób to albo przełóż na realny termin.';
    }
    if (dni === 0) return 'Termin mija dzisiaj' + (wazne ? ', a priorytet jest wysoki.' : '.');
    if (dni === 1) return 'Termin jest jutro' + (wazne ? ' i to ważna sprawa.' : '.');
    if (dni <= ZAPAS[z.priorytet]) {
      return 'Do terminu jeszcze ' + dni + ' dni, ale to ważne zadanie – lepiej zacząć teraz niż w ostatnią noc.';
    }
    return 'To najbliższa rzecz na liście (termin za ' + dni + ' dni).';
  }

  function porownajTerminy(a, b) {
    if (a.termin === b.termin) return 0;
    if (!a.termin) return 1;
    if (!b.termin) return -1;
    return a.termin < b.termin ? -1 : 1;
  }

  // Niezrobione zadania od najpilniejszego.
  function kolejka(zadania, dzisiaj) {
    return zadania
      .filter((z) => !z.wykonane)
      .map((z) => ({ z: z, p: pilnosc(z, dzisiaj) }))
      .sort((a, b) => b.p - a.p || porownajTerminy(a.z, b.z) || a.z.id - b.z.id)
      .map((x) => x.z);
  }

  function coTeraz(zadania, dzisiaj, pominiete) {
    pominiete = pominiete || [];
    return kolejka(zadania, dzisiaj).find((z) => !pominiete.includes(z.id)) || null;
  }

  // Obciążenie na kolejne dni: ile zadań ma termin danego dnia i jak są "ciężkie".
  function tydzien(zadania, dzisiaj, ileDni) {
    const dni = [];
    for (let i = 0; i < (ileDni || 7); i++) {
      const data = D.dodajDni(dzisiaj, i);
      const lista = zadania.filter((z) => !z.wykonane && z.termin === data);
      const waga = lista.reduce((suma, z) => suma + WAGA[z.priorytet], 0);
      let stan = 'pusto';
      if (waga >= 6) stan = 'ciezko';
      else if (waga >= 4) stan = 'sporo';
      else if (waga >= 1) stan = 'lekko';
      dni.push({ data: data, zadania: lista, waga: waga, stan: stan });
    }
    return dni;
  }

  // Jeśli któryś dzień jest przeładowany, mówimy o tym zawczasu.
  function ostrzezenie(dni) {
    let najgorszy = null;
    dni.forEach((d, i) => {
      if (d.stan === 'ciezko' && (!najgorszy || d.waga > najgorszy.dzien.waga)) najgorszy = { dzien: d, i: i };
    });
    if (!najgorszy) return null;
    const d = najgorszy.dzien;
    const ile = d.zadania.length + ' ' + D.odmiana(d.zadania.length, 'zadanie', 'zadania', 'zadań');
    if (najgorszy.i === 0) {
      return { data: d.data, tekst: 'Dzisiaj masz ' + ile + ' z terminem na raz. Zacznij od tego z karty „Co teraz?”.' };
    }
    const nazwa = najgorszy.i === 1 ? 'Jutro' : D.dzienTygodnia(d.data);
    return {
      data: d.data,
      tekst: nazwa.charAt(0).toUpperCase() + nazwa.slice(1) + ' wygląda ciężko: ' + ile
        + ' z terminem tego samego dnia. Warto zacząć któreś wcześniej.',
    };
  }

  function statystyki(zadania, dzisiaj) {
    const s = { razem: zadania.length, zrobione: 0, poTerminie: 0, naDzis: 0, wTygodniu: 0, tagi: [] };
    const tagi = {};
    zadania.forEach((z) => {
      if (z.wykonane) s.zrobione++;
      else if (z.termin) {
        const dni = D.roznicaDni(dzisiaj, z.termin);
        if (dni < 0) s.poTerminie++;
        if (dni === 0) s.naDzis++;
        if (dni >= 0 && dni <= 6) s.wTygodniu++;
      }
      z.tagi.forEach((t) => {
        if (!tagi[t]) tagi[t] = { tag: t, razem: 0, zrobione: 0 };
        tagi[t].razem++;
        if (z.wykonane) tagi[t].zrobione++;
      });
    });
    s.procent = s.razem ? Math.round((s.zrobione / s.razem) * 100) : 0;
    s.tagi = Object.values(tagi).sort((a, b) => b.razem - a.razem || a.tag.localeCompare(b.tag, 'pl'));
    return s;
  }

  return { WAGA, pilnosc, poziom, powod, kolejka, coTeraz, tydzien, ostrzezenie, statystyki, porownajTerminy };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Smart;
