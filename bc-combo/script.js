// Global data storage
let catsData = [];
let combosData = [];
let catHierarchy = {};
let effectTypes = [];
let allCombosWithDetails = [];

// GitHub URLs
const GITHUB_CATS_URL = 'cats.tsv';
const GITHUB_COMBOS_URL = 'combos.tsv';

// Load data from GitHub automatically on page load
window.addEventListener('DOMContentLoaded', () => {
    loadDataFromGitHub();
});

async function loadDataFromGitHub() {
    showDataStatus('Loading data from GitHub...', 'loading');
    
    try {
        // Fetch both files
        const [catsResponse, combosResponse] = await Promise.all([
            fetch(GITHUB_CATS_URL),
            fetch(GITHUB_COMBOS_URL)
        ]);

        if (!catsResponse.ok || !combosResponse.ok) {
            throw new Error('Failed to fetch data from GitHub');
        }

        const catsText = await catsResponse.text();
        const combosText = await combosResponse.text();

        // Parse the data
        catsData = parseTSV(catsText);
        combosData = parseTSV(combosText);

        // Process the data
        buildCatHierarchy();
        extractEffectTypes();
        processAllCombos();

        showDataStatus(`✅ Loaded ${catsData.length} cats and ${combosData.length} combos successfully!`, 'success');
        
        // Show main controls
        document.getElementById('mainControls').classList.remove('hidden');
        
        // Populate effect types dropdown
        populateEffectTypes();

    } catch (error) {
        showDataStatus('❌ Error loading data from GitHub: ' + error.message, 'error');
        console.error('Error:', error);
    }
}

function toggleManualUpload() {
    const uploadDiv = document.getElementById('manualUpload');
    uploadDiv.classList.toggle('hidden');
}

async function loadLocalFiles() {
    const catsFile = document.getElementById('catsFile').files[0];
    const combosFile = document.getElementById('combosFile').files[0];
    
    if (!catsFile || !combosFile) {
        showDataStatus('Please select both files', 'error');
        return;
    }
    
    showDataStatus('Loading local files...', 'loading');
    
    try {
        const catsText = await catsFile.text();
        const combosText = await combosFile.text();
        
        catsData = parseTSV(catsText);
        combosData = parseTSV(combosText);
        
        buildCatHierarchy();
        extractEffectTypes();
        processAllCombos();
        
        showDataStatus(`✅ Loaded ${catsData.length} cats and ${combosData.length} combos from local files!`, 'success');
        
        document.getElementById('mainControls').classList.remove('hidden');
        populateEffectTypes();
        
    } catch (error) {
        showDataStatus('❌ Error loading files: ' + error.message, 'error');
    }
}

// Parse TSV text to array of objects
function parseTSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split('\t');
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('\t');
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        data.push(row);
    }
    
    return data;
}

function showDataStatus(message, type) {
    const statusDiv = document.getElementById('dataStatus');
    statusDiv.textContent = message;
    statusDiv.className = `data-status ${type}`;
    statusDiv.classList.remove('hidden');
}

function buildCatHierarchy() {
    catHierarchy = {};
    
    catsData.forEach(row => {
        const forms = [];
        if (row['First']) forms.push(row['First']);
        if (row['Evolved']) forms.push(row['Evolved']);
        if (row['True']) forms.push(row['True']);
        if (row['Ultra']) forms.push(row['Ultra']);
        
        // Each cat can be satisfied by any of its evolved forms
        forms.forEach((form, i) => {
            if (!catHierarchy[form]) {
                catHierarchy[form] = new Set();
            }
            // Add all higher evolution forms
            for (let j = i; j < forms.length; j++) {
                catHierarchy[form].add(forms[j]);
            }
        });
    });
}

