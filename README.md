# Strumpan

En e-handel byggd med **Next.js**, **React**, **TypeScript** och **Tailwind CSS**.

Den här guiden beskriver hur en ny gruppmedlem installerar det som behövs, klonar projektet från GitHub och startar det lokalt.

## Förutsättningar

Installera följande en gång innan du klonar projektet.

### 1. Node.js

Installera den aktuella **LTS-versionen** av Node.js från [nodejs.org](https://nodejs.org/).

Node.js-installationen innehåller även `npm` och `npx`, som används för att installera paket och köra projektet.

När installationen är klar: stäng alla terminalfönster och öppna en ny terminal. Kontrollera sedan installationen:

```powershell
node -v
npm -v
npx -v
```

Alla tre kommandon ska skriva ut ett versionsnummer.

> **PowerShell-fel:** Om `npm` eller `npx` ger ett fel som säger att scripts är disabled, kör detta i PowerShell och bekräfta med `Y`:
>
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```
>
> Stäng därefter terminalen och öppna en ny innan du provar versionskommandona igen.

### 2. Git

Installera Git från [git-scm.com](https://git-scm.com/downloads/win), eller kör följande i PowerShell:

```powershell
winget install --id Git.Git -e --source winget
```

Kontrollera installationen:

```powershell
git --version
```

### 3. VS Code

Installera [Visual Studio Code](https://code.visualstudio.com/). Det är den rekommenderade editorn för projektet.

Rekommenderade VS Code-tillägg:

- ESLint
- Tailwind CSS IntelliSense
- Prettier - Code formatter

## Klona projektet

1. Gå till GitHub-repot i webbläsaren.
2. Klicka på den gröna knappen **Code**.
3. Välj **HTTPS** och kopiera repository-länken.
4. Öppna PowerShell, Windows Terminal eller Git Bash.
5. Gå till den mapp där du vill spara projektet, exempelvis Dokument:

```powershell
cd $HOME\Documents
```

6. Klona repot. Ersätt länken med den kopierade GitHub-länken:

```powershell
git clone https://github.com/Project-Strumpan/project-strumpan.git
```

7. Gå in i projektmappen:

```powershell
cd strumpan
```

> Om mappen har ett annat namn än `strumpan`, använd namnet som skapades av `git clone`.

## Installera projektets paket

Projektets paket och deras exakta versioner beskrivs i `package.json` och `package-lock.json`.

Kör detta från projektets rotmapp:

```powershell
npm ci
```

`npm ci` installerar exakt samma beroendeversioner som resten av gruppen använder. Kommandot skapar mappen `node_modules`; den ska **inte** läggas upp på GitHub.

Om `npm ci` inte fungerar på grund av att `package-lock.json` inte stämmer med `package.json`, kontakta gruppen först. Som tillfällig utvecklingslösning kan du köra:

```powershell
npm install
```

## Starta projektet lokalt

Starta utvecklingsservern från projektets rotmapp:

```powershell
npm run dev
```

Terminalen ska visa en lokal adress, normalt:

```text
http://localhost:3000
```

Öppna adressen i webbläsaren. När ni sparar ändringar i koden uppdateras sidan automatiskt.

Stoppa servern med:

```text
Ctrl + C
```

## Öppna i VS Code

Från projektets rotmapp kan du öppna projektet direkt i VS Code:

```powershell
code .
```

Om `code` inte känns igen kan du öppna VS Code manuellt och välja **File → Open Folder**, sedan välja projektmappen `strumpan`.

## Vanliga kommandon

| Kommando | Användning |
|---|---|
| `npm ci` | Installerar projektets låsta paketversioner från grunden |
| `npm install` | Installerar paket och används när ett nytt paket har lagts till |
| `npm run dev` | Startar lokal utvecklingsserver |
| `npm run build` | Bygger en produktionsversion och hittar många byggfel |
| `npm run start` | Startar den byggda produktionsversionen efter `npm run build` |
| `npm run lint` | Kontrollerar kod med ESLint |
| `git pull` | Hämtar och applicerar senaste ändringarna från GitHub |
| `git status` | Visar lokala ändringar och aktuell Git-status |

## Dagligt arbetsflöde

Följ detta när du börjar arbeta:

```powershell
# 1. Gå till projektet
cd $HOME\Documents\strumpan

# 2. Hämta senaste kod från GitHub
git pull

# 3. Installera nya paket om package.json eller package-lock.json har ändrats
npm ci

# 4. Starta projektet
npm run dev
```

När du har gjort ändringar:

```powershell
# Se vilka filer du har ändrat
git status

# Lägg till dina ändringar
git add .

# Skapa en commit med en tydlig beskrivning
git commit -m "Beskriv vad du ändrade"

# Skicka upp ändringarna till GitHub
git push
```

Arbeta helst på en egen branch i stället för direkt på `main`:

```powershell
git checkout -b feature/din-funktion
```

Exempel:

```powershell
git checkout -b feature/product-card
```

## Projektstruktur

```text
strumpan/
├── .next/                # Automatiskt byggmaterial från Next.js – ändra inte
├── node_modules/         # Installerade npm-paket – ändra inte och commit:a inte
├── public/               # Statiska filer, exempelvis bilder och ikoner
├── src/
│   └── app/              # Sidor, layouts och global CSS för webbplatsen
│       ├── globals.css   # Globala stilar
│       ├── layout.tsx    # Gemensam layout för alla sidor
│       └── page.tsx      # Startsidan (/)
├── .gitignore            # Filer och mappar som Git inte ska spåra
├── eslint.config.mjs     # ESLint-regler
├── next.config.ts        # Next.js-konfiguration
├── package.json          # Paket, scripts och projektmetadata
├── package-lock.json     # Exakta versioner av installerade paket
├── postcss.config.mjs    # CSS/Tailwind-bearbetning
└── tsconfig.json         # TypeScript-konfiguration
```

### Var skriver vi kod?

- Lägg nya sidor i `src/app/`.
- Lägg återanvändbara React-komponenter i en mapp som heter `src/components/` när den skapas.
- Lägg bilder, SVG-filer och andra statiska resurser i `public/`.
- Ändra startsidan i `src/app/page.tsx`.
- Ändra globala stilar i `src/app/globals.css`.

## Viktiga regler

- Commit:a **inte** `node_modules/` eller `.next/`; `.gitignore` ska redan ignorera dem.
- Commit:a alltid `package.json` och `package-lock.json` när du installerar ett nytt npm-paket.
- Lägg aldrig lösenord, API-nycklar eller andra hemligheter direkt i Git. Använd i stället en lokal `.env.local`-fil, som ska vara ignorerad av Git.
- Kör `npm run lint` före en pull request eller större commit.
- Om någon annan har lagt till paket: kör `git pull` och sedan `npm ci` innan du startar appen.

## Felsökning

### `npx` eller `npm` känns inte igen

Stäng VS Code och alla terminalfönster, öppna dem igen och prova:

```powershell
node -v
npm -v
npx -v
```

Om inget versionsnummer visas behöver Node.js installeras eller installeras om med alternativet att lägga till Node.js i `PATH`.

### PowerShell blockerar `npm.ps1` eller `npx.ps1`

Kör:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Bekräfta med `Y`, starta sedan om terminalen.

### Port 3000 används redan

Antingen stoppar du den andra servern med `Ctrl + C`, eller accepterar du den alternativa port som Next.js föreslår i terminalen.

### Sidan fungerar inte efter att någon har ändrat paket

Kör följande i projektmappen:

```powershell
git pull
npm ci
npm run dev
```

## Tekniker

- Next.js
- React
- TypeScript
- Tailwind CSS
- Node.js och npm
- Git och GitHub

Senare kan ett externt e-handelsbackend, exempelvis Medusa, kopplas till detta projekt utan att hela frontend-projektet behöver skapas om.
