const base = new URL('../data/', import.meta.url);
const LS = {
    get: (k, d) => {
        try {
            return JSON.parse(localStorage.getItem('sitestack:' + k)) ?? d
        } catch {
            return d
        }
    },
    set: (k, v) => {
        try {
            localStorage.setItem('sitestack:' + k, JSON.stringify(v))
        } catch {}
    }
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
} [c]));
const dom = u => {
    try {
        return new URL(u).hostname.replace(/^www\./, '')
    } catch {
        return ''
    }
};
const hue = s => [...s].reduce((a, c) => a + c.charCodeAt(0), 0) * 37 % 360;
const saved = LS.get('favs', null);
const state = {
    view: 'dashboard',
    cat: null,
    q: '',
    sort: 'az',
    mode: LS.get('mode', 'grid'),
    favs: new Set(saved || []),
    theme: LS.get('theme', matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light')
};
let B = [],
    C = [];
const match = (b, q) => {
    if (!q) return true;
    const h = [b.title, b.description, dom(b.url), b.category, b.subcategory, ...b.tags, b.repository?.owner, b.repository?.language].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).every(t => h.includes(t))
};

function list() {
    let r = B.filter(b => match(b, state.q));
    if (state.view === 'cat') r = r.filter(b => b.category === state.cat);
    if (state.view === 'favs') r = r.filter(b => state.favs.has(b.id));
    if (state.view === 'github') r = r.filter(b => b.repository);
    if (state.view === 'recent') return [...r].sort((a, b) => b.dateAdded.localeCompare(a.dateAdded) || a.title.localeCompare(b.title));
    return [...r].sort((a, b) => state.sort === 'za' ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title))
}

function card(b) {
    const d = dom(b.url),
        r = b.repository,
        f = state.favs.has(b.id);
    const tags = (r ? [r.language, ...r.topics] : b.tags).map(t => `<span>${esc(t)}</span>`).join('');
    return `<article class="ss-card"><div class="ss-hd"><span class="ss-logo-i" style="background:hsl(${hue(b.title)} 55% 45%)">${esc(b.title[0])}<img loading="lazy" alt="" src="${esc(b.favicon||'https://www.google.com/s2/favicons?sz=64&domain='+d)}" onerror="this.remove()"></span><a href="${esc(b.url)}" target="_blank" rel="noopener noreferrer">${esc(b.title)}</a><button class="ss-fav" data-fav="${esc(b.id)}" aria-pressed="${f}" aria-label="Favourite ${esc(b.title)}">${f?'♥':'♡'}</button></div><p>${esc(b.description)}</p><div class="ss-tags">${tags}</div><div class="ss-dom">${esc(r?r.owner+' · ':'')}${esc(d)} ↗</div></article>`
}

function render() {
    document.documentElement.dataset.ssTheme = state.theme;
    LS.set('theme', state.theme);
    const app = document.getElementById('app'),
        focus = document.activeElement?.id;
    const nav = [
        ['dashboard', 'Dashboard'],
        ['all', 'All Bookmarks'],
        ['favs', 'Favourites'],
        ['recent', 'Recently Added'],
        ['github', 'GitHub Repositories']
    ];
    const titles = Object.fromEntries([
        ['dashboard', 'Your favourite corner of the internet.'], ...nav.slice(1)
    ]);
    const title = state.view === 'cat' ? C.find(c => c.id === state.cat)?.name : titles[state.view];
    const items = list(),
        dash = state.view === 'dashboard' && !state.q;
    const grid = a => `<div class="ss-grid ${state.mode}">${a.map(card).join('')||'<div class="ss-empty">Nothing here yet.</div>'}</div>`;
    app.innerHTML = `<aside class="ss-side" id="side"><div class="ss-logo">📚 SiteStack</div><nav class="ss-nav" aria-label="Main">${nav.map(([v,l])=>`<button data-v="${v}" ${state.view===v?'aria-current="true"':''}>${l}</button>`).join('')}<h6>Categories</h6>${C.map(c=>`<button data-c="${c.id}" ${state.cat===c.id&&state.view==='cat'?'aria-current="true"':''}>${c.icon} ${esc(c.name)}</button>`).join('')}</nav></aside>
<main class="ss-main"><div class="ss-top"><button class="ss-btn ss-menu" id="menu" aria-label="Menu">☰</button><input id="q" type="search" placeholder="Search websites, tags, domains…  (Ctrl/⌘ K)" value="${esc(state.q)}" aria-label="Search"><button class="ss-btn" id="theme" aria-label="Toggle theme">${state.theme==='dark'?'☀️':'🌙'}</button></div>
<h2 class="ss-h">${esc(title)}</h2><p class="ss-sub">${state.view==='dashboard'?'All your favourite websites, tools and resources in one place.':items.length+' bookmarks'}</p>
${dash?`<div class="ss-cats">${C.map(c=>`<button class="ss-cat" data-c="${c.id}"><div>${c.icon}</div><b>${esc(c.name)}</b><span>${B.filter(b=>b.category===c.id).length} bookmarks</span></button>`).join('')}</div><h3>Favourites</h3>${grid(B.filter(b=>state.favs.has(b.id)))}`:
`<div class="ss-tools"><select id="sort" aria-label="Sort"><option value="az">A–Z</option><option value="za" ${state.sort==='za'?'selected':''}>Z–A</option></select><select id="mode" aria-label="View"><option value="grid">Grid</option><option value="compact" ${state.mode==='compact'?'selected':''}>Compact</option><option value="list" ${state.mode==='list'?'selected':''}>List</option></select></div>${grid(items)}`}</main>`;
    if (focus === 'q') {
        const q = document.getElementById('q');
        q.focus();
        q.setSelectionRange(q.value.length, q.value.length)
    }
}
document.addEventListener('click', e => {
    const t = e.target.closest('[data-v],[data-c],[data-fav],#theme,#menu');
    if (!t || !document.getElementById('app')?.contains(t)) return;
    if (t.id === 'menu') return document.getElementById('side').classList.toggle('open');
    if (t.id === 'theme') state.theme = state.theme === 'dark' ? 'light' : 'dark';
    else if (t.dataset.v) {
        state.view = t.dataset.v;
        state.q = ''
    } else if (t.dataset.c) {
        state.view = 'cat';
        state.cat = t.dataset.c;
        state.q = ''
    } else if (t.dataset.fav) {
        const i = t.dataset.fav;
        state.favs.has(i) ? state.favs.delete(i) : state.favs.add(i);
        LS.set('favs', [...state.favs])
    }
    render()
});
document.addEventListener('input', e => {
    if (e.target.id === 'q') {
        state.q = e.target.value;
        if (state.view === 'dashboard' && state.q) state.view = 'all';
        render()
    }
});
document.addEventListener('change', e => {
    if (e.target.id === 'sort') state.sort = e.target.value;
    else if (e.target.id === 'mode') {
        state.mode = e.target.value;
        LS.set('mode', state.mode)
    } else return;
    render()
});
document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('q')?.focus()
    }
    if (e.key === 'Escape') document.getElementById('side')?.classList.remove('open')
});
(async () => {
    if (!document.getElementById('app')) return;
    try {
        C = await fetch(new URL('categories.json', base)).then(r => r.json());
        B = (await Promise.all(C.map(c => fetch(new URL('bookmarks/' + c.id + '.json', base)).then(r => r.ok ? r.json() : []).catch(() => [])))).flat();
        if (!saved) B.filter(b => b.isFavorite).forEach(b => state.favs.add(b.id));
        render()
    } catch (e) {
        document.getElementById('app').textContent = 'Could not load bookmark data.'
    }
})();