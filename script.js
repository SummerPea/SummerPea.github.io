document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setCurrentYear();
    renderFeaturedProjects();
    renderProjectListing();
    renderProjectDetail();
});

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

function projectCard(project, sourcePage = 'works') {
    const download = project.download
        ? `<a class="card-link" href="${escapeHtml(project.download.href)}" download>${escapeHtml(project.download.label)}</a>`
        : '';
    const downloadNote = project.download
        ? `<span class="download-note">${escapeHtml(project.download.note)}</span>`
        : '';

    return `<article class="project-card">
        <div class="project-card-top"><span class="project-icon" aria-hidden="true">${escapeHtml(project.icon)}</span><div class="project-card-heading"><div class="work-meta"><span class="status-badge">${escapeHtml(project.status)}</span><span>${escapeHtml(project.year)}</span></div><h2>${escapeHtml(project.title)}</h2></div></div>
        <p class="project-description">${escapeHtml(project.description)}</p>
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
    detail.innerHTML = `<a class="back-link" href="${backHref}">← Back to ${backLabel}</a><div class="detail-hero"><span class="project-icon large-icon" aria-hidden="true">${escapeHtml(project.icon)}</span><div><p class="eyebrow">${escapeHtml(project.type)} · ${escapeHtml(project.year)}</p><h1>${escapeHtml(project.title)}</h1><div class="project-tags"><span>${escapeHtml(project.status)}</span><span>${escapeHtml(project.genre)}</span></div></div></div><div class="detail-copy"><h2>About this project</h2><p>${escapeHtml(project.details)}</p>${download}</div>`;
    document.title = `${project.title} | Haolin Zhang`;
}
