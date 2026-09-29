document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupThemeToggle();
    setCurrentYear();
    renderFeaturedProjects();
    renderProjectListing();
    renderProjectDetail();
    setupGameDemo();
});

const TYPE_ICONS = {
    Novel: '✧',
    Game: '✦',
    App: '▣',
    Music: '♫',
    Other: '⌘'
};

const THEME_STORAGE_KEY = 'haolin-theme';

function setupNavigation() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdown = document.querySelector('.dropdown');

    if (menuToggle && navLinks) {
        const closeMenu = () => {
            menuToggle.setAttribute('aria-expanded', 'false');
            navLinks.classList.remove('is-open');
        };

        menuToggle.addEventListener('click', () => {
            const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
            menuToggle.setAttribute('aria-expanded', String(!isOpen));
            navLinks.classList.toggle('is-open', !isOpen);
        });

        navLinks.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
        menuToggle.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeMenu();
        });
    }

    if (!dropdownToggle || !dropdown) return;

    dropdownToggle.addEventListener('click', () => {
        const isOpen = dropdownToggle.getAttribute('aria-expanded') === 'true';
        dropdownToggle.setAttribute('aria-expanded', String(!isOpen));
        dropdown.classList.toggle('is-open', !isOpen);
    });

    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target)) {
            dropdownToggle.setAttribute('aria-expanded', 'false');
            dropdown.classList.remove('is-open');
        }
        if (menuToggle && navLinks && !menuToggle.contains(event.target) && !navLinks.contains(event.target)) {
            menuToggle.setAttribute('aria-expanded', 'false');
            navLinks.classList.remove('is-open');
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            dropdownToggle.setAttribute('aria-expanded', 'false');
            dropdown.classList.remove('is-open');
            menuToggle?.setAttribute('aria-expanded', 'false');
            navLinks?.classList.remove('is-open');
            dropdownToggle.focus();
        }
    });
}

function setupThemeToggle() {
    const root = document.documentElement;
    const navContainer = document.querySelector('.nav-container');
    if (!navContainer || navContainer.querySelector('.theme-toggle')) return;

    let savedTheme = null;
    try {
        savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
        // Continue with the system preference when storage is unavailable.
    }

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme === 'dark' || (!savedTheme && prefersDark) ? 'dark' : 'light';
    root.dataset.theme = initialTheme;

    const toggle = document.createElement('button');
    toggle.className = 'theme-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-pressed', String(initialTheme === 'dark'));

    const updateToggle = (theme) => {
        const dark = theme === 'dark';
        toggle.innerHTML = `<span class="theme-icon" aria-hidden="true">${dark ? '☀' : '☾'}</span><span class="theme-label">${dark ? 'Light mode' : 'Dark mode'}</span>`;
        toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
        toggle.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
        toggle.setAttribute('aria-pressed', String(dark));
    };

    updateToggle(initialTheme);
    navContainer.appendChild(toggle);

    toggle.addEventListener('click', () => {
        const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
        root.dataset.theme = nextTheme;
        updateToggle(nextTheme);
        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        } catch {
            // The theme still works for this visit if storage is unavailable.
        }
    });
}

function setCurrentYear() {
    const year = document.getElementById('current-year');
    if (year) year.textContent = new Date().getFullYear();
}

function getProjects() {
    return Array.isArray(window.projectCatalog) ? window.projectCatalog : [];
}

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[character]));
}

function projectIcon(project) {
    return TYPE_ICONS[project.type] || '•';
}

function audioPlayer(project) {
    if (!project.audio) return '';

    return `<div class="audio-player"><p class="audio-label">♫ ${escapeHtml(project.audio.label)}</p><audio controls preload="metadata" aria-label="${escapeHtml(project.audio.label)}"><source src="${escapeHtml(project.audio.src)}" type="${escapeHtml(project.audio.mime)}">Your browser does not support embedded audio.</audio><span class="download-note">${escapeHtml(project.audio.note)}</span></div>`;
}

