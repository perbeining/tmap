# ToiletKort (TMap) – kravdokument (udkast 4)

Status: gennemgået med ejeren spørgsmål for spørgsmål og rettet efter en kritisk gennemgang (`docs/toiletkort/gennemgang.md` på branchen `claude/epic-turing-2yec01`). Ejerens stillingtagen til de anbefalinger, der ændrede tidligere beslutninger, står i afsnit 14. Punkter mærket **Besluttet** er bekræftet af ejeren. Punkter mærket **[ANTAGELSE]** er forslag, som ejeren ikke har taget udtrykkeligt stilling til. Punkter mærket **[ÅBENT]** mangler et svar.

## 1. Formål

Et gratis, åbent kort over alle offentlige toiletter i Danmark, som holdes opdateret af brugerne selv.

Den eksisterende tjeneste FindToilet afhænger af, at kommunerne leverer data, og dækningen er derfor ujævn. Dette projekt skal opnå landsdækning ved, at alle kan tilføje og rette toiletter.

- **Besluttet:** Projektet starter som et hobbyprojekt. Det skal være gratis at bruge. Indtjening kan komme på tale senere, men er ikke et mål fra start. Eksklusivt salg af datasættet er fravalgt, fordi data bygger på OpenStreetMap.

## 2. Målgrupper

- Folk på farten, der skal finde et toilet nu: turister, børnefamilier, ældre, chauffører og løbere.
- Mennesker med særlige behov: kørestolsbrugere, forældre med små børn og personer med mave-tarm-sygdomme.
- Bidragydere, der tilføjer og retter oplysninger.

## 3. Afgrænsning

Med i første version:

- Offentligt tilgængelige toiletter, som alle må bruge uden at være kunde.
- Hele Danmark.

**Besluttet:** Hvert toilet har en adgangskategori:

- Offentligt: alle må bruge det.
- For kunder: toilettet ligger i en bar, café eller butik, og man forventes at købe noget.
- Åbent for alle efter aftale: stedet har sagt ja til, at forbipasserende må låne toilettet.

Første version lanceres med de offentlige toiletter. De to andre kategorier findes i datamodellen fra start og fyldes ud af brugerne, efterhånden som kortet bliver brugt. Toiletter i disse to kategorier vises altid med datoen for, hvornår oplysningen sidst er verificeret.

Ikke med i første version:

- Indhentning af bar- og cafétoiletter fra OpenStreetMap eller andre kilder. De kommer kun ind via brugerne.
- Indbygget rutevejledning. Kortet linker i stedet til telefonens kort-app.
- Bedømmelser med stjerner og fritekst-anmeldelser.
- Fotos.
- Egen app til iPhone og Android.

## 4. Platform

- **Besluttet:** En mobilvenlig hjemmeside med kort. Den skal kunne lægges på telefonens hjemmeskærm.
- En app kan komme senere, hvis der er behov.
- **Besluttet:** Dansk og engelsk fra start. Teksterne holdes adskilt fra koden, så et nyt sprog kun kræver en oversættelse.

## 5. Funktionelle krav

### 5.1 Finde et toilet

- F1: Kortet viser toiletter som markører og samler dem i klynger, når der er zoomet ud.
- F2: Brugeren kan centrere kortet på sin egen position, hvis de giver lov.
- F3: Brugeren kan søge på adresse eller by.
- F4: Brugeren kan filtrere på: åbent nu, gratis, handicapadgang, puslebord og adgangskategori. Som standard vises kun offentlige toiletter.
- F4a: Et filter skjuler kun toiletter, hvor oplysningen er kendt og ikke passer. Toiletter med ukendt værdi bliver vist, tydeligt mærket "ukendt", og brugeren kan vælge at skjule dem. Ellers ville filtrene skjule de fleste toiletter, fordi mange i OpenStreetMap kun har en placering.
- F4b: Åbningstider læses i OpenStreetMaps format (`opening_hours`) med et eksisterende bibliotek frem for egen kode.
- F5: Et tryk på en markør viser toilettets oplysninger og et link til rutevejledning i telefonens kort-app.
- F6: Kortet kan bruges uden konto og uden at dele sin position.
- F6a: Ud over kortet findes en liste over de nærmeste toiletter med afstand, åbent eller lukket og pris, sorteret efter afstand. Listen er hurtigst, når det haster, og den er den primære visning for skærmlæsere.
- F6b: Hvert toilet har et link "Ret på OpenStreetMap", så rettelser kan komme ind allerede i trin 1, før projektets egne bidrag findes.

