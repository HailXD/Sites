const AES_KEY = "x0i2O7WRiANTqPmZ";

const downloadBlob = (blob, filename) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
};
const showError   = msg => { alert(msg); console.error(msg); };

const decryptText = ciphertext =>
    CryptoJS.AES.decrypt(ciphertext, AES_KEY).toString(CryptoJS.enc.Utf8);

const encryptText = plaintext =>
    CryptoJS.AES.encrypt(CryptoJS.enc.Latin1.parse(plaintext), AES_KEY).toString();

window.onload = () => {
    const fileInput = document.getElementById("file");

    document.getElementById("encryptBtn")
        .addEventListener("click", () => handleEncrypt(fileInput.files[0]));
    document.getElementById("decryptBtn")
        .addEventListener("click", () => handleDecrypt(fileInput.files[0]));

    if (new URLSearchParams(window.location.search).has("hail")) {
        document.getElementById("advanced-options").style.display = "block";
        document.getElementById("healBtn")
            .addEventListener("click", () => handleHeal(fileInput.files[0]));
        document.getElementById("addMasterBtn")
            .addEventListener("click", () => handleAddMaster(fileInput.files[0]));
        document.getElementById("addRogueBtn")
            .addEventListener("click", () => handleAddRogue(fileInput.files[0]));
        document.getElementById("skipFloorBtn")
            .addEventListener("click", () => handleSkipFloor(fileInput.files[0]));
        document.getElementById("skipFloorWaveBtn")
            .addEventListener("click", () => handleSkipFloorAndWave(fileInput.files[0]));
    }
};

function handleDecrypt(file) {
    if (!file) return showError("Please select a file.");

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const plaintext   = decryptText(e.target.result);
            const jsonContent = JSON.parse(plaintext);
            const blob        = new Blob([JSON.stringify(jsonContent, null, 2)],
                                         { type: "application/json" });
            const filename =
                file.name.startsWith("data")        ? "data_Guest.json" :
                file.name.startsWith("sessionData") ? "sessionData_Guest.json" :
                                                      "decrypted_data.json";
            downloadBlob(blob, filename);
        } catch {
            showError("Error: Failed to decrypt or parse JSON.");
        }
    };
    reader.readAsText(file);
}

function handleEncrypt(file) {
    if (!file) return showError("Please select a file.");

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const ciphertext = encryptText(e.target.result);
            const blob = new Blob([ciphertext], { type: "application/octet-stream" });

            const ext      = file.name.endsWith(".json") ? "prsv" : "json";
            const filename = file.name.replace(/\.[^/.]+$/, `.${ext}`);
            downloadBlob(blob, filename);
        } catch { showError("Error: Failed to encrypt."); }
    };
    reader.readAsBinaryString(file);
}

function handleHeal(file) {
    if (!file) return showError("Please select a file.");

    const reader = new FileReader();
    reader.onload = e => {
        try {
            let data = file.name.endsWith(".prsv")
                       ? JSON.parse(decryptText(e.target.result))
                       : JSON.parse(e.target.result);

            if (Array.isArray(data.party)) {
                data.party.forEach(p => {
                    if (Array.isArray(p.stats) && p.stats.length) p.hp = p.stats[0];
                    p.status = null;
                });
            }

            const blob = new Blob([encryptText(JSON.stringify(data))],
                                  { type: "application/octet-stream" });
            const base = file.name.replace(/\.[^/.]+$/, "");
            downloadBlob(blob, `${base}_HealUp.prsv`);
        } catch { showError("Error: Failed to process Heal Up operation."); }
    };
    reader.readAsText(file);
}

function handleAddMaster(file) {
    if (!file) return showError("Please select a file.");

    const reader = new FileReader();
    reader.onload = e => {
        try {
            let data = file.name.endsWith(".prsv")
                       ? JSON.parse(decryptText(e.target.result))
                       : JSON.parse(e.target.result);

            data.pokeballCounts ??= {};
            data.pokeballCounts["4"] = (data.pokeballCounts["4"] || 0) + 1;

            const blob = new Blob([encryptText(JSON.stringify(data))],
                                  { type: "application/octet-stream" });
            const base = file.name.replace(/\.[^/.]+$/, "");
            downloadBlob(blob, `${base}_PlusMaster.prsv`);
        } catch { showError("Error: Failed to add Master Ball."); }
    };
    reader.readAsText(file);
}

function handleAddRogue(file) {
    if (!file) return showError("Please select a file.");

    const reader = new FileReader();
    reader.onload = e => {
        try {
            let data = file.name.endsWith(".prsv")
                       ? JSON.parse(decryptText(e.target.result))
                       : JSON.parse(e.target.result);

            data.pokeballCounts ??= {};
            data.pokeballCounts["3"] = (data.pokeballCounts["3"] || 0) + 10;

            const blob = new Blob([encryptText(JSON.stringify(data))],
                                  { type: "application/octet-stream" });
            const base = file.name.replace(/\.[^/.]+$/, "");
            downloadBlob(blob, `${base}_PlusRogue.prsv`);
        } catch { showError("Error: Failed to add Rogue Balls."); }
    };
    reader.readAsText(file);
}

function handleSkipFloor(file) {
    if (!file) return showError("Please select a file.");

    const reader = new FileReader();
    reader.onload = e => {
        try {
            let data = file.name.endsWith(".prsv")
                       ? JSON.parse(decryptText(e.target.result))
                       : JSON.parse(e.target.result);

            if (Array.isArray(data.enemyParty) && data.enemyParty.length) {
                data.enemyParty = [data.enemyParty[0]];
                data.enemyParty[0].hp = 1;
                data.enemyParty[0].moveset = [];
                // data.enemyParty[0].boss = false;
            }
            
            // data.trainer = {};
            // data.battleType = 0;
            const blob = new Blob([encryptText(JSON.stringify(data))],
                                  { type: "application/octet-stream" });
            const base = file.name.replace(/\.[^/.]+$/, "");
            downloadBlob(blob, `${base}_SkipFloor.prsv`);
        } catch { showError("Error: Failed to process Skip Floor operation."); }
    };
    reader.readAsText(file);
}

function handleSkipFloorAndWave(file) {
    if (!file) return showError("Please select a file.");

    const reader = new FileReader();
    reader.onload = e => {
        try {
            let data = file.name.endsWith(".prsv")
                       ? JSON.parse(decryptText(e.target.result))
                       : JSON.parse(e.target.result);

            if (Array.isArray(data.enemyParty) && data.enemyParty.length) {
                data.enemyParty = [data.enemyParty[0]];
                data.enemyParty[0].hp = 1;
                data.enemyParty[0].boss = false;
            }

            if (typeof data.waveIndex === "number" && data.waveIndex > 0) {
                data.waveIndex -= 1;
            }

            data.trainer = {}
            data.battleType = 0;
            const blob = new Blob([encryptText(JSON.stringify(data))],
                                  { type: "application/octet-stream" });
            const base = file.name.replace(/\.[^/.]+$/, "");
            downloadBlob(blob, `${base}_Backtrack.prsv`);
        } catch { showError("Error: Failed to process Skip Floor & Wave operation."); }
    };
    reader.readAsText(file);
}
