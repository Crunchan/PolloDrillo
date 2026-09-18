> 🚨 **DEMO LIVE (bo nie stać nas na domenę .com ani hosting za 15 zł):**  
> 🎮 **[Kliknij i graj bezpośrednio w przeglądarce](https://crunchan.github.io/PolloDrillo/)**  
> 
> *Hostowane za darmo na GitHub Pages, serwerów brak, baza na darmowym limicie API. Prawdziwy gamedev po taniości.*

---
# 🐔 Pollo & Cocodrillo 🐊

> **Symulator fontanny, w którym klikasz gdzie popadnie, żeby wypluć kurczaka, który zamienia się w krokodyla, który spada z klifu i daje ci złoto.**  
> Tak. To jest cała gra. Nie, nie będziemy tego tłumaczyć.

![Status](https://img.shields.io/badge/status-działa%20na%20moim%20kompie-success)
![Made with](https://img.shields.io/badge/made%20with-Three.js%20i%20za%20dużo%20kawy-orange)
![Chickens](https://img.shields.io/badge/pollo-%F0%9F%90%94-yellow)
![Crocodiles](https://img.shields.io/badge/cocodrillo-%F0%9F%90%8A-green)

---

## 🤔 O co tu w ogóle chodzi?

Wyobraź sobie, że masz fontannę. Do fontanny wrzucasz kurczaki. Z fontanny wychodzą krokodyle. Krokodyle idą na klif i **spadają**. Za spadanie dostajesz **złoto**. Za złoto ulepszasz fontannę. Za ulepszoną fontannę... wrzucasz więcej kurczaków.

**Filozofia zamkniętego koła przemocy wobec zwierząt w 3D.** 🎉

**W zestawie także:**
* **30 poziomów rangi** — od `NOWICJUSZ` do `🐔∞🐊`
* **Jaja Pollo** — lootboxy (legalne, bo wirtualne)
* **Ranking online** — żebyś mógł się dowartościować
* **Tryb dzień/noc** — bo noc jest ładniejsza, autorsko mówiąc
* **Muzyka z YouTube** — prawa do właścicieli, pozdrawiamy

---

## 🛠️ Tech Stack (dla tych, co klikają F12)

| Warstwa | Czym to jest | Po co |
| :--- | :--- | :--- |
| **Frontend** | HTML + CSS + Vanilla JS (ES6 Modules) | Bo frameworki są dla słabych. I dla ludzi, którzy mają czas. |
| **3D Engine** | [Three.js](https://threejs.org/) `r160` | Rysuje kurczaki. Dosłownie to robi. |
| **Persistence** | `localStorage` | Trzyma twój postęp, dopóki nie wyczyścisz cache i nie będziesz płakać. |
| **Cloud Sync** | [JSONBin.io](https://jsonbin.io/) REST API | Bo leaderboard w chmurze brzmi pro, a w rzeczywistości to jeden JSON. |
| **PWA** | Web App Manifest (inline, bez pliku) | Bo chcesz ikonkę na pulpicie, przyznaj się. |
| **Build system** | ❌ Brak | `index.html` i tyle. Serio. Jedna linijka w strukturze projektu. |

> **Zero npm. Zero bundlerów. Zero `node_modules` ważących 400 MB dla jednej funkcji.**

---

## 🏗️ Jak to w ogóle działa (technical, ale po ludzku)

### 🎥 Rendering pipeline
* `WebGLRenderer` z `PCFSoftShadowMap` — bo twarde cienie są dla psychopatów.
* `PerspectiveCamera` na orbicie sferycznej (theta/phi/radius) — przeciągasz = obracasz, scroll = zoom.
* `requestAnimationFrame` z **delta-time clampem do 0.05s** — jak ci się odpali 30 zakładek, gra nie wystrzeli krokodyla w kosmos.

### 💧 Woda w fontannie
Nie ma tu żadnego shadera wody. Jest za to:

```js
// Prawdziwa fizyka wody, poziom: inżynier z AGH
pos.setY(i, y + Math.sin(t * 2.2 + x * 3.2) * 0.075 + Math.sin(t * 3.7 + y * 4.5) * 0.045);
```

Czyli vertex displacement na `BufferGeometry` sfery. Sinus + sinus + sinus = woda. Pozdrawiam profesorów od grafiki.

### 🐔 Entity lifecycle (cykl życia kurczaka)
1. **Spawn:** `new THREE.Mesh(geo, MAT.body)` dodany do sceny.
2. **Walk:** leci po `PATH_POLLO`, hop-hop, obrót o `atan2(dx, dz)` (żeby patrzył tam, gdzie idzie, a nie w ścianę).
3. **Absorb:** spirala do środka fontanny, skala $\rightarrow 0$, `scene.remove(mesh)`.
4. **Respawn jako krokodyl:** ten sam kolor, bo interwały wyjścia = wejściu (tak, to *feature*).
5. **Fall:** grawitacja `fallV += 22 * dt`, aż $y < -1.0$ $\rightarrow$ $+ \text{złoto}$.
6. **Nirvana:** $y < -14$ $\rightarrow$ `scene.remove()` $\rightarrow$ garbage collector robi swoje.

### 💰 Ekonomia (dla tych, co lubią liczby)
* **Koszt ulepszenia:** `UPGRADE_COSTS[level]` — ręcznie wpisana tablica, bo po co wzór.
* **Wartość krokodyla:** `baseColorValue × rankMult × shopMult` — czyli rośnie szybciej niż twoje poczucie dumy.
* **Lootbox:** system ważonych prawdopodobieństw z 5 tierami rzadkości. `luckyCharm` mnoży wagi dla *rare/epic/legendary*. Tak, to legalne RNG, nie scam.

### 🌐 Async API layer
```js
// Pełna obsługa błędów, try/catch, offline fallback
async function fetchAll() {
  try { /* ... */ } catch (e) { return null; }
}
```
Wygląda profesjonalnie, ale w praktyce: jak ci padnie internet, gra dalej działa, tylko leaderboard płacze.

### 📁 Struktura projektu
```text
PolloDrillo/
└── index.html     ← cały projekt
└── theme.mp3      ← muzyka (opcjonalne, gra i tak działa)
```
Tak. Serio. Jeden plik. PWA manifest jest generowany w JS przez `Blob` i wstrzykiwany do `<head>`. Ikony to inline SVG w data URI. Zero assetów, zero folderów, zero bólu.

---

## ⚙️ Jak to odpalić lokalnie

Potrzebujesz serwera HTTP, bo import z CDN + CORS nie lubią protokołu `file://`.

* **Opcja 1 — Python (najszybsza):**
  ```bash
  python -m http.server 8000
  ```
* **Opcja 2 — Node.js:**
  ```bash
  npx http-server -p 8000
  ```
* **Opcja 3 — VS Code Live Server:**  
  Kliknij prawym na `index.html` $\rightarrow$ **Open with Live Server**. Proste.

Potem wchodzisz na `http://localhost:8000` i klikasz. Wszędzie. Dosłownie.

---

## 💻 Wymagania

* **Przeglądarka:** Cokolwiek z WebGL (Chrome 61+, Firefox 60+, Safari 11+, Edge 79+). Internet Explorer? Wyjdź.
* **GPU:** Nawet zintegrowana Intel HD da radę. Testowaliśmy na laptopie z 2013 roku.
* **Internet:** Potrzebny **TYLKO** do:
  * Załadowania Three.js z CDN przy starcie
  * Zapisu/odczytu leaderboardu (JSONBin)
  * Muzyczki (jeśli dodałeś `theme.mp3`)

> **Offline?** Gra działa. Ranking świeci pustkami. Trudno.

---

## 🧠 Znane bugi (i features)

* 🐛 **"Krokodyle się nakładają"** — feature, mają taką samą ścieżkę. Nie naprawimy.
* 🐛 **"Muzyka nie startuje od razu"** — *autoplay policy* w przeglądarkach. Kliknij gdziekolwiek, odpali się.
* 🐛 **"Zapisałem na serwer i zniknęło"** — sprawdź czy `binId` w `SERVER_CONFIG` nie wygasł. JSONBin ma darmowe limity.
* 🐛 **"Mam 2 konta i nie mogę zrobić trzeciego"** — `MAX_ACCOUNTS = 2`. Celowo. Żebyś nie robił sobie farmy altów jak psychopata.
* 🐛 **"Widzę czerwone oczy w nocy"** — to też feature. Kurczaki mają `nightEyes` z `AdditiveBlending`. Look scary, że hej. 👀

---

## 🎮 Sterowanie

| Akcja | Co się dzieje |
| :--- | :--- |
| **Klik / tap gdziekolwiek** | 🐔 Pollo! |
| **Przeciągnij** | Obrót kamery |
| **Scroll / pinch** | Zoom |
| **Space** | Spawn Pollo (klawiatura gang) |
| **U** | Ulepsz fontannę |
| **B** | Otwórz sklepik |
| **L** | Otwórz Jajo Pollo |
| **N** | Dzień/Noc |
| **Esc** | Zamknij modal |

---

## 📜 Licencja

* **Kod:** Rób se co chcesz (MIT, WTFPL, whatever).
* **Muzyka:** **NIE MOJA** — prawa należą do właścicieli, nie sprzedawaj tego jako swoje.

---

## 🐙 Linki

* **Repo:** [github.com/Crunchan/PolloDrillo](https://github.com/Crunchan/PolloDrillo)
* **Issues:** Tak, przyjmujemy. Ale jak napiszesz "nie działa", to odpowiemy "u mnie działa".
* **PR-y:** Przyjmujemy. Ale nie obiecujemy, że zmergujemy, bo to projekt robiony dla beki.

---

<div align="center">

Zrobione z 🐔, 🐊 i podejrzanie dużą ilością `console.log()`.  
Jeśli grałeś dłużej niż 10 minut — gratulacje, właśnie straciłeś 10 minut życia na fontannę z kurczakami.

**🐔 ∞ 🐊**

</div>
