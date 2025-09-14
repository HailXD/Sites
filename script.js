document.addEventListener('DOMContentLoaded', () => {
    const projects = [
        {
            folder: 'b26t',
            name: 'b26t',
            description: 'Base26 UID generator based on time'
        },
        {
            folder: 'bc-combo',
            name: 'Battle Cats Combo Calculator',
            description: 'Battle Cats Combo Finder'
        },
        {
            folder: 'pixel-bg-remover',
            name: 'Pixel BG Remover',
            description: 'Manual Background Remover'
        },
        {
            folder: 'RKBI',
            name: 'RKBI',
            description: ''
        },
        {
            folder: 'sk-chars',
            name: 'SKChars',
            description: 'Soul Knight Character Viewer'
        },
        {
            folder: 'sk-save',
            name: 'SKSave',
            description: ''
        },
        {
            folder: 'stack-images',
            name: 'Image Stacker',
            description: 'Stack Images'
        },
        {
            folder: 'wplace-fixer',
            name: 'Pixel Palette Converter',
            description: 'Convert images to wplace palette'
        }
    ];

    const projectGrid = document.getElementById('project-grid');

    projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card';

        const link = document.createElement('a');
        link.href = `${project.folder}`;

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