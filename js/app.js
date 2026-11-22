// SmartPlaner – główna logika UI.
// Moduły Daty / Parser / Smart / Dane robią obliczenia; tu tylko stan, DOM i zdarzenia.

(function () {
  const KLUCZ = 'smartplaner-v1';
  const ZAKLADKI = [
    { id: 'wszystkie', nazwa: 'Wszystkie' },
    { id: 'dzisiaj', nazwa: 'Na dziś' },
    { id: 'po', nazwa: 'Po terminie' },
    { id: 'tydzien', nazwa: 'Ten tydzień' },
    { id: 'bez', nazwa: 'Bez terminu' },
    { id: 'zrobione', nazwa: 'Zrobione' },
  ];

  const stan = {
    zadania: [],
    wersja: 1,
    zakladka: 'wszystkie',
    szukaj: '',
    sortowanie: 'smart',
    tag: null,
    pominiete: [],
    edytowaneId: null,
    importBufor: null,
  };

  // --- DOM ---
  const $ = (sel) => document.querySelector(sel);
  const listaEl = $('#lista');
  const pustoEl = $('#pusto');
  const komunikatEl = $('#komunikat');
  const coTerazEl = $('#co-teraz');
  const zakladkiEl = $('#zakladki');
  const filtryEl = $('#filtry');
  const tydzienEl = $('#tydzien');
  const tydzienUwagaEl = $('#tydzien-uwaga');
  const statystykiEl = $('#statystyki');
  const toastEl = $('#toast');
  const okno = $('#okno-zadanie');
  const oknoImport = $('#okno-import');
  const szybkiePole = $('#szybkie-pole');
  const szybkiePodglad = $('#szybkie-podglad');
  const plikInput = $('#plik');

  let toastTimer = null;

  // --- Pomocnicze ---
  function escapeHtml(tekst) {
    return String(tekst)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toast(tekst) {
    toastEl.textContent = tekst;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2800);
  }

  function pokazKomunikat(tekst, typ) {
    if (!tekst) {
      komunikatEl.hidden = true;
      komunikatEl.textContent = '';
      return;
    }
    komunikatEl.hidden = false;
    komunikatEl.className = 'komunikat' + (typ ? ' ' + typ : '');
    komunikatEl.textContent = tekst;
  }

  function nastepneId() {
    let max = 0;
    stan.zadania.forEach((z) => { if (z.id > max) max = z.id; });
    return max + 1;
  }

  function znajdz(id) {
    return stan.zadania.find((z) => z.id === id) || null;
  }

  function zapiszLokalnie() {
    try {
      localStorage.setItem(KLUCZ, Dane.doTekstu(stan.zadania, stan.wersja));
    } catch (e) {
      // Pełny localStorage – nie blokujemy aplikacji.
    }
  }

  function wczytajLokalnie() {
    try {
      const surowe = localStorage.getItem(KLUCZ);
      if (!surowe) return false;
      const wynik = Dane.wczytajTekst(surowe);
      // Pusta lista zwykle oznacza wcześniejszy nieudany start (np. file:// + fetch) –
      // wtedy wolimy wczytać przykładowe zadania zamiast zostawić pusty ekran.
      if (!wynik.zadania.length) return false;
      stan.zadania = wynik.zadania;
      stan.wersja = wynik.wersja;
      return true;
    } catch (e) {
      return false;
    }
  }

  // Pierwsze uruchomienie: przykładowe zadania.
  // Przy otwarciu index.html z dysku (file://) fetch jest blokowany przez przeglądarkę,
  // dlatego najpierw bierzemy kopię z js/przyklad.js.
  function wczytajPrzyklad() {
    try {
      if (typeof PRZYKLAD_ZADAN === 'undefined') return false;
      const wynik = Dane.wczytajTekst(JSON.stringify(PRZYKLAD_ZADAN));
      stan.zadania = wynik.zadania;
      stan.wersja = wynik.wersja;
      zapiszLokalnie();
      return true;
    } catch (e) {
      return false;
    }
  }

  // --- Filtrowanie / sortowanie ---
  function filtruj(dzisiaj) {
    const q = stan.szukaj.trim().toLowerCase();
    return stan.zadania.filter((z) => {
      if (stan.tag && !z.tagi.includes(stan.tag)) return false;

      if (stan.zakladka === 'zrobione') {
        if (!z.wykonane) return false;
      } else if (stan.zakladka !== 'wszystkie') {
        if (z.wykonane) return false;
        if (stan.zakladka === 'dzisiaj') {
          if (z.termin !== dzisiaj) return false;
        } else if (stan.zakladka === 'po') {
          if (!z.termin || Daty.roznicaDni(dzisiaj, z.termin) >= 0) return false;
        } else if (stan.zakladka === 'tydzien') {
          if (!z.termin) return false;
          const d = Daty.roznicaDni(dzisiaj, z.termin);
          if (d < 0 || d > 6) return false;
        } else if (stan.zakladka === 'bez') {
          if (z.termin) return false;
        }
      }

      if (q) {
        const hay = (z.tytul + ' ' + z.opis + ' ' + z.tagi.join(' ')).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function sortuj(lista, dzisiaj) {
    const kopia = lista.slice();
    if (stan.sortowanie === 'smart') {
      const mapa = new Map(lista.map((z) => [z.id, Smart.pilnosc(z, dzisiaj)]));
      kopia.sort((a, b) => {
        if (a.wykonane !== b.wykonane) return a.wykonane ? 1 : -1;
        return (mapa.get(b.id) - mapa.get(a.id))
          || Smart.porownajTerminy(a, b)
          || a.id - b.id;
      });
    } else if (stan.sortowanie === 'termin') {
      kopia.sort((a, b) => {
        if (a.wykonane !== b.wykonane) return a.wykonane ? 1 : -1;
        return Smart.porownajTerminy(a, b) || a.id - b.id;
      });
    } else if (stan.sortowanie === 'priorytet') {
      kopia.sort((a, b) => {
        if (a.wykonane !== b.wykonane) return a.wykonane ? 1 : -1;
        return (Smart.WAGA[b.priorytet] - Smart.WAGA[a.priorytet])
          || Smart.porownajTerminy(a, b)
          || a.id - b.id;
      });
    } else {
      kopia.sort((a, b) => a.tytul.localeCompare(b.tytul, 'pl') || a.id - b.id);
    }
    return kopia;
  }

  // --- Render ---
  function renderZakladki(dzisiaj) {
    const liczniki = {
      wszystkie: stan.zadania.filter((z) => !z.wykonane).length,
      dzisiaj: stan.zadania.filter((z) => !z.wykonane && z.termin === dzisiaj).length,
      po: stan.zadania.filter((z) => !z.wykonane && z.termin && Daty.roznicaDni(dzisiaj, z.termin) < 0).length,
      tydzien: stan.zadania.filter((z) => {
        if (z.wykonane || !z.termin) return false;
        const d = Daty.roznicaDni(dzisiaj, z.termin);
        return d >= 0 && d <= 6;
      }).length,
      bez: stan.zadania.filter((z) => !z.wykonane && !z.termin).length,
      zrobione: stan.zadania.filter((z) => z.wykonane).length,
    };

    zakladkiEl.innerHTML = ZAKLADKI.map((z) => {
      const aktywna = stan.zakladka === z.id ? ' aktywna' : '';
      const n = liczniki[z.id];
      return '<button type="button" class="zakladka' + aktywna + '" data-zakladka="' + z.id + '">'
        + escapeHtml(z.nazwa)
        + (n ? '<span class="licznik">' + n + '</span>' : '')
        + '</button>';
    }).join('');
  }

  function renderFiltry() {
    const tagi = {};
    stan.zadania.forEach((z) => {
      z.tagi.forEach((t) => { tagi[t] = (tagi[t] || 0) + 1; });
    });
    const lista = Object.keys(tagi).sort((a, b) => tagi[b] - tagi[a] || a.localeCompare(b, 'pl'));
    if (!lista.length) {
      filtryEl.innerHTML = '';
      return;
    }
    let html = '<button type="button" class="chip' + (stan.tag === null ? ' aktywny' : '') + '" data-tag="">wszystkie tagi</button>';
    lista.forEach((t) => {
      html += '<button type="button" class="chip' + (stan.tag === t ? ' aktywny' : '') + '" data-tag="'
        + escapeHtml(t) + '">#' + escapeHtml(t) + ' <span>' + tagi[t] + '</span></button>';
    });
    filtryEl.innerHTML = html;
  }

  function renderCoTeraz(dzisiaj) {
    const z = Smart.coTeraz(stan.zadania, dzisiaj, stan.pominiete);
    if (!z) {
      const otwarte = stan.zadania.some((x) => !x.wykonane);
      coTerazEl.innerHTML = '<div class="co-teraz puste">'
        + (otwarte
          ? '<p>Przejrzałeś już wszystkie otwarte zadania. Wróć do listy albo odśwież kolejkę.</p>'
            + '<button type="button" class="przycisk" id="btn-reset-kolejki">Pokaż od początku</button>'
          : '<p>Lista jest pusta albo wszystko zrobione. Dobra robota.</p>')
        + '</div>';
      return;
    }
    const poziom = Smart.poziom(Smart.pilnosc(z, dzisiaj));
    const powod = Smart.powod(z, dzisiaj);
    let terminHtml = '';
    if (z.termin) {
      const o = Daty.opisTerminu(z.termin, dzisiaj);
      terminHtml = '<span class="termin stan-' + o.stan + '">' + escapeHtml(o.tekst) + '</span>';
    }
    coTerazEl.innerHTML =
      '<div class="co-teraz poziom-' + poziom + '">'
      + '<div class="co-teraz-nag">'
      + '<span class="etykieta">Co teraz?</span>'
      + '<span class="priorytet p-' + z.priorytet + '">' + etykietaPriorytetu(z.priorytet) + '</span>'
      + '</div>'
      + '<h2>' + escapeHtml(z.tytul) + '</h2>'
      + (z.opis ? '<p class="opis">' + escapeHtml(z.opis) + '</p>' : '')
      + '<p class="powod">' + escapeHtml(powod) + '</p>'
      + '<div class="co-teraz-meta">' + terminHtml
      + z.tagi.map((t) => '<span class="tag">#' + escapeHtml(t) + '</span>').join('')
      + '</div>'
      + '<div class="co-teraz-akcje">'
      + '<button type="button" class="przycisk glowny" data-zrob="' + z.id + '">Zrobione</button>'
      + '<button type="button" class="przycisk" data-pomin="' + z.id + '">Pomiń na razie</button>'
      + '<button type="button" class="przycisk" data-edytuj="' + z.id + '">Edytuj</button>'
      + '</div></div>';
  }

  function etykietaPriorytetu(p) {
    return p === 'sredni' ? 'średni' : p;
  }

  function renderLista(dzisiaj) {
    const widoczne = sortuj(filtruj(dzisiaj), dzisiaj);
    if (!widoczne.length) {
      listaEl.innerHTML = '';
      pustoEl.hidden = false;
      pustoEl.textContent = stan.zadania.length
        ? 'Nic nie pasuje do tego widoku. Zmień zakładkę, filtr albo wyszukiwanie.'
        : 'Brak zadań. Dodaj coś w polu powyżej albo wczytaj plik JSON.';
      return;
    }
    pustoEl.hidden = true;
    listaEl.innerHTML = widoczne.map((z) => kartaZadania(z, dzisiaj)).join('');
  }

  function kartaZadania(z, dzisiaj) {
    const poziom = z.wykonane ? 'zrobione' : Smart.poziom(Smart.pilnosc(z, dzisiaj));
    let terminHtml = '<span class="termin brak">bez terminu</span>';
    if (z.termin) {
      const o = Daty.opisTerminu(z.termin, dzisiaj);
      terminHtml = '<span class="termin stan-' + o.stan + '">' + escapeHtml(o.tekst) + '</span>';
    }
    const tagi = z.tagi.map((t) => '<button type="button" class="tag" data-tag="'
      + escapeHtml(t) + '">#' + escapeHtml(t) + '</button>').join('');

    return '<li class="zadanie poziom-' + poziom + (z.wykonane ? ' wykonane' : '') + '" data-id="' + z.id + '">'
      + '<label class="check">'
      + '<input type="checkbox" ' + (z.wykonane ? 'checked' : '') + ' data-toggle="' + z.id + '" aria-label="Oznacz jako zrobione">'
      + '<span></span>'
      + '</label>'
      + '<div class="tresc">'
      + '<div class="tytul-rzad">'
      + '<span class="tytul">' + escapeHtml(z.tytul) + '</span>'
      + '<span class="priorytet p-' + z.priorytet + '">' + etykietaPriorytetu(z.priorytet) + '</span>'
      + '</div>'
      + (z.opis ? '<p class="opis">' + escapeHtml(z.opis) + '</p>' : '')
      + '<div class="meta">' + terminHtml + tagi + '</div>'
      + '</div>'
      + '<div class="akcje">'
      + '<button type="button" class="przycisk sama-ikona" data-edytuj="' + z.id + '" title="Edytuj" aria-label="Edytuj">'
      + '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4zm12-14l2-2 2 2-2 2-2-2z" fill="currentColor"/></svg>'
      + '</button>'
      + '<button type="button" class="przycisk sama-ikona niebezpieczny" data-usun="' + z.id + '" title="Usuń" aria-label="Usuń">'
      + '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 7h12v2H6V7zm2 3h8l-1 10H9L8 10zm3-5h2l1 2H10l1-2z" fill="currentColor"/></svg>'
      + '</button>'
      + '</div></li>';
  }

  function renderTydzien(dzisiaj) {
    const dni = Smart.tydzien(stan.zadania, dzisiaj, 7);
    tydzienEl.innerHTML = dni.map((d, i) => {
      const nazwa = i === 0 ? 'dziś' : (i === 1 ? 'jutro' : Daty.dzienTygodnia(d.data).slice(0, 3));
      const dataKrotka = d.data.slice(8) + '.' + d.data.slice(5, 7);
      const title = d.zadania.map((z) => z.tytul).join('\n') || 'brak zadań';
      return '<div class="dzien stan-' + d.stan + '" title="' + escapeHtml(title) + '">'
        + '<span class="dzien-nazwa">' + nazwa + '</span>'
        + '<span class="dzien-data">' + dataKrotka + '</span>'
        + '<span class="dzien-ile">' + (d.zadania.length || '—') + '</span>'
        + '</div>';
    }).join('');

    const ostrz = Smart.ostrzezenie(dni);
    if (ostrz) {
      tydzienUwagaEl.hidden = false;
      tydzienUwagaEl.textContent = ostrz.tekst;
    } else {
      tydzienUwagaEl.hidden = true;
      tydzienUwagaEl.textContent = '';
    }
  }

  function renderStatystyki(dzisiaj) {
    const s = Smart.statystyki(stan.zadania, dzisiaj);
    const topTagi = s.tagi.slice(0, 4).map((t) =>
      '<li><span>#' + escapeHtml(t.tag) + '</span><span>' + t.zrobione + '/' + t.razem + '</span></li>'
    ).join('');

    statystykiEl.innerHTML =
      '<div class="stat-glowne">'
      + '<div class="stat-kolo" style="--p:' + s.procent + '"><span>' + s.procent + '%</span></div>'
      + '<ul class="stat-lista">'
      + '<li><strong>' + s.zrobione + '</strong> zrobione z ' + s.razem + '</li>'
      + '<li><strong>' + s.naDzis + '</strong> na dziś</li>'
      + '<li><strong>' + s.poTerminie + '</strong> po terminie</li>'
      + '<li><strong>' + s.wTygodniu + '</strong> w tym tygodniu</li>'
      + '</ul></div>'
      + (topTagi ? '<ul class="stat-tagi">' + topTagi + '</ul>' : '');
  }

  function odswiez() {
    const dzisiaj = Daty.dzis();
    // Wyrzuć z „pomiń” zadania, których już nie ma albo są zrobione.
    stan.pominiete = stan.pominiete.filter((id) => {
      const z = znajdz(id);
      return z && !z.wykonane;
    });
    renderZakladki(dzisiaj);
    renderFiltry();
    renderCoTeraz(dzisiaj);
    renderLista(dzisiaj);
    renderTydzien(dzisiaj);
    renderStatystyki(dzisiaj);
    zapiszLokalnie();
  }

  // --- CRUD ---
  function dodajZadanie(pola) {
    const z = {
      id: nastepneId(),
      tytul: pola.tytul.trim(),
      opis: (pola.opis || '').trim(),
      termin: pola.termin || null,
      priorytet: pola.priorytet || 'sredni',
      wykonane: false,
      tagi: Dane.poprawTagi(pola.tagi || []),
    };
    if (!z.tytul) return null;
    stan.zadania.push(z);
    return z;
  }

  function aktualizujZadanie(id, pola) {
    const z = znajdz(id);
    if (!z) return null;
    z.tytul = pola.tytul.trim();
    z.opis = (pola.opis || '').trim();
    z.termin = pola.termin || null;
    z.priorytet = pola.priorytet || 'sredni';
    z.tagi = Dane.poprawTagi(pola.tagi || []);
    return z;
  }

  function usunZadanie(id) {
    const i = stan.zadania.findIndex((z) => z.id === id);
    if (i < 0) return;
    const tytul = stan.zadania[i].tytul;
    stan.zadania.splice(i, 1);
    toast('Usunięto: ' + tytul);
    odswiez();
  }

  function przelaczWykonane(id) {
    const z = znajdz(id);
    if (!z) return;
    z.wykonane = !z.wykonane;
    if (z.wykonane) toast('Zrobione: ' + z.tytul);
    odswiez();
  }

  // --- Formularz ---
  function otworzFormularz(zadanie) {
    stan.edytowaneId = zadanie ? zadanie.id : null;
    $('#okno-naglowek').textContent = zadanie ? 'Edycja zadania' : 'Nowe zadanie';
    $('#f-tytul').value = zadanie ? zadanie.tytul : '';
    $('#f-opis').value = zadanie ? zadanie.opis : '';
    $('#f-termin').value = zadanie && zadanie.termin ? zadanie.termin : '';
    const pri = zadanie ? zadanie.priorytet : 'sredni';
    document.querySelectorAll('input[name="priorytet"]').forEach((r) => {
      r.checked = r.value === pri;
    });
    $('#f-tagi').value = zadanie ? zadanie.tagi.join(', ') : '';
    renderPodpowiedziTagow();
    okno.showModal();
    $('#f-tytul').focus();
  }

  function renderPodpowiedziTagow() {
    const box = $('#f-tagi-podpowiedzi');
    const znane = {};
    stan.zadania.forEach((z) => z.tagi.forEach((t) => { znane[t] = true; }));
    const lista = Object.keys(znane).sort((a, b) => a.localeCompare(b, 'pl'));
    if (!lista.length) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = lista.map((t) =>
      '<button type="button" class="chip" data-dopisz-tag="' + escapeHtml(t) + '">#' + escapeHtml(t) + '</button>'
    ).join('');
  }

  function polaZFormularza() {
    const pri = document.querySelector('input[name="priorytet"]:checked');
    return {
      tytul: $('#f-tytul').value,
      opis: $('#f-opis').value,
      termin: $('#f-termin').value || null,
      priorytet: pri ? pri.value : 'sredni',
      tagi: $('#f-tagi').value,
    };
  }

  // --- Szybkie dodawanie ---
  function odswiezPodglad() {
    const tekst = szybkiePole.value.trim();
    if (!tekst) {
      szybkiePodglad.innerHTML = '';
      return;
    }
    const p = Parser.analizuj(tekst);
    const czesci = [];
    if (p.termin) {
      const o = Daty.opisTerminu(p.termin, Daty.dzis());
      czesci.push('<span class="chip">termin: ' + escapeHtml(o.tekst) + '</span>');
    }
    if (p.priorytet) {
      czesci.push('<span class="chip">priorytet: ' + etykietaPriorytetu(p.priorytet) + '</span>');
    }
    p.tagi.forEach((t) => czesci.push('<span class="chip">#' + escapeHtml(t) + '</span>'));
    if (!czesci.length) {
      szybkiePodglad.innerHTML = '<span class="podpowiedz">Tip: „jutro”, „w piątek”, „!wysoki”, „#studia”</span>';
      return;
    }
    szybkiePodglad.innerHTML = '<span class="podpowiedz">Rozumiem:</span> ' + czesci.join(' ');
  }

  // --- Import / eksport ---
  function zaproponujImport(wynik) {
    stan.importBufor = wynik;
    const uwagi = wynik.uwagi.length
      ? ' Uwagi: ' + wynik.uwagi.slice(0, 3).join(' ')
      : '';
    $('#import-opis').textContent =
      'W pliku jest ' + wynik.zadania.length + ' '
      + Daty.odmiana(wynik.zadania.length, 'zadanie', 'zadania', 'zadań') + '.'
      + ' Masz już ' + stan.zadania.length + ' na liście.'
      + uwagi;
    oknoImport.showModal();
  }

  function zastosujImport(tryb) {
    const wynik = stan.importBufor;
    if (!wynik) return;
    if (tryb === 'zastap') {
      stan.zadania = wynik.zadania;
      stan.wersja = wynik.wersja;
    } else {
      // Dopisz – nowe id, żeby nie kolidować.
      let nastepne = nastepneId();
      wynik.zadania.forEach((z) => {
        const kopia = Object.assign({}, z, { id: nastepne++, tagi: z.tagi.slice() });
        stan.zadania.push(kopia);
      });
    }
    stan.importBufor = null;
    stan.pominiete = [];
    oknoImport.close();
    pokazKomunikat(null);
    toast(tryb === 'zastap' ? 'Zastąpiono listę z pliku.' : 'Dopisano zadania z pliku.');
    odswiez();
  }

  function wczytajPlik(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const wynik = Dane.wczytajTekst(reader.result);
        if (!wynik.zadania.length) {
          toast('W pliku nie było żadnego poprawnego zadania.');
          return;
        }
        if (!stan.zadania.length) {
          stan.zadania = wynik.zadania;
          stan.wersja = wynik.wersja;
          toast('Wczytano ' + wynik.zadania.length + ' zadań.');
          odswiez();
        } else {
          zaproponujImport(wynik);
        }
      } catch (e) {
        toast(e.message || 'Nie udało się wczytać pliku.');
      }
    };
    reader.onerror = () => toast('Nie udało się odczytać pliku.');
    reader.readAsText(file, 'UTF-8');
  }

  function zapiszPlik() {
    const tekst = Dane.doTekstu(stan.zadania, stan.wersja);
    const blob = new Blob([tekst], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zadania.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Zapisano zadania.json');
  }

  // --- Motyw ---
  function ustawMotyw(motyw) {
    document.documentElement.setAttribute('data-motyw', motyw);
    try { localStorage.setItem('smartplaner-motyw', motyw); } catch (e) { /* ignore */ }
  }

  function wczytajMotyw() {
    let motyw = 'jasny';
    try {
      motyw = localStorage.getItem('smartplaner-motyw') || motyw;
    } catch (e) { /* ignore */ }
    ustawMotyw(motyw);
  }

  // --- Zdarzenia ---
  function podlacz() {
    $('#szybkie').addEventListener('submit', (e) => {
      e.preventDefault();
      const tekst = szybkiePole.value.trim();
      if (!tekst) return;
      const p = Parser.analizuj(tekst);
      if (!p.tytul) {
        toast('Napisz przynajmniej tytuł zadania.');
        return;
      }
      dodajZadanie({
        tytul: p.tytul,
        opis: '',
        termin: p.termin,
        priorytet: p.priorytet || 'sredni',
        tagi: p.tagi,
      });
      szybkiePole.value = '';
      szybkiePodglad.innerHTML = '';
      toast('Dodano: ' + p.tytul);
      odswiez();
    });

    szybkiePole.addEventListener('input', odswiezPodglad);

    $('#btn-formularz').addEventListener('click', () => otworzFormularz(null));

    $('#formularz').addEventListener('submit', (e) => {
      e.preventDefault();
      const pola = polaZFormularza();
      if (!pola.tytul.trim()) {
        toast('Tytuł jest wymagany.');
        $('#f-tytul').focus();
        return;
      }
      if (stan.edytowaneId) {
        aktualizujZadanie(stan.edytowaneId, pola);
        toast('Zapisano zmiany.');
      } else {
        dodajZadanie(pola);
        toast('Dodano zadanie.');
      }
      okno.close();
      odswiez();
    });

    $('#f-anuluj').addEventListener('click', () => okno.close());

    document.querySelectorAll('.szybkie-daty button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dni = btn.getAttribute('data-dni');
        if (dni === '') $('#f-termin').value = '';
        else $('#f-termin').value = Daty.dodajDni(Daty.dzis(), Number(dni));
      });
    });

    $('#f-tagi-podpowiedzi').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-dopisz-tag]');
      if (!btn) return;
      const tag = btn.getAttribute('data-dopisz-tag');
      const pole = $('#f-tagi');
      const obecne = Dane.poprawTagi(pole.value);
      if (!obecne.includes(tag)) obecne.push(tag);
      pole.value = obecne.join(', ');
    });

    zakladkiEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-zakladka]');
      if (!btn) return;
      stan.zakladka = btn.getAttribute('data-zakladka');
      odswiez();
    });

    filtryEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tag]');
      if (!btn) return;
      const t = btn.getAttribute('data-tag');
      stan.tag = t === '' ? null : t;
      odswiez();
    });

    $('#szukaj').addEventListener('input', (e) => {
      stan.szukaj = e.target.value;
      odswiez();
    });

    $('#sortowanie').addEventListener('change', (e) => {
      stan.sortowanie = e.target.value;
      odswiez();
    });

    listaEl.addEventListener('click', (e) => {
      const toggle = e.target.closest('[data-toggle]');
      if (toggle) {
        // checkbox – handled by change
        return;
      }
      const edytuj = e.target.closest('[data-edytuj]');
      if (edytuj) {
        const z = znajdz(Number(edytuj.getAttribute('data-edytuj')));
        if (z) otworzFormularz(z);
        return;
      }
      const usun = e.target.closest('[data-usun]');
      if (usun) {
        const id = Number(usun.getAttribute('data-usun'));
        const z = znajdz(id);
        if (z && confirm('Usunąć „' + z.tytul + '”?')) usunZadanie(id);
        return;
      }
      const tag = e.target.closest('[data-tag]');
      if (tag) {
        stan.tag = tag.getAttribute('data-tag');
        odswiez();
      }
    });

    listaEl.addEventListener('change', (e) => {
      const toggle = e.target.closest('[data-toggle]');
      if (toggle) przelaczWykonane(Number(toggle.getAttribute('data-toggle')));
    });

    coTerazEl.addEventListener('click', (e) => {
      const zrob = e.target.closest('[data-zrob]');
      if (zrob) {
        przelaczWykonane(Number(zrob.getAttribute('data-zrob')));
        return;
      }
      const pomin = e.target.closest('[data-pomin]');
      if (pomin) {
        const id = Number(pomin.getAttribute('data-pomin'));
        if (!stan.pominiete.includes(id)) stan.pominiete.push(id);
        odswiez();
        return;
      }
      const edytuj = e.target.closest('[data-edytuj]');
      if (edytuj) {
        const z = znajdz(Number(edytuj.getAttribute('data-edytuj')));
        if (z) otworzFormularz(z);
        return;
      }
      if (e.target.closest('#btn-reset-kolejki')) {
        stan.pominiete = [];
        odswiez();
      }
    });

    $('#btn-wczytaj').addEventListener('click', () => plikInput.click());
    plikInput.addEventListener('change', () => {
      const f = plikInput.files && plikInput.files[0];
      wczytajPlik(f);
      plikInput.value = '';
    });
    $('#btn-zapisz').addEventListener('click', zapiszPlik);

    $('#import-anuluj').addEventListener('click', () => {
      stan.importBufor = null;
      oknoImport.close();
    });
    $('#import-dopisz').addEventListener('click', () => zastosujImport('dopisz'));
    $('#import-zastap').addEventListener('click', () => zastosujImport('zastap'));

    $('#btn-motyw').addEventListener('click', () => {
      const obecny = document.documentElement.getAttribute('data-motyw') || 'jasny';
      ustawMotyw(obecny === 'jasny' ? 'ciemny' : 'jasny');
    });

    // Przeciągnij JSON na stronę.
    let dragDepth = 0;
    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragDepth++;
      document.body.classList.add('przeciaganie');
    });
    window.addEventListener('dragleave', () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) document.body.classList.remove('przeciaganie');
    });
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragDepth = 0;
      document.body.classList.remove('przeciaganie');
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) wczytajPlik(f);
    });

    // Esc zamyka dialogi (natywne showModal to robi), ale przy starych przeglądarkach:
    okno.addEventListener('cancel', () => { stan.edytowaneId = null; });
  }

  // --- Start ---
  function start() {
    wczytajMotyw();
    podlacz();
    const lokalnie = wczytajLokalnie();
    if (!lokalnie) {
      const ok = wczytajPrzyklad();
      if (!ok) {
        pokazKomunikat('Brak przykładowych zadań – dodaj je ręcznie albo wczytaj plik JSON.', 'uwaga');
      }
    }
    odswiez();
  }

  start();
})();
