# Word Quest — PWA

A kid-friendly word search game where you tap letters to select/deselect. When you find a word in the **Word Bank**, it’s removed, you score points, and a new word (also hidden in the grid) replaces it. The app installs to your device and works offline.

## Features
- Tap to select/deselect letters; auto-detects correct words from the Word Bank
- Dynamic Word Bank: found words are replaced with new hidden words
- Score by word length; progress saves automatically
- Fixed 10×10 grid with adjustable bank size and difficulty (diagonals/backwards)
- Choose from themed word banks: Kid's Words, Harry Potter's World, Star Wars, or Disney Movies
- Installable PWA with offline support

## Quick Start
1. Unzip this folder.
2. Serve the folder over **HTTPS** or **localhost** (service workers require a secure origin). For example:
   - Python: `python3 -m http.server 8080`
   - Node: `npx serve`
3. Open `http://localhost:8080` in a browser. Click **Install** to add it to your device.

## Customize Words
Edit the lists in `WORD_POOLS` inside `app.js`. Keep words shorter than or equal to the grid size.

## Notes
- The selection must exactly match the letters/positions of a word from the active Word Bank.
- Found words are highlighted in green; you may continue selecting overlapping letters for other words.
- Works offline after the first load.
