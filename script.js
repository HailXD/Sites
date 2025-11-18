const repos = [
  { repo: 'HailXD/wplace-fixer', url: 'https://hailxd.github.io/wplace-fixer/', branch: 'main', path: '/', status: 'built' },
  { repo: 'HailXD/tarot-stocks', url: 'https://hailxd.github.io/tarot-stocks/', branch: 'main', path: '/', status: 'built' },
  { repo: 'HailXD/tarot-draw', url: 'https://hailxd.github.io/tarot-draw/', branch: 'main', path: '/', status: 'built' },
  { repo: 'HailXD/stack-images', url: 'https://hailxd.github.io/stack-images/', branch: 'main', path: '/', status: 'built' },
  { repo: 'HailXD/sk-save', url: 'https://hailxd.github.io/sk-save/', branch: 'main', path: '/', status: 'built' },
  { repo: 'HailXD/sk-chars', url: 'https://hailxd.github.io/sk-chars/', branch: 'main', path: '/', status: 'built' },
  { repo: 'HailXD/pr-edit', url: 'https://hailxd.github.io/pr-edit/', branch: 'main', path: '/', status: 'built' },
  { repo: 'HailXD/pixel-painter', url: 'https://hailxd.github.io/pixel-painter/', branch: 'main', path: '/', status: 'built' },
  { repo: 'HailXD/pixel-bg-remover', url: 'https://hailxd.github.io/pixel-bg-remover/', branch: 'main', path: '/', status: 'built' },
  { repo: 'HailXD/clearml-convert', url: 'https://hailxd.github.io/clearml-convert/', branch: 'main', path: '/', status: 'built' },
  { repo: 'HailXD/censor', url: 'https://hailxd.github.io/censor/', branch: 'main', path: '/', status: 'built' },
  { repo: 'HailXD/bc-combo', url: 'https://hailxd.github.io/bc-combo/', branch: 'main', path: '/', status: 'built' },
  { repo: 'HailXD/b26t', url: 'https://hailxd.github.io/b26t/', branch: 'main', path: '/', status: 'built' },
  { repo: 'HailXD/apple-purchase', url: 'https://hailxd.github.io/apple-purchase/', branch: 'main', path: '/', status: 'built' },
  { repo: 'HailXD/apple-insert', url: 'https://hailxd.github.io/apple-insert/', branch: 'main', path: '/', status: 'built' },
  { repo: 'HailXD/PokeRogue-PathFinder', url: 'https://hailxd.github.io/PokeRogue-PathFinder/', branch: 'main', path: '/', status: 'built' },
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
  const builtCount = repos.filter(r => r.status === 'built').length;
  statBuilt.textContent = `${builtCount} built`;
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
  article.className = 'repo-card';
  article.dataset.repo = item.repo.toLowerCase();

  const top = document.createElement('div');
  top.className = 'card-top';
  top.innerHTML = `
    <span class="badge">${item.status}</span>
    <button class="copy-btn" type="button">Copy link</button>
  `;

  const title = document.createElement('h3');
  title.textContent = item.repo;

  const meta = document.createElement('p');
  meta.className = 'meta';
  meta.textContent = `Branch ${item.branch} | Path ${item.path}`;

  const actions = document.createElement('div');
  actions.className = 'actions';
  const liveLink = document.createElement('a');
  liveLink.href = item.url;
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

  article.append(top, title, meta, actions);

  const copyBtn = article.querySelector('.copy-btn');
  copyBtn.addEventListener('click', () => copyToClipboard(item.url, copyBtn));

  return article;
};

const renderList = (items) => {
  repoGrid.innerHTML = '';
  items.forEach(item => repoGrid.appendChild(createCard(item)));
  setStats(items.length);
  emptyState.hidden = items.length !== 0;
};

const sortItems = (items, sort) => {
  const sorted = [...items].sort((a, b) => a.repo.localeCompare(b.repo));
  return sort === 'za' ? sorted.reverse() : sorted;
};

const applyFilters = () => {
  const query = searchInput.value.trim().toLowerCase();
  const sort = sortSelect.value;
  const filtered = repos.filter(item => {
    const haystack = `${item.repo} ${item.status} ${item.branch}`.toLowerCase();
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
  window.open(pick.url, '_blank', 'noreferrer');
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