function parseEffectStrength(effect) {
    if (!effect) return [null, 0];
    
    const strengthMap = {
        '(Sm)': 1,
        '(S)': 1,
        '(M)': 2,
        '(L)': 3,
        '(XL)': 4
    };
    
    for (const [text, value] of Object.entries(strengthMap)) {
        if (effect.includes(text)) {
            const effectType = effect.replace(text, '').trim();
            return [effectType, value];
        }
    }
    
    // Handle special cases
    if (effect.includes('EffectUP')) {
        for (const [text, value] of Object.entries(strengthMap)) {
            if (effect.includes(text)) {
                const effectType = effect.split('EffectUP')[0].trim().replace(/"/g, '');
                return [effectType, value];
            }
        }
    }
    
    return [effect, 1];
}

function extractEffectTypes() {
    const types = new Set();
    
    combosData.forEach(combo => {
        const [effectType, _] = parseEffectStrength(combo['Effect']);
        if (effectType) {
            types.add(effectType);
        }
    });
    
    effectTypes = Array.from(types).sort();
}

function processAllCombos() {
    allCombosWithDetails = [];
    
    combosData.forEach(combo => {
        const [effectType, strength] = parseEffectStrength(combo['Effect']);
        const units = getComboUnits(combo);
        allCombosWithDetails.push({
            name: combo['Name'],
            effectType: effectType,
            strength: strength,
            units: units,
            unitCount: units.length,
            originalEffect: combo['Effect']
        });
    });
}

function populateEffectTypes() {
    const select = document.getElementById('effectType');
    select.innerHTML = '<option value="">All Effect Types</option>';
    
    effectTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        select.appendChild(option);
    });
}

function getComboUnits(combo) {
    const units = [];
    for (let i = 1; i <= 5; i++) {
        const unit = combo[`Unit${i}`];
        if (unit) {
            units.push(unit);
        }
    }
    return units;
}

function* getCombinations(array, size) {
    if (size === 1) {
        for (const element of array) {
            yield [element];
        }
    } else {
        for (let i = 0; i <= array.length - size; i++) {
            for (const combination of getCombinations(array.slice(i + 1), size - 1)) {
                yield [array[i], ...combination];
            }
        }
    }
}

function findCombinations() {
    const effectType = document.getElementById('effectType').value;
    const targetStrength = parseInt(document.getElementById('strength').value);
    const maxCats = parseInt(document.getElementById('maxCats').value);
    
    hideError();
    hideResults();
    showLoading();
    
    // Use setTimeout to allow UI to update
    setTimeout(() => {
        try {
            const results = findComboCombinations(effectType, targetStrength, maxCats);
            hideLoading();
            showResults(results, effectType);
        } catch (error) {
            hideLoading();
            showError('Error finding combinations: ' + error.message);
        }
    }, 10);
}

function findComboCombinations(targetEffectType, targetStrength, maxCats) {
    let matchingCombos = [];
    const results = [];
    const seenCatSets = new Set();
    
    if (targetEffectType) {
        // Specific effect type - only get combos of that type
        matchingCombos = allCombosWithDetails.filter(combo => 
            combo.effectType === targetEffectType
        );
    } else {
        // All effect types - get all combos
        matchingCombos = [...allCombosWithDetails];
    }
    
    // Sort by strength descending
    matchingCombos.sort((a, b) => b.strength - a.strength);
    
    // Try combinations of different numbers of combos (1 to 5)
    for (let comboCount = 1; comboCount <= Math.min(5, matchingCombos.length); comboCount++) {
        for (const comboCombination of getCombinations(matchingCombos, comboCount)) {
            // Calculate total strength by summing all combo strengths
            const totalStrength = comboCombination.reduce((sum, combo) => sum + combo.strength, 0);
            
            // Check if total strength meets requirement
            if (totalStrength >= targetStrength) {
                // Get all unique cats needed
                const allCats = new Set();
                const effectTypesUsed = new Set();
                
                comboCombination.forEach(combo => {
                    combo.units.forEach(unit => allCats.add(unit));
                    if (combo.effectType) effectTypesUsed.add(combo.effectType);
                });
                
                // Check if within cat limit
                if (allCats.size <= maxCats) {
                    const catsSorted = Array.from(allCats).sort();
                    const catsKey = catsSorted.join('|');
                    
                    // Avoid duplicate cat combinations
                    if (!seenCatSets.has(catsKey)) {
                        seenCatSets.add(catsKey);
                        
                        const comboDetails = comboCombination.map(c => ({
                            name: c.name,
                            effect: c.originalEffect,
                            strength: c.strength
                        }));
                        
                        results.push({
                            combos: comboDetails,
                            totalStrength: totalStrength,
                            cats: catsSorted,
                            catCount: allCats.size,
                            effectTypes: Array.from(effectTypesUsed).sort(),
                            comboCount: comboCombination.length
                        });
                        
                        // Limit results to prevent performance issues
                        if (results.length >= 100) break;
                    }
                }
            }
        }
        if (results.length >= 100) break;
    }
    
    // Sort results by efficiency
    results.sort((a, b) => {
        // First priority: fewer cats
        if (a.catCount !== b.catCount) return a.catCount - b.catCount;
        // Second priority: fewer combos
        if (a.comboCount !== b.comboCount) return a.comboCount - b.comboCount;
        // Third priority: higher total strength
        return b.totalStrength - a.totalStrength;
    });
    
    return results.slice(0, 50); // Return top 50 results
}

