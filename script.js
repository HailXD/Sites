if (
    typeof window === "undefined" &&
    typeof process !== "undefined" &&
    process.versions &&
    process.versions.node
) {
    const fs = require("fs");
    const path = require("path");

    const getProjectFolders = () => {
        const excludeList = [
            ".git",
            ".vscode",
            "__pycache__",
            "node_modules",
            "update_projects.py",
            "generate-projects.js",
        ];

        const allItems = fs.readdirSync(".");
        const projectFolders = allItems.filter((item) => {
            try {
                const stat = fs.statSync(item);
                if (stat.isDirectory() && !excludeList.includes(item)) {
                    return fs.existsSync(path.join(item, "config.json"));
                }
            } catch (e) {
                return false;
            }
            return false;
        });
        projectFolders.sort();
        return projectFolders;
    };

    const updateProjectsJson = (projectFolders) => {
        const filePath = "projects.json";
        try {
            const jsonContent = JSON.stringify(projectFolders, null, 4);
            fs.writeFileSync(filePath, jsonContent, "utf-8");
            console.log(
                `Successfully updated ${filePath} with ${projectFolders.length} projects.`
            );
            console.log("Updated list:", projectFolders);
        } catch (e) {
            console.error(`An unexpected error occurred: ${e}`);
        }
    };

    const folders = getProjectFolders();
    if (folders.length > 0) {
        updateProjectsJson(folders);
    } else {
        console.log("No project folders containing 'config.json' were found.");
    }
} else {
    document.addEventListener("DOMContentLoaded", async () => {
        const projectGrid = document.getElementById("project-grid");
        const params = new URLSearchParams(window.location.search);
        const showAll = params.has("hail");

        let projectFolders = [];
        try {
            const response = await fetch("projects.json");
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            projectFolders = await response.json();
        } catch (error) {
            console.error("Error loading projects.json:", error);
            projectGrid.innerHTML =
                "<p>Could not load project list. Please run `node script.js` locally to generate it.</p>";
            return;
        }

        const fetchPromises = projectFolders.map((folder) =>
            fetch(`${folder}/config.json`)
                .then((response) => response.json())
                .then((config) => ({ ...config, folder }))
                .catch((error) =>
                    console.error(`Error loading config for ${folder}:`, error)
                )
        );

        const projects = (await Promise.all(fetchPromises)).filter(Boolean);
        const filteredProjects = showAll
            ? projects
            : projects.filter((p) => p.description !== "");

        filteredProjects.forEach((project) => {
            const card = document.createElement("div");
            card.className = "project-card";

            const link = document.createElement("a");
            link.href = `${project.folder}/index.html`;

            const title = document.createElement("h2");
            title.textContent = project.name;

            const description = document.createElement("p");
            description.textContent = project.description;

            link.appendChild(title);
            link.appendChild(description);
            card.appendChild(link);
            projectGrid.appendChild(card);
        });
    });
}
