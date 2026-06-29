<p align="center" style="pointer-events: none;">
  <img src="./build/icons/128x128@2x.png" width="150px">
</p>
<h3 align="center">Intrigue</h3>
<p align="center">Organize literature into ideas, fast.</p>
<p align="center">
  <a href="https://intrigue-app.github.io/?document=tutorial">Web demo (v1.0 Alpha)</a> | 
  <a href="https://github.com/shaunabanana/intrigue/releases/tag/v1.0.0-alpha">Download v1.0 Alpha (Unstable)</a> | 
  <a href="https://github.com/shaunabanana/intrigue/releases/tag/v0.1.6">Download older version (v0.1.6)</a>
  <br />
  <a href="https://github.com/shaunabanana/intrigue/issues">Report Bugs</a> | 
  <a href="https://discord.gg/PEVwFEmf7P">Join Discord</a>
</p>

> Binaries now available for Windows, macOS, and Linux. Development is underway for a web-based version, with P2P collaborative editing!
> 
> Before using Intrigue, you might consider using [Snowball](https://github.com/shaunabanana/snowball) to find and screen relavant literature🔎

## What is this?
Intrigue lets you quickly organize the papers you read alongside your thoughts in a visual & clean manner.
Check out the [web demo](https://intrigue-app.github.io/?document=PC7uDb6ubL7f6CRwvJfsx), which also serves as a tutorial.

Features include:
* (v1.0+) **Offline-first distributed collaborative editing**. Create on Desktop, share to web. No central server, you keep and distribute your own data.
* (v1.0+) **Zotero Quick Copy translator** allows you to copy an item in Zotero, and paste it in a new Intrigue note to create a Reference. Upon double-clicking, it will lead you back to the item in Zotero. You can [**download the translator here**](https://github.com/shaunabanana/intrigue/releases/download/v1.0.0-alpha/Intrigue.js).
* Automatically pull metadata of **papers (using DOI), books (using ISBN), BibTeX, and web links** using [Citation.js](https://citation.js.org).
* Double clicking reference nodes takes you to a PDF at you-know-where.
* Full **WYSIWYG** markdown support in the notes, powered by [TipTap](https://www.tiptap.dev).
* Everything can be **grouped, snapped, and connected**.
* _COMING SOON: Import BibTeX files exported from a literature search or other tools like Zotero._
* _COMING SOON: Export papers into a BibTeX to directly use in your paper-writing process._

### Build Electron app
```
npm run build
```

### Build web interface
```
npm run web:build
```

Set `VITE_WEB_BASE_URL` to control generated share links in both Electron and web builds.

### Lints and fixes files
```
npm run lint
```

## I found a bug!
Please file an issue [here](https://github.com/shaunabanana/intrigue/issues), or email me at shengchenzhang1207@gmail.com.

## Support me
<a href="https://www.buymeacoffee.com/shengchen" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" height="41" width="174"></a>

[爱发电](https://afdian.net/@shaunabanana)

<img width="250" src="./assets/afdian.jpg" alt="Logo">