function gameDemoMarkup(project) {
    if (!project.demo) return '';

    if (project.demo.type === 'chess') {
        return `<section class="game-demo chess-demo" data-demo-type="chess" aria-labelledby="game-demo-title">
        <div class="game-demo-heading"><div><p class="eyebrow">Playable browser game</p><h2 id="game-demo-title">${escapeHtml(project.demo.title)}</h2></div><span class="demo-badge">Prototype</span></div>
        <p class="game-help" id="game-help">You play blue from the bottom. Each turn creates one coin on an empty square. Move a piece onto a coin to collect it, or spend saved coins to deploy a new piece. Checkmate wins. Pawns deploy on your second rank and promote to queens; castling is unavailable in this variant.</p>
        <div class="chess-scores" aria-label="Game resources"><span>Computer <strong id="chess-cpu-coins">0</strong> coins</span><strong id="chess-turn">Your turn</strong><span>You <strong id="chess-human-coins">0</strong> coins</span></div>
        <div class="chess-board" id="chess-board" role="group" aria-label="Sparkling Chess board" aria-describedby="game-help"></div>
        <div class="chess-deploy" role="group" aria-label="Deploy a piece"><span>Deploy:</span><button type="button" data-chess-deploy="p">Pawn · 1</button><button type="button" data-chess-deploy="n">Knight · 3</button><button type="button" data-chess-deploy="b">Bishop · 3</button><button type="button" data-chess-deploy="r">Rook · 5</button><button type="button" data-chess-deploy="q">Queen · 9</button></div>
        <div class="chess-footer"><p class="game-status" id="chess-status" aria-live="polite">Your turn. Select your king or move toward a coin.</p><button type="button" id="chess-restart">New game</button></div>
        <p class="chess-legend"><span class="chess-legend-piece">K</span> Your pieces <span class="chess-legend-piece cpu">K</span> Computer pieces <span class="chess-legend-coin">✦</span> Coins</p>
    </section>`;
    }

    if (project.demo.type === 'soccer') {
        return `<section class="game-demo soccer-demo" data-demo-type="soccer" aria-labelledby="game-demo-title">
        <div class="game-demo-heading"><div><p class="eyebrow">Playable browser demo</p><h2 id="game-demo-title">${escapeHtml(project.demo.title)}</h2></div><span class="demo-badge">Prototype</span></div>
        <p class="game-help" id="game-help">Plan one action, then watch all ten players act simultaneously. Select a blue player, choose Move, Pass, or Shoot, choose a target, and confirm. First team to three goals wins.</p>
        <div class="soccer-scoreboard" aria-label="Match score"><span>Your team <strong id="soccer-user-score">0</strong></span><strong id="soccer-turn-label">Your turn</strong><span>CPU <strong id="soccer-cpu-score">0</strong></span></div>
        <div class="game-stage soccer-stage"><canvas class="game-canvas soccer-canvas" id="soccer-canvas" width="756" height="420" tabindex="0" aria-label="Sparkling Soccer tactical field" aria-describedby="game-help">Your browser does not support the canvas soccer demo.</canvas></div>
        <div class="soccer-toolbar" role="group" aria-label="Soccer actions"><button class="soccer-action-btn" type="button" data-soccer-action="move">Move</button><button class="soccer-action-btn" type="button" data-soccer-action="pass">Pass</button><button class="soccer-action-btn" type="button" data-soccer-action="shoot">Shoot</button><button class="soccer-action-btn confirm" id="soccer-confirm" type="button" disabled>Confirm</button><button class="soccer-action-btn" id="soccer-cancel" type="button" disabled>Cancel</button><button class="soccer-action-btn" id="soccer-restart" type="button">Restart match</button></div>
        <p class="game-status soccer-status" id="soccer-status" aria-live="polite">Your kickoff. Select an action for the player with the ball.</p>
    </section>`;
    }

    if (project.demo.type !== 'dodger') return '';

    return `<section class="game-demo" data-demo-type="dodger" aria-labelledby="game-demo-title">
        <div class="game-demo-heading"><div><p class="eyebrow">Playable browser demo</p><h2 id="game-demo-title">${escapeHtml(project.demo.title)}</h2></div><span class="demo-badge">Prototype</span></div>
        <p class="game-help" id="game-help">Survive the endless side-scrolling corridor. Move in 8 directions with the arrow keys or WASD. Cannons rotate toward your current position before firing. Touch controls are available below the game.</p>
        <div class="game-stage"><canvas class="game-canvas" id="game-canvas" width="640" height="360" tabindex="0" aria-label="Sprint &amp; Sparkle game area" aria-describedby="game-help">Your browser does not support the canvas game demo.</canvas></div>
        <div class="game-toolbar"><button class="primary-btn" id="game-start" type="button">Start demo</button><p class="game-status" id="game-status" aria-live="polite">Ready to fly. Start the demo when you are ready.</p></div>
        <div class="game-controls" role="group" aria-label="Eight-direction touch controls"><button type="button" data-game-direction="up-left" aria-label="Move up and left">↖</button><button type="button" data-game-direction="up" aria-label="Move up">↑</button><button type="button" data-game-direction="up-right" aria-label="Move up and right">↗</button><button type="button" data-game-direction="left" aria-label="Move left">←</button><span class="game-control-spacer" aria-hidden="true"></span><button type="button" data-game-direction="right" aria-label="Move right">→</button><button type="button" data-game-direction="down-left" aria-label="Move down and left">↙</button><button type="button" data-game-direction="down" aria-label="Move down">↓</button><button type="button" data-game-direction="down-right" aria-label="Move down and right">↘</button></div>
    </section>`;
}

function projectCard(project, sourcePage = 'works') {
    const download = project.download
        ? `<a class="card-link" href="${escapeHtml(project.download.href)}" download>${escapeHtml(project.download.label)}</a>`
        : '';
    const downloadNote = project.download
        ? `<span class="download-note">${escapeHtml(project.download.note)}</span>`
        : '';

    return `<article class="project-card">
        <div class="project-card-top"><span class="project-icon" aria-hidden="true">${projectIcon(project)}</span><div class="project-card-heading"><div class="work-meta"><span class="status-badge">${escapeHtml(project.status)}</span><span>${escapeHtml(project.year)}</span></div><h2>${escapeHtml(project.title)}</h2></div></div>
        <p class="project-description">${escapeHtml(project.description)}</p>${audioPlayer(project)}
        <div class="project-tags"><span>${escapeHtml(project.type)}</span><span>${escapeHtml(project.genre)}</span></div>
        <div class="project-actions"><a class="card-link primary-link" href="project.html?id=${encodeURIComponent(project.id)}&amp;from=${encodeURIComponent(sourcePage)}">View details</a>${download}${downloadNote}</div>
    </article>`;
}

