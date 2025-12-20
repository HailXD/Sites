const baseRepos = [
  'HailXD/encrypt',
  'HailXD/gemini-watermark',
  'HailXD/reverse-text',
  'HailXD/wplace-fixer',
  'HailXD/tarot-stocks',
  'HailXD/tarot-draw',
  'HailXD/stack-images',
  'HailXD/sk-save',
  'HailXD/sk-chars',
  'HailXD/pr-edit',
  'HailXD/pixel-painter',
  'HailXD/pixel-bg-remover',
  'HailXD/clearml-convert',
  'HailXD/censor',
  'HailXD/bc-combo',
  'HailXD/b26t',
  'HailXD/apple-purchase',
  'HailXD/apple-insert',
  'HailXD/PokeRogue-PathFinder',
];

const repoToUrl = (repo) => {
  const [, name = ''] = repo.split('/');
  return `https://hailxd.github.io/${name}/`;
};

const normalizeExtraName = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const parts = trimmed.split('/');
  const name = parts[parts.length - 1] || '';
  return name.toLowerCase();
};

const getExtraNameSet = () => {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('ex');
  if (!raw) return new Set();

  const names = raw
    .split(',')
    .map(normalizeExtraName)
    .filter(Boolean);

  return new Set(names);
};

const extraNameSet = getExtraNameSet();
const baseNameSet = new Set(baseRepos.map(repo => {
  const [, name = ''] = repo.split('/');
  return name.toLowerCase();
}));

const repos = [
  ...[...extraNameSet]
    .filter(name => !baseNameSet.has(name))
    .map(name => ({ repo: `HailXD/${name}`, extra: true })),
  ...baseRepos.map(repo => {
    const [, name = ''] = repo.split('/');
    return { repo, extra: extraNameSet.has(name.toLowerCase()) };
  }),
];

const repoGrid = document.getElementById('repoGrid');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const randomBtn = document.getElementById('randomBtn');
const statCount = document.getElementById('statCount');
const statBuilt = document.getElementById('statBuilt');
const emptyState = document.getElementById('emptyState');

const setStats = (visibleCount) => {
  statCount.textContent = `${visibleCount} site${visibleCount === 1 ? '' : 's'}`;
  statBuilt.textContent = `${baseRepos.length} built`;
};

const copyToClipboard = async (text, button) => {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Copied!';
  } catch (err) {
    const fallback = window.prompt('Copy link', text);
    if (fallback !== null) button.textContent = 'Copied!';
  } finally {
    setTimeout(() => {
      button.textContent = 'Copy link';
    }, 1500);
  }
};

const createCard = (item) => {
  const article = document.createElement('article');
  const classes = ['repo-card'];
  if (item.extra) classes.push('extra');
  article.className = classes.join(' ');
  article.dataset.repo = item.repo.toLowerCase();
  const status = item.extra ? 'extra' : 'built';

  const top = document.createElement('div');
  top.className = 'card-top';
  top.innerHTML = `
    <span class="badge${item.extra ? ' extra' : ''}">${status}</span>
    <button class="copy-btn" type="button">Copy link</button>
  `;

  const title = document.createElement('h3');
  title.textContent = item.repo;

  const actions = document.createElement('div');
  actions.className = 'actions';
  const liveLink = document.createElement('a');
  liveLink.href = repoToUrl(item.repo);
  liveLink.target = '_blank';
  liveLink.rel = 'noreferrer';
  liveLink.className = 'primary';
  liveLink.textContent = 'Open site';

  const repoLink = document.createElement('a');
  repoLink.href = `https://github.com/${item.repo}`;
  repoLink.target = '_blank';
  repoLink.rel = 'noreferrer';
  repoLink.textContent = 'View repo';

  actions.append(liveLink, repoLink);

  article.append(top, title, actions);

  const copyBtn = article.querySelector('.copy-btn');
  copyBtn.addEventListener('click', () => copyToClipboard(repoToUrl(item.repo), copyBtn));

  return article;
};

const renderList = (items) => {
  repoGrid.innerHTML = '';
  items.forEach(item => repoGrid.appendChild(createCard(item)));
  setStats(items.length);
  emptyState.hidden = items.length !== 0;
};

const sortItems = (items, sort) => {
  const direction = sort === 'za' ? -1 : 1;
  return [...items].sort((a, b) => {
    if (a.extra && !b.extra) return -1;
    if (!a.extra && b.extra) return 1;
    return a.repo.localeCompare(b.repo) * direction;
  });
};

const applyFilters = () => {
  const query = searchInput.value.trim().toLowerCase();
  const sort = sortSelect.value;
  const filtered = repos.filter(item => {
    const haystack = `${item.repo} ${item.extra ? 'extra' : 'built'}`.toLowerCase();
    return haystack.includes(query);
  });
  const sorted = sortItems(filtered, sort);
  renderList(sorted);
};

const openRandom = () => {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = repos.filter(item => item.repo.toLowerCase().includes(query));
  const list = filtered.length ? filtered : repos;
  const pick = list[Math.floor(Math.random() * list.length)];
  window.open(repoToUrl(pick.repo), '_blank', 'noreferrer');
};

searchInput.addEventListener('input', applyFilters);
sortSelect.addEventListener('change', applyFilters);
randomBtn.addEventListener('click', openRandom);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const firstCard = repoGrid.querySelector('.repo-card a.primary');
    if (firstCard) firstCard.click();
  }
});

renderList(sortItems(repos, 'az'));