### 5.1a Symboler på kortet

**Besluttet:** Idéen ligner Untappd, hvor brugerne selv melder ind fra de steder, de besøger, blot med toiletter. Symbolet på kortet viser både adgangskategori og hvad brugerne har meldt:

- Offentligt og gratis: ét symbol.
- Andet sted, ubekræftet: ingen har endnu meldt, om man må bruge toilettet.
- Andet sted, bekræftet: brugere har meldt, at de fik lov.
- Andet sted, afvist: brugere har meldt, at de blev afvist.
- Andet sted, både bekræftet og afvist: meldingerne er blandede.
- Ubekræftet forslag: et nyt toilet fra en ny bidragyder, som ingen moderator har set på endnu.

Symbolerne gælder navngivne virksomheder og bygger kun på brugernes meldinger. Derfor gælder:

- F6c: **[ANTAGELSE]** "Afvist" vises først, når mindst 3 forskellige bidragydere har meldt det inden for perioden i F18a. Indtil da vises stedet som ubekræftet.
- F6d: Teksten er neutral og viser, at det er brugernes melding, fx "brugere melder: kun for kunder", ikke en påstand om stedet.
- F6e: Stedets ejer kan via en kontaktformular få rettet oplysninger eller få stedet fjernet fra kortet. En moderator behandler henvendelsen.

Symbolet beregnes automatisk ud fra brugernes meldinger, se F18a og F18b. Flere tilstande kan komme til.

### 5.2 Bidrage

- F7: En bidragyder kan foreslå et nyt toilet ved at sætte en markør og udfylde oplysningerne.
- F8: En bidragyder kan rette oplysninger på et eksisterende toilet.
- F9: En bidragyder kan melde, at et toilet er lukket, nedlagt eller ude af drift.
- F10: Bekræftelse af, at et toilet findes og kan bruges, sker kun gennem en indtjekning (F11b), så der er én måde at bekræfte på, og den kræver, at man er på stedet.
- F11: **Besluttet:** Bidrag kræver en konto med e-mail. Brugeren logger ind via et link sendt til sin e-mail, uden adgangskode. At bruge kortet kræver ingen konto.
- F11a: **Besluttet:** Login bygges med et kendt og udbredt modul frem for egen kode. Forslaget er Better Auth med magic link, Cloudflare D1 som database og Resend til afsendelse af mail, da ejerens hjemmeside allerede bruger D1 og Resend. Valget efterprøves mod modulets dokumentation, før koden skrives.

### 5.2a Indtjekning, mærker og profil

**Besluttet:** Disse tre dele er med i første version.

- F11b: En bidragyder kan tjekke ind på et toilet med ét tryk og melde udfaldet. Udfaldene afhænger af adgangskategorien:
  - Offentligt toilet: "i brug" eller "lukket eller ude af drift".
  - For kunder og åbent for alle efter aftale: "fik lov" eller "blev afvist".
