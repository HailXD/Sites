document.addEventListener("DOMContentLoaded", () => {
    const charactersContainer = document.getElementById("characters-container");
    const searchBar = document.getElementById("search-bar");
    const hailContainer = document.getElementById("hail-container");
    const xmlInput = document.getElementById("xml-input");
    const processButton = document.getElementById("process-button");
    const updateButton = document.getElementById("update-button");
    const keySearchBar = document.getElementById("key-search-bar");
    const tableContainer = document.getElementById("table-container");
    const xmlOutput = document.getElementById("xml-output");
    const gemsValue = document.getElementById("gems-value");

    let parsedData = {};
    let changedKeys = new Set();

    if (window.location.search.includes("hail")) {
        hailContainer.style.display = "block";
    }

    let charactersData = {};
    let playerId = "";
    let unlockedSkins = new Set();
    let newlyUnlocked = new Map();
    let newlyLocked = new Map();
    let unlockedCharacters = new Set();
    let newlyUnlockedCharacters = new Map();
    let newlyLockedCharacters = new Map();
    let unlockedSkills = new Map();
    let newlyUnlockedSkills = new Map();
    let newlyLockedSkills = new Map();

    fetch("characters.json")
        .then((r) => r.json())
        .then((data) => {
            charactersData = data;
            renderCharacters(charactersData);
        })
        .catch((err) => console.error("Error fetching character data:", err));

    function renderCharacters(data) {
        charactersContainer.innerHTML = "";
        for (const characterName in data) {
            if (!data.hasOwnProperty(characterName)) continue;

            const character = data[characterName];
            const card = document.createElement("div");
            card.classList.add("character-card");

            const header = document.createElement("div");
            header.classList.add("character-header");

            const nameEl = document.createElement("div");
            nameEl.classList.add("character-name");
            nameEl.textContent = characterName;
            if (unlockedCharacters.has(character.id)) {
                nameEl.classList.add("unlocked");
            }
            nameEl.addEventListener('click', () => toggleCharacterById(character.id, characterName));

            const idEl = document.createElement("div");
            idEl.classList.add("character-id");
            idEl.textContent = `ID: ${character.id}`;

            header.appendChild(nameEl);
            header.appendChild(idEl);

            const skinsWrap = document.createElement("div");
            skinsWrap.classList.add("skins-container");

            character.skins.forEach((skin) => {
                const skinEl = document.createElement("div");
                skinEl.classList.add("skin");

                const skinId = `_c${character.id}_skin${skin.index}`;
                if (unlockedSkins.has(skinId)) {
                    skinEl.classList.add("unlocked");
                }

                const img = document.createElement("img");
                img.classList.add("skin-gif");
                img.src = skin.url;
                img.alt = skin.name;

                const idx = document.createElement("div");
                idx.classList.add("skin-index");
                idx.innerText = `Index: ${skin.index}\n${skinId}`;

                skinEl.addEventListener("click", () => {
                    toggleSkinById(skinId);
                });

                const priceEl = document.createElement("div");
                priceEl.classList.add("skin-price");
                priceEl.textContent = skin.price;

                const skinInfo = document.createElement("div");
                skinInfo.classList.add("skin-info");

                const label = document.createElement("div");
                label.classList.add("skin-name");
                label.textContent = skin.name;

                skinInfo.appendChild(label);
                skinInfo.appendChild(priceEl);

                skinEl.appendChild(img);
                skinEl.appendChild(idx);
                skinEl.appendChild(skinInfo);
                skinsWrap.appendChild(skinEl);
            });

            card.appendChild(header);
            card.appendChild(skinsWrap);

            const skillsContainer = document.createElement("div");
            skillsContainer.classList.add("skills-container");

            const characterSkills = unlockedSkills.get(characterName);
            if (characterSkills) {
                const sortedSkills = [...characterSkills.entries()].sort((a, b) => a[0] - b[0]);

                for (const [skillNumber, isUnlocked] of sortedSkills) {
                    const skillEl = document.createElement('div');
                    skillEl.classList.add('skill-item');
                    if (isUnlocked) {
                        skillEl.classList.add('unlocked');
                    }
                    skillEl.textContent = `Skill ${skillNumber}`;
                    skillEl.addEventListener('click', () => toggleSkill(characterName, skillNumber));
                    skillsContainer.appendChild(skillEl);
                }
            }

            if (skillsContainer.hasChildNodes()) {
                card.appendChild(skillsContainer);
            }

            charactersContainer.appendChild(card);
        }
    }

    function filterAndRenderCharacters() {
        const term = searchBar.value.toLowerCase();
        if (!term) {
            renderCharacters(charactersData);
            return;
        }
        const filtered = {};
        for (const name in charactersData) {
            const c = charactersData[name];
            if (
                name.toLowerCase().includes(term) ||
                c.skins.some((s) => s.name.toLowerCase().includes(term))
            ) {
                filtered[name] = c;
            }
        }
        renderCharacters(filtered);
    }

    function findSkinData(skinId) {
        const match = skinId.match(/_c(\d+)_skin(\d+)/);
        if (!match) return null;

        const charId = parseInt(match[1], 10);
        const skinIndex = parseInt(match[2], 10);

        for (const charName in charactersData) {
            const character = charactersData[charName];
            if (character.id === charId) {
                const skin = character.skins.find(s => s.index === skinIndex);
                return skin;
            }
        }
        return null;
    }

    function toggleSkinById(skinId) {
        const skin = findSkinData(skinId);
        if (!skin) return;

        if (!playerId) {
            return;
        }

        const fullSkinId = `${playerId}${skinId}`;
        const isUnlocked = unlockedSkins.has(skinId);

        if (isUnlocked) {
            unlockedSkins.delete(skinId);
            if (newlyUnlocked.has(skinId)) {
                newlyUnlocked.delete(skinId);
            } else {
                newlyLocked.set(skinId, { name: skin.name, index: skin.index, url: skin.url });
            }
            if (parsedData[fullSkinId]) {
                parsedData[fullSkinId].value = "0";
            } else {
                parsedData[fullSkinId] = { type: "integer", value: "0" };
            }
        } else {
            unlockedSkins.add(skinId);
            if (newlyLocked.has(skinId)) {
                newlyLocked.delete(skinId);
            } else {
                newlyUnlocked.set(skinId, { name: skin.name, index: skin.index, url: skin.url });
            }
            if (parsedData[fullSkinId]) {
                parsedData[fullSkinId].value = "1";
            } else {
                parsedData[fullSkinId] = { type: "integer", value: "1" };
            }
        }
        changedKeys.add(fullSkinId);
        filterAndRenderCharacters();
        renderChanges();
    }

    function toggleSkill(characterName, skillNumber) {
        if (!playerId) {
            return;
        }

        const fullSkillKey = `${playerId}_c_${characterName}_skill_${skillNumber}_unlock`;
        const characterSkills = unlockedSkills.get(characterName);
        if (!characterSkills) return;

        const isUnlocked = characterSkills.get(skillNumber);
        const skillId = `${characterName}_${skillNumber}`;

        if (isUnlocked) { // it was unlocked, now locking it
            characterSkills.set(skillNumber, false);
            if (newlyUnlockedSkills.has(skillId)) {
                newlyUnlockedSkills.delete(skillId);
            } else {
                newlyLockedSkills.set(skillId, { characterName, skillNumber });
            }
            if (parsedData[fullSkillKey]) {
                parsedData[fullSkillKey].value = "0";
            } else {
                parsedData[fullSkillKey] = { type: "integer", value: "0" };
            }
        } else { // it was locked, now unlocking it
            characterSkills.set(skillNumber, true);
            if (newlyLockedSkills.has(skillId)) {
                newlyLockedSkills.delete(skillId);
            } else {
                newlyUnlockedSkills.set(skillId, { characterName, skillNumber });
            }
            if (parsedData[fullSkillKey]) {
                parsedData[fullSkillKey].value = "1";
            } else {
                parsedData[fullSkillKey] = { type: "integer", value: "1" };
            }
        }

        changedKeys.add(fullSkillKey);
        filterAndRenderCharacters();
        renderChanges();
    }


    function toggleCharacterById(charId, charName) {
        if (!playerId) {
            alert("Player ID not found. Please process an XML file first.");
            return;
        }

        const fullCharId = `${playerId}_c${charId}_unlock`;
        const isUnlocked = unlockedCharacters.has(charId);

        if (isUnlocked) {
            unlockedCharacters.delete(charId);
            if (newlyUnlockedCharacters.has(charId)) {
                newlyUnlockedCharacters.delete(charId);
            } else {
                newlyLockedCharacters.set(charId, { name: charName });
            }
            if (parsedData[fullCharId]) {
                parsedData[fullCharId].value = "False";
                parsedData[fullCharId].type = "string";
            } else {
                parsedData[fullCharId] = { type: "string", value: "False", originalType: "string" };
            }
        } else {
            unlockedCharacters.add(charId);
            if (newlyLockedCharacters.has(charId)) {
                newlyLockedCharacters.delete(charId);
            } else {
                newlyUnlockedCharacters.set(charId, { name: charName });
            }
            if (parsedData[fullCharId]) {
                parsedData[fullCharId].value = "True";
                parsedData[fullCharId].type = "string";
            } else {
                parsedData[fullCharId] = { type: "string", value: "True", originalType: "string" };
            }
        }
        changedKeys.add(fullCharId);
        filterAndRenderCharacters();
        renderChanges();
    }

    searchBar.addEventListener("input", filterAndRenderCharacters);

    processButton.addEventListener("click", () => {
        const xmlText = xmlInput.value;
        if (!xmlText) return;

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "application/xml");
        const dict = xmlDoc.querySelector("dict");
        if (!dict) return;

        const children = Array.from(dict.children);
        parsedData = {};

        for (let i = 0; i < children.length; i += 2) {
            if (children[i].tagName === 'key') {
                const key = children[i].textContent;
                const valueElement = children[i + 1];
                const type = valueElement.tagName;
                const value = valueElement.textContent;
                parsedData[key] = { type, value, originalType: type };
            }
        }
        
        playerId = parsedData['last_account_id'] ? parsedData['last_account_id'].value : "";
        unlockedSkins.clear();
        unlockedCharacters.clear();
        unlockedSkills.clear();
        newlyUnlockedSkills.clear();
        newlyLockedSkills.clear();

        if (playerId) {
            const skillRegex = new RegExp(`^${playerId}_c_(.+)_skill_(\\d+)_unlock$`);
            for (const key in parsedData) {
                const data = parsedData[key];

                const skillMatch = key.match(skillRegex);
                if (skillMatch) {
                    const characterName = skillMatch[1];
                    const skillNumber = parseInt(skillMatch[2], 10);
                    const isUnlocked = data.value === '1';

                    if (!unlockedSkills.has(characterName)) {
                        unlockedSkills.set(characterName, new Map());
                    }
                    unlockedSkills.get(characterName).set(skillNumber, isUnlocked);
                    continue;
                }

                const keyParts = key.split('_');
                if (keyParts.length === 3 && keyParts[0] === playerId) {
                    if (keyParts[1].startsWith('c') && keyParts[2] === 'unlock') {
                        if (data.type === 'true' || String(data.value).toLowerCase() === 'true') {
                            unlockedCharacters.add(parseInt(keyParts[1].substring(1)));
                        }
                    } else if (data.value === '1') {
                        unlockedSkins.add(`_${keyParts[1]}_${keyParts[2]}`);
                    }
                }
            }
        }

        const gemsKey = `${playerId}_gems`;
        if (parsedData[gemsKey]) {
            gemsValue.textContent = parsedData[gemsKey].value;
        } else {
            gemsValue.textContent = "0";
        }

        renderTable(parsedData);
        renderCharacters(charactersData);
    });

    function renderTable(data) {
        tableContainer.innerHTML = "";
        const table = document.createElement("table");
        const thead = document.createElement("thead");
        const tbody = document.createElement("tbody");

        const headerRow = document.createElement("tr");
        const keyHeader = document.createElement("th");
        keyHeader.textContent = "Key";
        const valueHeader = document.createElement("th");
        valueHeader.textContent = "Value";
        const typeHeader = document.createElement("th");
        typeHeader.textContent = "Type";
        headerRow.appendChild(keyHeader);
        headerRow.appendChild(valueHeader);
        headerRow.appendChild(typeHeader);
        thead.appendChild(headerRow);

        for (const key in data) {
            const row = document.createElement("tr");
            const keyCell = document.createElement("td");
            keyCell.textContent = key;
            const valueCell = document.createElement("td");
            valueCell.textContent = data[key].value;
            valueCell.contentEditable = "true";
            valueCell.addEventListener("input", (e) => {
                parsedData[key].value = e.target.textContent;
                changedKeys.add(key);
            });
            const typeCell = document.createElement("td");
            typeCell.textContent = data[key].type;
            row.appendChild(keyCell);
            row.appendChild(valueCell);
            row.appendChild(typeCell);
            tbody.appendChild(row);
        }

        table.appendChild(thead);
        table.appendChild(tbody);
        tableContainer.appendChild(table);
    }

    updateButton.addEventListener("click", () => {
        let updatedXml = xmlInput.value;
        let newKeysXml = "";

        for (const key of changedKeys) {
            if (parsedData[key]) {
                const { type: newType, value, originalType } = parsedData[key];
                const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

                const searchRegex = new RegExp(
                    `(<key>${escapedKey}<\\/key>\\s*)(<${originalType}>.*?<\\/${originalType}>|<${originalType}\\/>)`,
                    "s"
                );

                const escapedValue = String(value)
                    .replace(/&/g, "&")
                    .replace(/</g, "<")
                    .replace(/>/g, ">")
                    .replace(/"/g, '"')
                    .replace(/'/g, "'");
                
                const replacementString = `$1<${newType}>${escapedValue}</${newType}>`;

                if (updatedXml.match(searchRegex)) {
                    updatedXml = updatedXml.replace(searchRegex, replacementString);
                } else {
                    newKeysXml += `    <key>${key}</key>\n    <${newType}>${escapedValue}</${newType}>\n`;
                }
            }
        }

        if (newKeysXml) {
            updatedXml = updatedXml.replace(/<\/dict>/, `${newKeysXml}</dict>`);
        }

        xmlOutput.value = updatedXml;
        xmlInput.value = updatedXml;

        changedKeys.clear();
        newlyUnlocked.clear();
        newlyLocked.clear();
        newlyUnlockedCharacters.clear();
        newlyLockedCharacters.clear();
        newlyUnlockedSkills.clear();
        newlyLockedSkills.clear();
        renderChanges();
    });


    gemsValue.addEventListener("input", (e) => {
        const newValue = e.target.textContent;
        const gemsKey = `${playerId}_gems`;
        const lastGemsKey = `${playerId}_last_gems`;

        if (parsedData[gemsKey] && parsedData[gemsKey].value !== newValue) {
            parsedData[gemsKey].value = newValue;
            changedKeys.add(gemsKey);
        } else if (!parsedData[gemsKey]) {
            parsedData[gemsKey] = { type: 'integer', value: newValue };
            changedKeys.add(gemsKey);
        }

        if (parsedData[lastGemsKey] && parsedData[lastGemsKey].value !== newValue) {
            parsedData[lastGemsKey].value = newValue;
            changedKeys.add(lastGemsKey);
        } else if (!parsedData[lastGemsKey]) {
            parsedData[lastGemsKey] = { type: 'integer', value: newValue };
            changedKeys.add(lastGemsKey);
        }
    });

    keySearchBar.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = {};
        for (const key in parsedData) {
            if (key.toLowerCase().includes(searchTerm)) {
                filteredData[key] = parsedData[key];
            }
        }
        renderTable(filteredData);
    });

    function renderChanges() {
        const addedList = document.getElementById("added-skins-list");
        const removedList = document.getElementById("removed-skins-list");
        addedList.innerHTML = "";
        removedList.innerHTML = "";

        for (const [skinId, skinData] of newlyUnlocked.entries()) {
            const li = document.createElement("li");
            li.addEventListener('click', () => toggleSkinById(skinId));
            const img = document.createElement("img");
            img.src = skinData.url;
            img.alt = skinData.name;
            img.classList.add("skin-gif-small");
            const text = document.createElement("span");
            text.textContent = `${skinData.name} (Index: ${skinData.index}, ID: ${skinId})`;
            li.appendChild(img);
            li.appendChild(text);
            addedList.appendChild(li);
        }

        for (const [skillId, skillData] of newlyUnlockedSkills.entries()) {
            const li = document.createElement("li");
            li.addEventListener('click', () => toggleSkill(skillData.characterName, skillData.skillNumber));
            const text = document.createElement("span");
            text.textContent = `${skillData.characterName} - Skill ${skillData.skillNumber}`;
            li.appendChild(text);
            addedList.appendChild(li);
        }

        for (const [charId, charData] of newlyUnlockedCharacters.entries()) {
            const li = document.createElement("li");
            li.addEventListener('click', () => toggleCharacterById(charId, charData.name));
            const text = document.createElement("span");
            text.textContent = `${charData.name} (ID: c${charId})`;
            li.appendChild(text);
            addedList.appendChild(li);
        }

        for (const [skinId, skinData] of newlyLocked.entries()) {
            const li = document.createElement("li");
            li.addEventListener('click', () => toggleSkinById(skinId));
            const img = document.createElement("img");
            img.src = skinData.url;
            img.alt = skinData.name;
            img.classList.add("skin-gif-small");
            const text = document.createElement("span");
            text.textContent = `${skinData.name} (Index: ${skinData.index}, ID: ${skinId})`;
            li.appendChild(img);
            li.appendChild(text);
            removedList.appendChild(li);
        }

        for (const [charId, charData] of newlyLockedCharacters.entries()) {
            const li = document.createElement("li");
            li.addEventListener('click', () => toggleCharacterById(charId, charData.name));
            const text = document.createElement("span");
            text.textContent = `${charData.name} (ID: c${charId})`;
            li.appendChild(text);
            removedList.appendChild(li);
        }

        for (const [skillId, skillData] of newlyLockedSkills.entries()) {
            const li = document.createElement("li");
            li.addEventListener('click', () => toggleSkill(skillData.characterName, skillData.skillNumber));
            const text = document.createElement("span");
            text.textContent = `${skillData.characterName} - Skill ${skillData.skillNumber}`;
            li.appendChild(text);
            removedList.appendChild(li);
        }
    }
});
