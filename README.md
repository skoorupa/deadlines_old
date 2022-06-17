# deadlines
## Ważne
Deadlines jest w trakcie refactoringu - nowa wersja ma w planach używać TypeScript, MongoDB oraz - byc może - React/Angular.
Na ten moment ta wersja może nie być do końca stabilna. Proste zadania powinny działać bezproblemowo.
## Czym jest deadlines?
Deadlines jest aplikacją to-do z wbudowanymi przypomnieniami. Wyróżnia się tym, że jest aplikacją stworzoną do działania cały czas w tle.
## Jak pobrać deadlines z GitHub?
```
git clone https://github.com/skoorupa/deadlines_old.git
```
## Instalacja
```
cd source
npm install
```
## Uruchamianie
```
cd source
npm start
```
## Tworzenie instalatora 
### Wersja Windows 64-bit:
```
cd source
npm run package_win64
npm run setup_win64
```
Instalator jest w `build/release-builds/windows-installer/64bit`
### Wersja Windows 32-bit:
```
cd source
npm run package_win32
npm run setup_win32
```
Instalator jest w `build/release-builds/windows-installer/32bit`