- F11c: En indtjekning opdaterer toilettets symbol og datoen for seneste verificering og tæller med i bidragyderens status.
- F11d: Bidragydere optjener mærker for deres bidrag. Mærker gives for kvalitet frem for mængde: kun godkendte bidrag og bidrag, som andre bidragydere senere har bekræftet, tæller, og bidrag, der afvises eller rulles tilbage, trækker fra.
- F11e: Hver bidragyder har en profil med egne indtjekninger og mærker.
- F11f: **Besluttet:** Indtjekninger og profil er private og kan kun ses af bidragyderen selv. Offentligt vises kun det samlede resultat pr. toilet, uden navne.
- F11g: **Besluttet:** En indtjekning kræver, at brugeren er i nærheden af toilettet (forslag: inden for 100 meter), så meldinger ikke kan afgives hjemmefra. Kontrollen gælder kun indtjekninger, ikke nye toiletter og rettelser.
- F11h: Kontrollen sker på serveren. Serveren modtager positionen og den præcision, telefonen selv oplyser, afgør indtjekningen og kasserer koordinaterne. Er præcisionen dårligere end grænsen, som den ofte er indendørs, bruges den oplyste præcision som margen.
- F11i: Kontrollen stopper tilfældig snyd, men ikke bevidst forfalsket position. Den er derfor ét værn blandt flere og ikke en garanti.

Ikke med i første version: venner, nyhedsstrøm og bedømmelser med stjerner og tekst.

### 5.3 Moderation

- F12: **Besluttet:** Bidrag modereres af mennesker. Ejeren er moderator fra start, og frivillige brugere skal kunne melde sig som moderatorer, så arbejdet deles af flere.
- F12a: **Besluttet:** Ejeren udpeger moderatorerne. En betroet bidragyder kan melde sig som moderator, og ejeren siger ja eller nej.
- F12c: En moderator kan ikke godkende sine egne bidrag. Ejeren er undtaget, så længe der kun er én moderator.
- F12d: Ejeren kan fratage en moderator rollen og se en log over, hvad hver moderator har godkendt og afvist.
- F12b: **Besluttet:** Bidragydere har en status, der afhænger af deres tidligere bidrag:
  - Ny bidragyder: et nyt toilet vises straks på kortet som "ubekræftet forslag" med sit eget symbol, efter at automatikken har afvist det åbenlyse (punkter uden for Danmark, dubletter og stødende tekst). En moderator kan godkende eller fjerne det. **[ANTAGELSE]** Rettelser til eksisterende toiletter og sletninger venter stadig på en moderator, fordi kortet ellers skulle vise to værdier for samme felt.
  - Betroet bidragyder (efter 5 godkendte ændringer): små rettelser vises straks. Nye toiletter og sletninger venter stadig på en moderator. **[ANTAGELSE]** De 5 ændringer skal gælde mindst 3 forskellige toiletter, så status ikke kan opnås med fem små rettelser samme sted.
  - Udelukket bidragyder: dårlige bidrag fører til, at bidragyderen ikke længere kan bidrage.
- F13: **Besluttet:** Regler for udelukkelse og tab af status:
  - En moderator kan udelukke en bidragyder med det samme ved tydeligt hærværk.
  - En bidragyder udelukkes automatisk efter 3 afviste bidrag i træk.
  - Moderatoren vælger en årsag ved afvisning. Bidrag afvist som ærlige fejl, fx en dublet, tæller ikke med.
  - En betroet bidragyder, der får en rettelse rullet tilbage som hærværk, bliver ny bidragyder igen.
  - En udelukket bidragyder kan klage til ejeren på en mailadresse og blive lukket ind igen. Der bygges ingen klagefunktion i første version.
- F13a: **Besluttet:** Fotos er ikke med i første version. De kommer som en senere udvidelse og kræver da godkendelse af hvert foto, fjernelse af sted- og enhedsoplysninger i billedfilen, en licens for billeder (ODbL dækker kun databasen) og en nem vej til at få et foto fjernet.
- F14: Alle ændringer gemmes i en historik, og en moderator kan rulle en ændring tilbage.
- F15: Spam og hærværk bremses med bekræftet e-mail, begrænsning pr. konto og pr. IP-adresse i et tidsrum og Cloudflare Turnstile ved oprettelse af konto. Enheden genkendes ikke, så kravet om kun nødvendige cookies i afsnit 8 holder.
- F16: Moderatorer har en side med ventende bidrag og seneste ændringer.

