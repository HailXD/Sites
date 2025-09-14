document.addEventListener('DOMContentLoaded', () => {
    const projects = [
        {
            folder: 'b26t',
            name: 'b26t',
            description: 'A simple utility to generate short, time-based strings.'
        },
        {
            folder: 'bc-combo',
            name: 'Battle Cats Combo Calculator',
            description: 'A tool to find the best cat combinations for specific combo effects in the game Battle Cats.'
        },
        {
            folder: 'pixel-bg-remover',
            name: 'Pixel BG Remover',
            description: 'A background removal tool for pixel art images.'
        },
        {
            folder: 'RKBI',
            name: 'RKBI',
            description: 'A project with a Python backend for image processing.'
        },
        {
            folder: 'sk-chars',
            name: 'SKChars',
            description: 'A character viewer or editor for a game or application.'
        },
        {
            folder: 'sk-save',
            name: 'SKSave',
            description: 'A save file utility, likely for a game.'
        },
        {
            folder: 'stack-images',
            name: 'Image Stacker',
            description: 'A tool to stack multiple images vertically or horizontally.'
        },
        {
            folder: 'wplace-fixer',
            name: 'Pixel Palette Converter',
            description: 'Converts images to a specific pixel art color palette.'
        }
    ];

    const projectGrid = document.getElementById('project-grid');

    projects.forEach(project => {
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