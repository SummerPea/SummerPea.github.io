# Haolin Zhang — Creative Portfolio

This repository contains the static personal portfolio for Haolin Zhang. It is built with plain HTML, CSS, and JavaScript so it can be hosted directly with GitHub Pages.

## Local preview

From the repository root, start a local server:

```powershell
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000). A local server is recommended because the project loads the shared catalog from `data/projects.js` and mirrors how GitHub Pages serves the site.

Stop the server with `Ctrl+C`.

## Validation

Run the dependency-free site validator before publishing:

```powershell
python scripts/validate_site.py
node --check script.js
node --check game_demos/soccer-demo.js
node --check game_demos/sprint-and-sparkle-demo.js
node --check game_demos/chess-engine.js
node --check game_demos/chess-demo.js
node --check scripts/generate_demo_auth.js
node --check data/demo-auth.js
node --check data/projects.js
node scripts/test_chess.js
```

The same checks run automatically in GitHub Actions for pushes and pull requests through `.github/workflows/validate.yml`.

## Project structure

```text
.
├── index.html                 Home page and featured projects
├── works.html                 All projects with filters
├── novels.html                Novel category page
├── games.html                 Game category page
├── apps.html                  App category page
├── music.html                 Music category page
├── project.html               Reusable project detail page
├── feed.xml                   Atom feed for new work updates
├── about.html                 About page
├── 404.html                   GitHub Pages not-found page
├── styles.css                 Shared site styles
├── script.js                  Shared behavior and rendering
├── game_demos/                Browser game engines
│   ├── soccer-demo.js          Sparkling Soccer game engine
│   ├── sprint-and-sparkle-demo.js  Sprint & Sparkle game engine
│   ├── chess-engine.js         Sparkling Chess rules and computer opponent
│   └── chess-demo.js           Sparkling Chess board and controls
├── data/projects.js           Single source of truth for project metadata
├── data/demo-auth.js          Public salted password verifier for demo access
├── images/                    Profile and future project images
├── downloads/                 Files visitors can download, grouped by type
├── scripts/                   Local maintenance and validation scripts
└── .github/workflows/         Automated repository checks
```

## Adding a project

1. Add a new object to `data/projects.js`.
2. Give it a unique `id`, title, type, category, genre, status, year, description, and details.
3. Add a `download` object only when a real file exists under `downloads/`. Keep the path relative to the repository root.
4. Add an `audio` object for songs or soundtracks that should have an embedded player. Include `src`, `mime`, `label`, and `note`.
5. Add a `demo` object only when the project has a self-contained browser demo. The current supported demo types are `dodger`, `soccer`, and `chess`.
6. Set `featured: true` only for projects that should appear on the home page.
7. Run the validation commands and check the project detail page locally.

## Browser demo password

Set `DEMO_PASSWORD` in the local `.env` file. After changing it, regenerate `data/demo-auth.js` with `node scripts/generate_demo_auth.js`, then commit the generated verifier and push the site. `.env` is ignored by Git and must never be committed. Visitors enter the shared password on a project page; a successful unlock lasts for the current browser session.

GitHub Pages is static hosting, so it cannot keep a password secret on a server. The generated file contains a salted PBKDF2 verifier rather than the password, but visitors can still attempt offline guesses against it. Use a long, random password and treat this as a casual access gate, not protection for private or sensitive work.

When a project is newly released or receives a meaningful public update, add an `<entry>` to `feed.xml` with a unique id, title, publication date, update date, and project link. Keep the newest entry at the top and update the feed-level `<updated>` timestamp.

The available categories are `novels`, `games`, `apps`, `music`, and `other`. The category value determines which category page displays the project.

## Downloads

Some files in `downloads/` are 0 KB examples for testing links and download behavior; `The Dew.ogg` is a real audio file. Replace placeholder files before presenting their projects as released. Keep large files organized in the existing category folders and use descriptive filenames.

## GitHub Pages

To verify hosting for `SummerPea/SummerPea.github.io`:

1. Open the repository’s **Settings → Pages**.
2. Confirm the source is the `main` branch and the repository root (`/`) unless the hosting setup has intentionally changed.
3. After publishing, visit the site root and test one category page, one project detail link, one download link, and a deliberately invalid URL to confirm `404.html` is shown.

The repository does not require a build step. GitHub Pages can serve the committed HTML, CSS, JavaScript, data, images, and downloads directly.