### 5.4 Friske data

- F17: Hvert toilet viser, hvornår oplysningerne sidst blev bekræftet.
- F18: **Besluttet:** Offentlige toiletter, der ikke er bekræftet i 12 måneder, markeres som "ikke bekræftet for nylig". De bliver stående på kortet.
- F18a: **Besluttet:** Toiletter i kategorierne "for kunder" og "åbent for alle efter aftale" falder tilbage til "ubekræftet" efter 6 måneder uden indtjekning.
- F18b: **Besluttet:** Symbolet beregnes ud fra meldingerne i den seneste periode, så nye meldinger vejer tungere end gamle.
- F19: **Besluttet:** Tre uafhængige meldinger om, at et toilet er nedlagt, skjuler det, indtil en moderator har set på det.

## 6. Oplysninger pr. toilet

Skal udfyldes:

- Placering (koordinater).
- Navn eller kort beskrivelse af stedet.

**[ANTAGELSE]** Faste felter, som kan stå som "ukendt":

- Åbningstider, herunder døgnåbent og sæsonåbent (`opening_hours`).
- Gratis eller betaling, og i givet fald pris og betalingsform (`fee`).
- Handicapadgang: ja, delvist eller nej (`wheelchair`), med valgfri uddybning, fx trin ved indgangen.
- Puslebord (`changing_table`).
- Adgangskategori: offentligt, for kunder eller åbent for alle efter aftale (besluttet).
- Nøgle eller kode (besluttet): om toilettet kræver nøgle eller kode, fx Euronøglen, og hvor man får den.
- Type (besluttet): bemandet, automatisk toilet, almindeligt toilet, mult eller tørkloset.

Felterne bruger OpenStreetMaps egne navne og værdier, hvor de findes, så data kan flettes og senere sendes tilbage uden oversættelse.

**[ANTAGELSE]** Selve dørkoden gemmes og vises ikke. Kortet oplyser kun, at der kræves en kode, og hvor man får den, så en ejer ikke oplever sin kode offentliggjort.

Valgfrit:

- Kønsneutralt.
- Fri tekst, fx "indgang fra gården".

Systemfelter:

- Kilde (OpenStreetMap, kommune eller bruger).
- Oprettet, sidst ændret og sidst bekræftet.
- Status: aktiv, afventer godkendelse, midlertidigt lukket eller nedlagt.

## 7. Data og licens

- **Besluttet:** Kortet fyldes fra start med toiletter fra OpenStreetMap (`amenity=toilets`), så det ikke er tomt på dag ét. Et ubekræftet tal fra en søgning peger på omkring 3.800 danske toiletter, hvoraf mange kun har en placering.
- OpenStreetMap-data er under licensen ODbL. Det betyder, at projektets samlede datasæt skal deles under samme licens, og at OpenStreetMap skal krediteres synligt.
- Kommunale åbne data kan kun blandes ind, hvis deres licens er forenelig med ODbL. Det skal tjekkes for hver kilde.
- Bidragydere skal acceptere, at deres bidrag udgives under samme åbne licens.
- Datasættet skal kunne downloades frit.
- **Besluttet:** I første version gemmes brugernes rettelser kun i projektets egen database. Nye data hentes fra OpenStreetMap med faste mellemrum og flettes med projektets egne rettelser. At sende rettelser tilbage til OpenStreetMap kan tilføjes senere.
- Fletteregler, når data hentes fra OpenStreetMap igen **[ANTAGELSE]**:
  - Hvert toilet gemmer sit OpenStreetMap-ID og de værdier, der sidst blev hentet, pr. felt.
  - Et felt, ingen bidragyder har rettet, følger OpenStreetMap.
  - Et felt, en bidragyder har rettet, beholder projektets værdi. Ændrer OpenStreetMap senere samme felt, lægges forskellen i moderatorernes kø.
  - Sletter OpenStreetMap et toilet, som bidragydere har rettet eller tjekket ind på, bliver det stående og lægges i køen. Ellers markeres det som nedlagt.
  - Et nyt toilet i OpenStreetMap inden for 25 meter af et brugeroprettet toilet lægges i køen som mulig dublet i stedet for at blive oprettet.
  - Skifter et toilet ID i OpenStreetMap, genkendes det på placering og felter og behandles som det samme toilet, hvis der er ét entydigt match.