function showResults(results, searchedEffectType) {
    const resultsDiv = document.getElementById('results');
    const countDiv = document.getElementById('resultsCount');
    const listDiv = document.getElementById('resultsList');
    
    const searchDescription = searchedEffectType ? 
        `for "${searchedEffectType}"` : 
        'for all effect types (mixed combos allowed)';
    
    countDiv.textContent = `Found ${results.length} combination${results.length !== 1 ? 's' : ''} ${searchDescription}`;
    
    if (results.length === 0) {
        listDiv.innerHTML = '<div class="no-results">🔍 No combinations found for the selected criteria. Try adjusting your parameters.</div>';
    } else {
        listDiv.innerHTML = results.map((result, index) => {
            // Calculate individual effect contributions
            const effectBreakdown = {};
            result.combos.forEach(combo => {
                const [effectType, _] = parseEffectStrength(combo.effect);
                if (effectType) {
                    if (!effectBreakdown[effectType]) {
                        effectBreakdown[effectType] = 0;
                    }
                    effectBreakdown[effectType] += combo.strength;
                }
            });
            
            return `
                <div class="result-item" style="animation-delay: ${index * 0.05}s">
                    <div class="result-header">
                        <h3>Option ${index + 1}</h3>
                        <div class="result-stats">
                            <span class="stat">💪 Total Strength: ${result.totalStrength}</span>
                            <span class="stat">🐱 Cats: ${result.catCount}</span>
                            <span class="stat">🎯 Combos: ${result.combos.length}</span>
                            ${!searchedEffectType && Object.keys(effectBreakdown).length > 0 ? 
                                Object.entries(effectBreakdown).map(([type, strength]) => 
                                    `<span class="stat effect-type">✨ ${type}: ${strength}</span>`
                                ).join('') : ''}
                        </div>
                    </div>
                    <div class="result-content">
                        <div class="combo-section">
                            <h4>Active Combo${result.combos.length > 1 ? 's' : ''}</h4>
                            <ul class="combo-list">
                                ${result.combos.map(combo => 
                                    `<li>${combo.name} <span class="combo-effect">[${combo.effect}]</span></li>`
                                ).join('')}
                            </ul>
                        </div>
                        <div class="cats-section">
                            <h4>Required Cats</h4>
                            <div class="cats-grid">
                                ${result.cats.map(cat => `<span class="cat-name">${cat}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    resultsDiv.classList.remove('hidden');
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideError() {
    document.getElementById('error').classList.add('hidden');
}

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function hideResults() {
    document.getElementById('results').classList.add('hidden');
}

// Allow Enter key to trigger search
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !document.getElementById('mainControls').classList.contains('hidden')) {
        findCombinations();
    }
});