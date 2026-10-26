# Data Communication

Course website for **Data Communication** (BSc, 2nd Year, 2nd Semester), Department of Computer Science and Engineering, University of Barishal.

**Md Mahbub E Noor**, Assistant Professor

Reference text: Forouzan, *Data Communications and Networking*, 5th edition.

The site has 14 lectures, 13 interactive labs, 14 explainer videos and 60 interactive slides. It is fully self-contained and works offline: open `index.html` or [click here](https://mahbubnoor.github.io/Data-Communication/) in any browser.

## Contents

| # | Lecture | Lab |
|---|---------|-----|
| 01 | Introduction to Data Communications | none |
| 02 | Data and Signals I | Signal Lab |
| 03 | Data and Signals II | Channel Lab |
| 04 | Transmission Media | Media Lab |
| 05 | Analog-to-Digital Conversion | PCM Lab |
| 06 | Digital-to-Digital Conversion | Line Coding Lab |
| 07 | Digital-to-Analog Conversion | Modulation Lab |
| 08 | Analog-to-Analog Conversion | Analog Modulation Lab |
| 09 | Multiplexing and Spread Spectrum | Multiplexing Lab |
| 10 | Switching | Switching Lab |
| 11 | Data Link Layer I: framing and error control | Error Control Lab |
| 12 | Data Link Layer II: ARQ, HDLC and PPP | ARQ Lab |
| 13 | Multiple Access | Multiple Access Lab |
| 14 | Wireless Communication Basics | Wireless Lab |

## How to use

### Open it

Double-click `index.html` or [here](https://mahbubnoor.github.io/Data-Communication/). Everything the site needs is inside this folder: slides, labs, videos and fonts. It works on lab PCs with no internet.

### Put it on the web

Upload the whole folder unchanged to any static web host:

- a university web server (copy the folder into the public web directory)
- GitHub Pages (see [GitHub Pages](#github-pages) below)
- Netlify or Cloudflare Pages (drag the folder onto the upload page)

No server code or database is needed. When the site is served from a web address, the QR code on each lab slide points to that server's copy of the lab, so students can scan it.

### Interactive slides

The 60 slides marked **Interactive** next to their title work on the website only; they do not work in PowerPoint. Every lecture has at least one, and each has demo steps in its speaker notes.

- While a slider is selected, the arrow keys move the slider. To get arrow-key slide changes back, press <kbd>Esc</kbd> or click the slide background.
- A presenter clicker (<kbd>Page Down</kbd> / <kbd>Page Up</kbd>) always changes slides.
- Slides that play sound only start after a click, and stop when you leave the slide.

### Keys in a lecture

| Key | Action | Key | Action |
|-----|--------|-----|--------|
| <kbd>→</kbd> / <kbd>Space</kbd> | next slide | <kbd>←</kbd> | previous slide |
| <kbd>Home</kbd> / <kbd>End</kbd> | first / last slide | number + <kbd>Enter</kbd> | jump to that slide |
| <kbd>[</kbd> / <kbd>]</kbd> | previous / next lecture | <kbd>L</kbd> | open the lab |
| <kbd>F</kbd> | full screen | <kbd>N</kbd> | speaker notes |
| <kbd>Esc</kbd> | close panels | | |

### Speaker notes and checkpoint answers

The `notes/` folder holds the speaker notes, including checkpoint answers. In a lecture, press <kbd>N</kbd> or the **Notes** button to show them.

> [!WARNING]
> On a public, student-facing site, **delete the `notes/` folder** before uploading. The decks work the same without it; the Notes button simply disappears.

### Light and dark theme

The course home page and the labs follow the computer's light or dark setting. The **Dark / Light** button (top right) overrides it; the browser remembers the choice for all pages. The slides themselves stay light.

## Folders

| Path | Contents |
|------|----------|
| `index.html` | course home page |
| `lectures/` | `L01.html` … `L14.html`: the 14 slide decks |
| `labs/` | the 13 interactive labs |
| `videos/` | the 14 explainer videos |
| `media/` | slide images (QR codes, video posters) |
| `notes/` | speaker notes (delete for a student-facing site) |
| `assets/` | fonts, styles and scripts |

## GitHub Pages

1. Put the contents of this folder at the root of the repository (or in `/docs`).
2. Go to **Settings → Pages → Deploy from a branch** and choose that branch and folder.
3. The empty `.nojekyll` file tells GitHub to serve the files as they are.

## License

- **Course content** (slides, notes, videos, text): [CC BY-NC-SA 4.0](LICENSE.md)
- **Code**: [MIT](LICENSE-CODE.txt)
- **Fonts, libraries and sample photos** keep their own licenses: see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

Textbook examples remain the publisher's copyright.

© 2026 Md Mahbub E Noor