- **[ÅBENT]** Virker findtoilet.dk og appen stadig, og kan udvikleren kontaktes om samarbejde eller data? Ejeren tjekker siden senere. Punktet blokerer ikke første version, som bygger på OpenStreetMap alene.

## 8. Persondata (GDPR)

- Når kortet bruges til at finde et toilet, behandles brugerens position kun i browseren.
- Ved en indtjekning sendes positionen til serveren, som kontrollerer afstanden og kasserer koordinaterne. De gemmes ikke.
- En indtjekning gemmes som "bidragyder, toilet, tidspunkt, udfald". Det er en historik over, hvor personen har været. **[ANTAGELSE]** Koblingen til bidragyderen slettes efter 12 måneder, og derefter bevares kun de samlede tal pr. toilet.
- Bidragyderes e-mailadresser gemmes og er persondata. De bruges kun til login og til beskeder om brugerens egne bidrag, og de vises aldrig offentligt.
- En historik over en persons toiletbesøg viser, hvor personen har været, og kan afsløre helbredsforhold. Indtjekninger skal derfor behandles som følsomme: de er private, bruges kun til at beregne toilettets status og bidragyderens mærker, og brugeren kan slette dem.
- En bidragyder kan få slettet sin konto. Bidragene bliver stående uden tilknytning til personen.
- IP-adresser bruges til at begrænse misbrug og gemmes kun kortvarigt.
- Der skal være en privatlivspolitik og en kontaktadresse.
- Kun nødvendige cookies, så et samtykkebanner kan undgås.

## 9. Ikke-funktionelle krav

- Kortet skal være brugbart inden for få sekunder på en mobilforbindelse.
- Siden skal kunne bruges med skærmlæser og tastatur og have tilstrækkelig kontrast (WCAG 2.1 AA).
- Driften skal være billig nok til, at én person kan betale den.
- Datasættet skal sikkerhedskopieres automatisk.

## 10. Drift og organisering

- **Besluttet:** Ejeren driver projektet alene fra start. Ejeren er erfaren udvikler og bygger med Claude Code.
- **Besluttet:** Projektet hostes på Cloudflare og flyttes kun, hvis det bliver nødvendigt. Driften skal kunne holdes inden for gratis eller meget billige niveauer.
- **Besluttet:** Ejeren kan bruge 0-5 timer om ugen på driften. Projektet skal derfor kunne køre i uger uden manuel indsats, og alt, der kan automatiseres, skal automatiseres.
- **Besluttet:** Nye toiletter står ikke i en skjult kø. De vises straks som "ubekræftet forslag", så intet står stille, når ingen moderator har tid. 
- **Besluttet:** Projektet får sit eget repo. Kravdokumentet flyttes dertil, når repoet er oprettet.
- **Besluttet:** Projektet hedder ToiletKort, med kortnavnet TMap.
- **Besluttet:** I starten ligger det på subdomænet `tmap.beining.dk`. Målet er domænet `tmap.dk`. Subdomænet holder projektet adskilt fra ejerens private dashboard på `beining.dk`, som er beskyttet af en login-cookie på det domæne.
- Login-cookies fra ToiletKort må kun gælde `tmap.beining.dk` og ikke hele `beining.dk`.
- Løsningen skal bygges, så et skift fra `tmap.beining.dk` til eget domæne ikke kræver ændringer i koden, og så gamle links sendes videre til den nye adresse.
- **[ÅBENT]** Det er ikke undersøgt, om `tmap.dk` er ledigt, eller om navnet TMap kolliderer med eksisterende varemærker. TMAP er navnet på en udbredt testmetode, og T map er en koreansk navigationsapp.

