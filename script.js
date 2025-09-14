document.addEventListener('DOMContentLoaded', async () => {
    const projectFolders = [
        'b26t', 'bc-combo', 'censor', 'pr-edit', 'pixel-bg-remover',
        'sk-chars', 'sk-save', 'stack-images', 'wplace-fixer'
    ];

    const projectGrid = document.getElementById('project-grid');
    const params = new URLSearchParams(window.location.search);
    const showAll = params.has('hail');

    const fetchPromises = projectFolders.map(folder => 
        fetch(`${folder}/config.json`)
            .then(response => response.json())
            .then(config => ({ ...config, folder }))
            .catch(error => console.error(`Error loading config for ${folder}:`, error))
    );

    const projects = (await Promise.all(fetchPromises)).filter(Boolean);
    const filteredProjects = showAll ? projects : projects.filter(p => p.description !== '');

    filteredProjects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card';

        const link = document.createElement('a');
        link.href = `${project.folder}/index.html`;

        const title = document.createElement('h2');
        title.textContent = project.name;

        const description = document.createElement('p');
        description.textContent = project.description;

        link.appendChild(title);
        link.appendChild(description);
        card.appendChild(link);
        projectGrid.appendChild(card);
    });
});