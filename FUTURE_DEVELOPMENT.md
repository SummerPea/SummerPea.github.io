# Future Development Plan

This website is a personal portfolio for Haolin Zhang’s creative work, including novels, games, songs, apps, and other projects. The current site is a lightweight static HTML/CSS/JavaScript site with a blue visual theme, a home page, an “About Me” page, and an expandable/searchable novels page.

## Current status

### Already present

- Home page with an introduction and recent-work cards.
- Navigation with a “My Works” dropdown.
- About page with sections for background, hobbies, goals, and contact.
- Novels page with expandable descriptions, title filtering, and download buttons.
- Shared styling in `styles.css` and shared interactions in `script.js`.
- Profile image at `images/avatar.jpg`.

### Known gaps

- The navigation links to `games.html` and `apps.html`, but those pages do not exist yet.
- Several referenced images and downloads are placeholders or missing, including home-page previews, search icon, novel icons/covers, and downloadable files.
- The About page still contains bracketed placeholder text.
- The home page title and project descriptions are generic and do not yet communicate a clear portfolio identity.
- The site is not yet fully responsive or keyboard-accessible.
- Content is hard-coded into HTML, so adding or updating projects requires editing page markup.

## Priorities

### Phase 1 — Make the current site complete

1. Replace all placeholder biography, hobby, goal, and contact text with real information.
2. Decide which projects are currently public and remove or hide unfinished entries.
3. Add the missing assets referenced by the pages, or update the markup to use assets that actually exist.
4. Replace fake download targets with real files and verify that every download button works.
5. Either create `games.html` and `apps.html` or remove those navigation links until the pages are ready.
6. Update page titles, descriptions, image alt text, and project copy so every page accurately represents the portfolio.

**Definition of done:** every visible link works, no placeholder text remains, no missing images appear, and a visitor can understand what each project is and how to access it.

### Phase 2 — Improve the portfolio experience

**Status:** Initial implementation complete. The site now uses a shared project catalog in `data/projects.js`, generated project cards, an All Works page with filters, category pages for novels, games, apps, and music, and a reusable project-detail page.

1. Add a dedicated project card system for novels, games, songs, apps, and miscellaneous work.
2. Give each project consistent metadata:
   - Title
   - Type and genre
   - Short summary
   - Status, such as idea, in progress, released, or archived
   - Date or year
   - Tools or technologies
   - Links to read, play, listen, download, or view
3. Add project detail pages for substantial works instead of placing all information in expandable cards.
4. Add clear calls to action on the home page, such as “Read my novels,” “Play my games,” or “Listen to my music.”
5. Add a featured-project section and a simple archive for older work.
6. Add social links or a contact form only if they will be actively maintained.

**Definition of done:** a visitor can browse by creative medium, quickly identify a project’s status, and reach the relevant work in one or two clicks.

### Phase 3 — Accessibility, responsive design, and quality

**Status:** Initial implementation complete. The site now includes keyboard-friendly menus and controls, live search feedback, visible focus styles, responsive layouts, reduced-motion support, image dimensions to reduce layout shift, and a browser preview verification pass.

1. Add a mobile navigation pattern; the current hover-only dropdown is difficult to use on touch devices.
2. Make expandable novel items keyboard-operable with buttons, focus states, and appropriate ARIA attributes.
3. Ensure search filters as the visitor types and provides a useful empty-state message when nothing matches.
4. Check color contrast, heading order, link labels, image alt text, and visible keyboard focus.
5. Add responsive breakpoints for small screens, especially for navigation, project cards, and download controls.
6. Optimize images, use descriptive filenames, and add lazy loading to non-critical images.
7. Test the site in current desktop and mobile browsers.

**Definition of done:** the site remains usable with a keyboard, on a phone-sized screen, and with images disabled or assistive technology enabled.

### Phase 4 — Maintainability and publishing

**Status:** Initial implementation complete. The repository now includes `README.md`, a dependency-free validator, GitHub Actions checks, a custom `404.html`, and organized category-based downloads.

1. Remove the repeated spreadsheet helper script currently embedded at the top of each HTML page unless it is genuinely required.
2. Create a small shared content model, such as JSON files or JavaScript objects, for project metadata.
3. Generate repeated project cards from that content model to avoid inconsistent hand-edited markup.
4. Add a `README.md` with local preview instructions and a short explanation of the folder structure.
5. Add a lightweight validation checklist or GitHub Actions workflow for broken links, formatting, and basic HTML checks.
6. Add a custom 404 page and verify GitHub Pages configuration.
7. Keep large downloadable files and source assets organized in clearly named folders.

**Definition of done:** adding a new project is a predictable, low-risk change, and the site can be checked before publishing.

## Suggested content structure

```text
/
├── index.html
├── about.html
├── novels.html
├── games.html
├── apps.html
├── music.html
├── 404.html
├── README.md
├── styles.css
├── script.js
├── data/
│   └── projects.js
├── images/
│   ├── avatar.jpg
│   ├── projects/
│   └── icons/
├── scripts/
│   └── validate_site.py
├── .github/workflows/
│   └── validate.yml
└── downloads/
    ├── novels/
    ├── games/
    └── apps/
```

The exact structure can stay simpler if the number of projects remains small. The important distinction is between page code, project metadata, display images, downloadable files, and maintenance checks.

## Recommended next milestone

The next implementation should be a focused “portfolio cleanup” release:

1. Replace the About page placeholders.
2. Decide on the real initial set of projects.
3. Add or remove every referenced page, image, and download so there are no broken links.
4. Improve the home page to feature those real projects.
5. Add basic mobile and keyboard support to the navigation and novel interactions.

This milestone creates a trustworthy foundation. New creative categories, richer project pages, and automation can then be added without carrying placeholder content or broken references forward.

## Long-term ideas

- A unified “Works” index with filters by medium, genre, and status.
- ~~Embedded audio players for songs and soundtracks.~~ Implemented with the shared `audio` project metadata field and HTML audio controls.
- ~~Browser-playable game demos where practical.~~ Implemented with the Sprint & Sparkle and Sparkling Soccer browser demos; additional games can add a supported `demo` configuration when ready.
- A changelog or development journal for works in progress.
- Versioned downloads with release notes.
- ~~Atom feed for new work updates.~~ Implemented in `feed.xml`; add a new Atom `<entry>` whenever a public work is released or meaningfully updated.
- Optional dark mode that preserves readable contrast.
- Analytics that respect visitor privacy, if visitor statistics become useful.

## Working principles

- Publish only work and personal information that is ready to be public.
- Prefer clear, complete project pages over a large number of empty categories.
- Keep the site fast and usable without a framework unless the portfolio’s complexity justifies one.
- Treat every published link and download as part of the visitor experience: verify it before release.