function renderFeaturedProjects() {
    const target = document.getElementById('featured-projects');
    if (!target) return;

    const featured = getProjects().filter((project) => project.featured).slice(0, 4);
    target.innerHTML = featured.map((project) => projectCard(project, 'works')).join('');
}

function renderProjectListing() {
    const grid = document.getElementById('project-grid');
    if (!grid) return;

    const page = document.getElementById('main-content');
    const requestedCategory = page?.dataset.categoryFilter || 'all';
    const sourcePage = requestedCategory === 'all' ? 'works' : requestedCategory;
    const searchInput = document.getElementById('project-search');
    const status = document.getElementById('project-status');
    const emptyState = document.getElementById('project-empty');
    const filterButtons = [...document.querySelectorAll('[data-filter]')];
    let selectedCategory = requestedCategory;

    const update = () => {
        const query = searchInput?.value.trim().toLowerCase() || '';
        const visible = getProjects().filter((project) => {
            const inCategory = selectedCategory === 'all' || project.category === selectedCategory;
            const searchable = `${project.title} ${project.type} ${project.genre} ${project.description}`.toLowerCase();
            return inCategory && searchable.includes(query);
        });

        grid.innerHTML = visible.map((project) => projectCard(project, sourcePage)).join('');
        if (emptyState) emptyState.hidden = visible.length !== 0;
        if (status) {
            const label = selectedCategory === 'all' ? 'all projects' : selectedCategory;
            status.textContent = query ? `${visible.length} project${visible.length === 1 ? '' : 's'} found` : `Showing ${visible.length} ${label}`;
        }
    };

    filterButtons.forEach((button) => {
        button.addEventListener('click', () => {
            selectedCategory = button.dataset.filter;
            filterButtons.forEach((filterButton) => {
                const active = filterButton === button;
                filterButton.classList.toggle('active', active);
                filterButton.setAttribute('aria-pressed', String(active));
            });
            update();
        });
    });

    searchInput?.addEventListener('input', update);
    update();
}

function renderProjectDetail() {
    const detail = document.getElementById('project-detail');
    if (!detail) return;

    const id = new URLSearchParams(window.location.search).get('id');
    const project = getProjects().find((item) => item.id === id);

    if (!project) {
        detail.innerHTML = '<p class="eyebrow">Project not found</p><h1>That project is not available.</h1><p class="page-intro">Return to the works page to browse the current portfolio.</p><a class="primary-btn" href="works.html">Browse all works</a>';
        return;
    }

    const download = project.download
        ? `<div class="detail-download"><a class="primary-btn" href="${escapeHtml(project.download.href)}" download>${escapeHtml(project.download.label)}</a><span class="download-note">${escapeHtml(project.download.note)}</span></div>`
        : '<p class="availability">A public download is not available yet.</p>';

    const sourcePage = new URLSearchParams(window.location.search).get('from');
    const returnPages = {
        works: { href: 'works.html', label: 'All Works' },
        novels: { href: 'novels.html', label: 'Novels' },
        games: { href: 'games.html', label: 'Games' },
        apps: { href: 'apps.html', label: 'Apps' },
        music: { href: 'music.html', label: 'Music' }
    };
    const fallbackPage = project.category === 'other' ? 'works' : project.category;
    const returnPage = returnPages[sourcePage] || returnPages[fallbackPage];
    const backHref = returnPage.href;
    const backLabel = returnPage.label;
    detail.innerHTML = `<a class="back-link" href="${backHref}">← Back to ${backLabel}</a><div class="detail-hero"><span class="project-icon large-icon" aria-hidden="true">${projectIcon(project)}</span><div><p class="eyebrow">${escapeHtml(project.type)} · ${escapeHtml(project.year)}</p><h1>${escapeHtml(project.title)}</h1><div class="project-tags"><span>${escapeHtml(project.status)}</span><span>${escapeHtml(project.genre)}</span></div></div></div><div class="detail-copy"><h2>About this project</h2><p>${escapeHtml(project.details)}</p>${gameDemoMarkup(project)}${audioPlayer(project)}${download}</div>`;
    document.title = `${project.title} | Haolin Zhang`;
}

function setupGameDemo() {
    const demo = document.querySelector('[data-demo-type]');
    if (!demo) return;

    if (demo.dataset.demoType === 'chess') {
        window.setupChessDemo?.(demo);
        return;
    }

    if (demo.dataset.demoType === 'soccer') {
        window.setupSoccerDemo?.(demo);
        return;
    }

    if (demo.dataset.demoType === 'dodger') window.setupSprintAndSparkleDemo?.(demo);
}
