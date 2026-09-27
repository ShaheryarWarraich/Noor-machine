# Plan: understanding Video DownloadHelper and building our own

Status: plan only, nothing built yet.

## Approach in one line

Study how Video DownloadHelper (VDH) behaves, write down how it works, then write
our own extension from scratch. We do not copy VDH's code. That is the
"clean-room" approach: one step studies the product, and the build step works
only from our written notes.

## Hard limits

- **No DRM circumvention.** DRM (Digital Rights Management) is encryption such as
  Google's Widevine, which Netflix, Disney+ and Prime use. Breaking it is illegal
  in most countries, and VDH does not do it either.
- **No copying VDH source code.** Its extension code is proprietary (assumed; to be
  checked in step 1).
- **YouTube is out of scope for a Chrome build.** From memory, not checked: the
  Chrome Web Store rejects extensions that download from YouTube.

## Glossary

| Term | Meaning |
|---|---|
| Extension | A small program that runs inside the browser. Its files are zipped into a `.crx` (Chrome) or `.xpi` (Firefox) package. |
| `manifest.json` | The extension's ID card. It lists the permissions the extension asks for and the scripts it runs. |
| MV3 | Manifest V3, the current rules for Chrome extensions. Background code runs as a "service worker", a script that sleeps when idle. |
| Content script | Extension code that runs inside a web page and can read the page's HTML, for example its `<video>` tags. |
| `webRequest` | A browser interface that lets an extension see every network request a page makes. |
| HLS / `.m3u8` | Apple's streaming format. A text "playlist" lists many small video chunks called segments. |
| DASH / `.mpd` | The open streaming standard. It is like HLS, but it usually sends video and audio as separate streams. |
| `blob:` URL | A video the page built in memory from fetched chunks. It cannot be downloaded directly. |
| Native messaging | The way an extension talks to a normal desktop program installed on the computer. |
| ffmpeg | A free command-line tool that converts and merges video files. |
| Minified | Code squashed onto a few lines with short variable names so it is hard to read. |

## Unknowns

1. What is this for: learning, a personal tool, or a public product? *Changes how
   deep we go and how careful we must be about legal risk.*
2. Which browser: Chrome, Firefox, or both? *Firefox lets an extension read
   response bodies (`filterResponseData`). Chrome MV3 does not, so the design differs.*
3. Which sites matter to you? *Each hard site needs its own handler.*
4. Is this related to the Noor & Machine website in this repo? *Assumed not; it
   would live in its own folder or repo.*

## Phase 1: Static study (read the package)

1. Download the VDH package for Chrome and for Firefox. Unzip each one (a `.crx`
   has a small header, and a `.xpi` is a plain zip).
2. Read `manifest.json`. Record the permissions (`webRequest`, `downloads`,
   `nativeMessaging`, host permissions), the background worker, the content
   scripts, and the name of the native host.
3. Run the minified JavaScript through a formatter (Prettier) so it is readable.
   Check for source maps (`.map` files), which contain the original readable code.
4. Record the licences. Assumed, from memory: the companion app "VdhCoApp" is open
   source on GitHub (`aclap-dev/vdhcoapp`, GPL-2.0) and wraps ffmpeg. If this is
   true, we can read and reuse it legally under its licence, which is the easiest
   part of the job.

Output: `notes/architecture.md`, a written description of the parts. It contains
no copied code.

## Phase 2: Dynamic study (watch it work)

1. Load VDH in Chromium. Open DevTools (the browser's built-in inspector) on its
   service worker and on the page.
2. Visit test pages of each type and record what triggers detection:
   - a direct `.mp4` file
   - a `<video src=...>` tag
   - an HLS stream (public test streams exist)
   - a DASH stream
   - a `blob:`-backed player
3. Watch the messages it sends to the companion app (native messaging traffic).
4. Note what happens with a DRM stream. Expected: it shows the video but refuses
   to download it.

Output: a table in the notes listing each media type with its detection signal,
its download method, and whether the companion app is needed.

## Phase 3: Expected architecture (a guess until phases 1 and 2 confirm it)

```
DETECT            ->  CLASSIFY           ->  RESOLVE                ->  DOWNLOAD / MERGE
webRequest sees      by MIME type or        parse .m3u8/.mpd,          direct: chrome.downloads
video/*, .m3u8,      file extension         list quality options       HLS: fetch segments, join
.mpd responses;                                                        DASH: fetch video+audio,
content script                                                         mux with ffmpeg
finds <video>                                                          (companion app or ffmpeg.wasm)
```

## Phase 4: Build our own, one milestone at a time

1. **M1, detector (cheap prototype, about 1 day):** an MV3 extension whose popup
   lists every media URL on the current page. This shows whether detection
   works on the sites you care about before we build anything else.
2. **M2, direct download:** a "Download" button for plain MP4/WebM using
   `chrome.downloads`.
3. **M3, HLS:** parse the playlist, let the user pick a quality, fetch the
   segments, and join them into one `.ts` or `.mp4` file inside the browser.
   Candidate libraries are mux.js and ffmpeg.wasm (ffmpeg compiled to run in
   the browser).
4. **M4, DASH:** separate video and audio need muxing (combining them into one
   file). Either use ffmpeg.wasm (no install, but slow and memory-hungry), or a
   small native companion app that calls ffmpeg (fast, but the user must install
   it).
5. **M5, site handlers:** only for sites you name, and only where the video is
   not DRM-protected.

## Test matrix

For each milestone, test each media type (mp4, HLS, DASH, blob, DRM) in both
Chrome and Firefox. Pass means the file plays in VLC, or for DRM content, that
the extension declines cleanly.

## Where the claims in this plan come from

- VDH detects videos through network requests and the page's HTML: **inferred**
  from how the product behaves; phase 2 confirms it.
- VdhCoApp is open source under GPL-2.0: **assumed** from memory; phase 1 step 4
  checks it.
- The Chrome Web Store bans YouTube downloaders: **assumed** from memory.
- Chrome MV3 cannot read response bodies, while Firefox can: **inferred** from
  API knowledge; not re-checked this session.