## 11. Leveranceplan

**Besluttet:** Første version bygges i tre trin, og projektet lanceres offentligt efter trin 1.

- Trin 1, kortet: de offentlige toiletter fra OpenStreetMap på et mobilvenligt kort med søgning, filtre og rutelink, på dansk og engelsk. Ingen konti. Offentlig lancering.
- Trin 2, bidrag: konti med e-mail, nye toiletter og rettelser, bidragydernes status og moderationen.
- Trin 3, indtjekning: indtjekning med positionskontrol, symbolerne for bekræftet og afvist, mærker og profil.

## 12. Succeskriterier

- **[ANTAGELSE]** Trin 1: kortet bliver brugt. Mål: 500 besøgende om måneden tre måneder efter lancering.
- **[ANTAGELSE]** Trin 2: bidragene kommer. Mål: 50 bidragydere med mindst ét godkendt bidrag et halvt år efter trin 2.
- **[ANTAGELSE]** Trin 3: data bliver bekræftet. Mål: 500 toiletter med mindst én indtjekning et år efter trin 3.

Det tidligere mål om ét toilet i alle 98 kommuner er fjernet, fordi importen fra OpenStreetMap sandsynligvis opfylder det fra dag ét. Tallene er gæt og skal justeres, når trin 1 har vist den reelle brug.

## 13. Risici

- For få bidragydere, så data forældes. Det er projektets største risiko. Modtræk: indtjekning med ét tryk, synlig dato for seneste bekræftelse, linket "Ret på OpenStreetMap" fra trin 1 og kontakt til organisationer med en direkte interesse i kortet, fx patient- og handicapforeninger.
- Klager fra virksomheder og hævnmeldinger. Modtræk: minimumsantal meldinger, neutral tekst og en vej for stedets ejer (F6c-F6e).
- En fejl i siden lader fremmed kode køre hos en bruger (XSS), fordi siden viser tekst fra fremmede. Modtræk: al brugertekst vises som ren tekst, en stram Content Security Policy, og et eget subdomæne adskilt fra ejerens private dashboard.
- Hærværk og spam. Modtræk: konti, bidragydernes status, godkendelse af nye toiletter og historik.
- Moderationen bliver for stor en opgave for én person. Modtræk: frivillige moderatorer, som ejeren udpeger, og betroede bidragydere, hvis små rettelser ikke kræver godkendelse.
- Licenskonflikt mellem datakilder. Modtræk: licens tjekkes, før en kilde tages ind.
- Forkerte oplysninger om handicapadgang kan give nogen en reel ulempe. Modtræk: feltet vises som "ukendt" frem for et gæt, og kilden vises.

## 14. Anbefalinger fra gennemgangen, som ejeren har taget stilling til

1. **Adresse.** Ændret til `tmap.beining.dk`. Se afsnit 10.
2. **Kø i moderationen.** Nye toiletter vises straks som "ubekræftet forslag". Se F12b.
3. **Omfang.** Fotos er taget ud af første version, og klager går til en mailadresse. Mærker, profil og moderatorroller bliver.
4. **Rettelser direkte til OpenStreetMap.** Afvist for første version. Rettelser gemmes i projektets egen database, fordi bidragydernes status og moderationen kun virker, når projektet selv styrer data. Fletteregler står i afsnit 7. Retningen er, at betroede bidragyderes godkendte rettelser senere kan sendes videre til OpenStreetMap.
