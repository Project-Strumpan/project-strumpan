# Återställning vid Misslyckad Databasmigrering (MariaDB)

Enkel guide för vad du gör om en migrering (`schema.sql`) kraschar halvvägs.

---

## 1. Varför rullas inte tabeller tillbaka automatiskt?

I MariaDB ger kommandon som `CREATE TABLE` en automatisk **commit** direkt.  
Om ett skript kraschar på tabell 5 av 10 stannar skriptet, men **tabell 1–4 finns kvar i databasen**. Databasen hamnar i ett halvfärdigt läge.

---

## 2. Vilken metod ska jag välja?

Välj metod utifrån var du kör:

| Situation | Lösning | Vad du gör |
| :--- | :--- | :--- |
| **Lokal miljö / Test** *(ingen viktig data)* | **Full Rollback** | Rensa bort allt med `schema_down.sql`, fixa felet och kör om från start. |
| **Produktion / Miljö med data** | **Rätta & Fortsätt (Recovery)** | Rör inte befintliga tabeller. Kör bara de tabeller som saknas så att ingen data försvinner. |

---

## 3. Steg-för-steg: Vad gör jag när det kraschar?

### Steg 1: Skydda data (Ta backup)
Innan du rör något, ta en säkerhetskopia:
```bash
mysqldump -u <användare> -p <databas> > backup_innan_fix.sql
```

### Steg 2: Kolla vad som hann skapas
Se vilka tabeller som faktiskt finns i databasen:
```sql
SHOW TABLES;
```
Kolla i terminalen vilket felmeddelande och vilket radnummer skriptet stannade på (t.ex. `ERROR 1064 at line 35`).

---

## 4. Åtgärd

### Alternativ A: Full Rollback (Börja om från noll)
*Används i lokal utveckling eller test där du vill ha en ren start.*

1. **Rensa alla tabeller:**
   ```bash
   mariadb -u <användare> -p <databas> < strumpan/database/schema_down.sql
   ```
2. **Kontrollera att det är tomt:**
   ```sql
   SHOW TABLES; -- Ska visa 0 tabeller
   ```
3. **Rätta felet i `schema.sql` och kör igen:**
   ```bash
   mariadb -u <användare> -p <databas> < strumpan/database/schema.sql
   ```

---

### Alternativ B: Rätta & Fortsätt (Behåll befintlig data)
*Används om databasen redan har tabeller med data som inte får raderas.*

1. Låt de tabeller som redan skapats vara kvar.
2. Skapa ett tillfälligt skript (t.ex. `fix.sql`) som bara innehåller den rättade tabellen och resten av de saknade tabellerna.
3. Kör reparationsskriptet:
   ```bash
   mariadb -u <användare> -p <databas> < fix.sql
   ```
4. Uppdatera även `schema.sql` i Git så att hela skriptet fungerar för nästa person.

---

## 5. Verifiering

Proceduren har testats praktiskt:
1. Ett medvetet syntaxfel lades till i `Categories` i `schema.sql`.
2. Vid körning skapades `Customers` och `Addresses`, varpå skriptet kraschade.
3. `SHOW TABLES;` bekräftade det halvfärdiga läget (2 tabeller skapade).
4. `schema_down.sql` kördes och nollställde databasen rent utan foreign key-problem.
5. Felet rättades, `schema.sql` kördes om och alla tabeller skapades felfritt.
