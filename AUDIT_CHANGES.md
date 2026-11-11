# Course audit: changes (November 2026)

All 14 decks (465 slides, speaker notes included) and all 13 labs were checked. Every number on the slides and in the checkpoint answers was recomputed by script. Layout was measured in a browser.

## Mistakes corrected

| Lecture | Slide | Problem | Fix |
|---|---|---|---|
| L13 | 10, 12 | ALOHA survivors were computed with the textbook's method (frames sent × S), which is wrong unless G = 1. The slide-11 widget already said so, so the deck contradicted itself. | Survivors per second = 1,000 × S. Pure ALOHA: 135 / 184 / 152. Slotted ALOHA: 368 / 303 / 195. The book's figures are shown in brackets. Checkpoint answers updated (Q2 = 303; 2,000 frames/s gives 37). |
| L12 | 22 | Table said Stop-and-Wait sends 11 frames in 80 time units. The ARQ Lab with the same settings gives 84. | Changed to 84, in the slide and the notes. |
| L06 | 16 | The 2B1Q table is the fixed ISDN mapping, but the notes called it Forouzan's. Forouzan's Fig. 4.10 mapping depends on the previous level. | Both tables are now shown and labelled, with a worked example for each in the notes. |
| L10 | 19 | Said "chooses an unused incoming VCI for the next link". | Now says the VCI is chosen for the link the request came in on (the switch's incoming link). |
| L11 | 25 | Generator rule "has more than one term". | Now "at least two terms, one of them 1 (x⁰)", as in Forouzan. |
| L11 | 31 | "Hamming (7,4) detects 2 errors" could be read as detecting 2 and correcting 1 at the same time. | Now "2 errors (if used only to detect)". |
| L02 | 8 | "220 V is an average-type (rms) value" (rms is not an average). | Now "the effective (rms) value, not the peak". |
| L09 | 15 | Pointed to "slide 20" for statistical TDM. | Corrected to slide 21. |
| L01 | 20 | The OSI Presentation and Session layers were never explained. | One line added for each. |
| L12 | several | Go-Back-N's 2^m − 1 and Selective Repeat's 2^(m−1) looked almost identical at slide size. | Selective Repeat is now written 2^(m−1), with "half of 2^m" added. |

Speaker notes:

- Stale slide numbers were corrected in L05, L06, L07, L08, L09 and L10.
- Every lab slide's note said the lab is private or must be shared before class. The labs are bundled offline, so these notes now explain the button and the QR code.
- L14 pointed to a START_HERE.html file that does not exist. It now points to the course home page.

## Readability for beginners

- **Text size:** on 359 of the 363 static slides, body, table and diagram text was enlarged (usually ×1.3, up to ×1.5 on checkpoint slides) to use the empty lower part of each slide. Each slide was checked in a browser so that nothing overflows, clips or overlaps. Body text is now about 39 px (previously 30) and tables about 31 px (previously 24) on the 1920 × 1080 slide. Titles, diagrams and diagram labels are unchanged.
- **New figures:**
  - L08 slide 7: the AM spectrum now shows the message's shape copied (upper sideband) and mirrored (lower sideband), with a "shift up by fc" arrow.
  - L08 slide 21: carrier names, a guard-band pointer and a frequency axis.
  - L09 slide 4: frequency–time pictures for FDM, WDM and TDM.
  - L13 slide 30: the Walsh rule drawn as a 2 × 2 block matrix.
- **Label collisions fixed:**
  - 8-QAM, BPSK and OOK constellations (L07)
  - d_min circles (L11)
  - ALOHA axis (L13)
  - path-loss chart (L14)
  - formulas and table cells that wrapped: Shannon formula (L03) and QAM names (L07)
- **Small text in interactive widgets and labs:** widget labels below 20 px were raised to 20 px, and the ARQ Lab's time-axis numbers were raised from 12 px to 14 px.

## Checked and found correct

- All worked examples and checkpoint answers in L01–L14.
- Tables: no row/column mismatches.
- No text outside its slide.
- No broken images.
- No script errors on any slide or lab page.
- Labs: no horizontal overflow at 1366 px or 1920 px width.

## PowerPoint copies

The PowerPoint files are image-based, so they were rebuilt: every static slide now carries the corrected, enlarged image and the updated speaker notes. The embedded videos are kept.
