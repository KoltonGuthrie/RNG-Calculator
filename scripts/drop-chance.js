// Enable vertical mouse wheel to scroll horizontally in #mutation-tags
document.addEventListener('DOMContentLoaded', function() {
    const tagsContainer = document.getElementById('mutation-tags');
    if (tagsContainer) {
        tagsContainer.addEventListener('wheel', function(e) {
            if (e.deltaY !== 0) {
                // Increase scroll speed (e.g., 3x)
                tagsContainer.scrollLeft += e.deltaY * 3;
                e.preventDefault();
            }
        }, { passive: false });
    }
});
import { format, parse } from 'https://cdn.skypack.dev/lua-json';

function parseLuauTable(luauText) {
    try {
        // Remove 'local ... = require(...)' and 'local ... = ...' for compatibility
        let text = luauText.replace(/^\s*local\s+[^=]+\s*=\s*require\([^)]*\).*$/gm, '');
        text = text.replace(/^\s*local\s+[^=]+\s*=.*$/gm, '');
        // Remove 'local ...' for compatibility (legacy)
        text = text.replace(/local [^=]+=[^;]+;/g, '');
        // Replace [MutationTypes.X] with ["X"] (preserve brackets)
        text = text.replace(/\[\s*MutationTypes\.([A-Za-z0-9_]+)\s*\]/g, '["$1"]');
        // Also handle any direct MutationTypes.X (no brackets) with just "X"
        text = text.replace(/MutationTypes\.([A-Za-z0-9_]+)/g, '"$1"');
        // Remove underscores in numbers (e.g., 400_000 -> 400000)
        text = text.replace(/(\d)_(\d)/g, '$1$2');
        // Ensure it starts with 'return '
        text = text.trim();
        if (!text.startsWith('return')) {
            text = 'return ' + text;
        }

        console.log(text)
        return parse(text);
    } catch (e) {
        console.error(e);
        return null;
    }
}

function getImprovedOdds(odds, luck) {
    // odds: 1 in X
    // ImprovedChance = (1/X) * (1 + (Luck/100))
    // New odds: 1 / ImprovedChance
    const baseChance = 1 / odds;
    const improvedChance = baseChance * (1 + (luck / 100));
    return 1 / improvedChance;
}

function normalizeSearch(str) {
    return str.toLowerCase().replace(/_/g, ' ');
}

// Removed duplicate/old renderDropChancesTable definition
function getMutationClass(mutation) {
    const m = mutation.toLowerCase();
    if (m === 'giant') return 'mutation-giant';
    if (m === 'golden') return 'mutation-golden';
    if (m === 'corrupt' || m === 'corrupted') return 'mutation-corrupt';
    if (m === 'ethereal') return 'mutation-ethereal';
    return '';
}

function renderDropChancesTable(parsed, luck, searchTerm = '', mutationFilter = null) {
    const search = normalizeSearch(searchTerm.trim());
    let html = '';
    for (const tree in parsed) {
        let treeBlock = '';
        const mutations = parsed[tree];
        for (const mutation in mutations) {
            // If mutationFilter is set and not empty, skip mutations not in filter
            if (mutationFilter && Array.isArray(mutationFilter) && mutationFilter.length > 0 && !mutationFilter.includes(mutation)) continue;
            let mutationBlock = '';
            const drops = mutations[mutation];
            let dropRows = '';
            for (const drop of drops) {
                // Search filter: match tree, mutation, or drop.Id (normalize underscores)
                if (search && !(
                    normalizeSearch(tree).includes(search) ||
                    normalizeSearch(mutation).includes(search) ||
                    normalizeSearch(drop.Id).includes(search)
                )) continue;
                const orig = drop.Odds;
                const improved = getImprovedOdds(orig, luck);
                dropRows += `<tr><td>${drop.Id}</td><td>1 in ${orig.toLocaleString()}</td><td>1 in ${improved.toLocaleString(undefined, {maximumFractionDigits:2})}</td></tr>`;
            }
            if (dropRows) {
                // Add mutation class for color
                const mutationClass = getMutationClass(mutation);
                mutationBlock += `<div class="mutation-block ${mutationClass}"><span class="mutation-label ${mutationClass}">${mutation}</span><table><thead><tr><th>Item</th><th>Original Odds</th><th>Improved Odds</th></tr></thead><tbody>${dropRows}</tbody></table></div>`;
            }
            treeBlock += mutationBlock;
        }
        if (treeBlock) {
            html += `<div class="tree-block"><h3>${tree}</h3>${treeBlock}</div>`;
        }
    }
    if (!html) html = '<div style="color:#f66">No drops found for this search.</div>';
    return html;
}


const petChanceInput = document.getElementById('petChance');
const luauInput = document.getElementById('luauInput');
const luckInput = document.getElementById('luck');
const resultDiv = document.getElementById('result');
let resultSearchInput = null;
let lastParsed = null;
let lastLuck = 0;
const sidebar = document.getElementById('sidebar');
const resultContainer = document.getElementById('result-container');

// .empty logic removed

let mutationFilter = [];
// Toggle Luau input visibility (summary section removed)
const toggleLuauInputBtn = document.getElementById('toggleLuauInput');
const luauInputSection = document.getElementById('luauInputSection');
toggleLuauInputBtn.addEventListener('click', function() {
    const isHidden = luauInputSection.style.display === 'none';
    luauInputSection.style.display = isHidden ? '' : 'none';
    toggleLuauInputBtn.textContent = isHidden ? 'Hide Luau Drops Table' : 'Show Luau Drops Table';
    if (isHidden) setTimeout(() => luauInput.focus(), 100);
});

// Set search input reference after DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    resultSearchInput = document.getElementById('resultSearch');
});

function updatePetChanceRequired() {
    // If Luau table is empty, require pet chance. If Luau table is filled, do not require pet chance.
    if (luauInput.value.trim().length > 0) {
        petChanceInput.required = false;
        petChanceInput.classList.remove('required-highlight');
    } else {
        petChanceInput.required = true;
    }
}


luauInput.addEventListener('input', updatePetChanceRequired);
updatePetChanceRequired();




// Attach search listener after DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (!resultSearchInput) resultSearchInput = document.getElementById('resultSearch');
    if (resultSearchInput) {
        resultSearchInput.addEventListener('input', function() {
            if (!lastParsed) return;
            resultDiv.innerHTML = renderDropChancesTable(lastParsed, lastLuck, resultSearchInput.value);
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Mutation tag filter logic
    const mutationTagsDiv = document.getElementById('mutation-tags');
    let allMutations = [];
    let selectedMutations = [];

    function updateMutationTags(parsed) {
        if (!parsed) {
            mutationTagsDiv.innerHTML = '';
            return;
        }
        // Collect all unique mutations
        const mutationSet = new Set();
        for (const tree in parsed) {
            for (const mutation in parsed[tree]) {
                mutationSet.add(mutation);
            }
        }
        allMutations = Array.from(mutationSet);
        // Render tag buttons
        mutationTagsDiv.innerHTML = allMutations.map(mutation => {
            const mutationClass = getMutationClass(mutation);
            const selected = selectedMutations.includes(mutation) ? 'selected' : '';
            return `<button class="mutation-tag-btn ${mutationClass} ${selected}" data-mutation="${mutation}" style="min-width:80px;max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${mutation}</button>`;
        }).join('');
        // Make container horizontally scrollable
        mutationTagsDiv.style.display = 'flex';
        mutationTagsDiv.style.flexDirection = 'row';
        mutationTagsDiv.style.overflowX = 'auto';
        mutationTagsDiv.style.overflowY = 'hidden';
        mutationTagsDiv.style.flexWrap = 'nowrap';
        mutationTagsDiv.style.gap = '0.2em';
        // Add event listeners
        Array.from(mutationTagsDiv.querySelectorAll('button')).forEach(btn => {
            btn.addEventListener('click', function() {
                const mut = this.getAttribute('data-mutation');
                if (selectedMutations.includes(mut)) {
                    selectedMutations = selectedMutations.filter(m => m !== mut);
                } else {
                    selectedMutations.push(mut);
                }
                // Rerender tags for visual update
                updateMutationTags(lastParsed);
                // Rerender results with filter
                resultDiv.innerHTML = renderDropChancesTable(lastParsed, lastLuck, resultSearchInput ? resultSearchInput.value : '', selectedMutations);
            });
        });
    }

    // Attach Calculate button handler (chanceForm submit)

    document.getElementById('chanceForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const luauText = luauInput.value.trim();
        const petChance = parseFloat(petChanceInput.value);
        const luck = parseFloat(luckInput.value);

        // If pet chance is provided and valid, do pet chance calculation
        if (petChance && petChance > 0 && !isNaN(petChance)) {
            petChanceInput.classList.remove('required-highlight');
            // PetChance = 1 / X
            const baseChance = 1 / petChance;
            // ImprovedChance = PetChance * (1 + (Luck / 100))
            const improvedChance = baseChance * (1 + (luck / 100));
            const oneIn = 1 / improvedChance;
            const percent = improvedChance * 100;
            // Format numbers
            const oneInFormatted = oneIn.toLocaleString(undefined, { maximumFractionDigits: 2 });
            const percentFormatted = percent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 });
            const baseOneInFormatted = petChance.toLocaleString();
            const basePercentFormatted = (baseChance * 100).toLocaleString(undefined, { minimumFractionDigits: 5, maximumFractionDigits: 5 });
            const luckFormatted = luck.toLocaleString(undefined, { maximumFractionDigits: 2 });
            resultDiv.innerHTML =
                `<div>Original Chance: 1 in <b>${baseOneInFormatted}</b> (${basePercentFormatted}%)</div>` +
                `<div>Luck Bonus: <b>${luckFormatted}%</b></div>` +
                `<div>Improved Chance: 1 in <b>${oneInFormatted}</b> (<b>${percentFormatted}%</b>)</div>`;
            lastParsed = null;
            lastLuck = 0;
            mutationTagsDiv.innerHTML = '';
            selectedMutations = [];
            // updateResultContainerMinHeight();
            return;
        }

        // If no valid pet chance, but Luau table is provided, show drop results
        if (luauText.length > 0) {
            const parsed = parseLuauTable(luauText);
            lastParsed = parsed;
            lastLuck = isNaN(luck) ? 0 : luck;
            if (!resultSearchInput) resultSearchInput = document.getElementById('resultSearch');
            // Update mutation tags
            updateMutationTags(parsed);
            // Render with filter
            resultDiv.innerHTML = renderDropChancesTable(parsed, lastLuck, resultSearchInput ? resultSearchInput.value : '', selectedMutations);
            // updateResultContainerMinHeight();
            return;
        }

        // If neither, show error
        resultDiv.textContent = 'Please enter a valid Pet Chance greater than 0 or paste a Luau drops table.';
        petChanceInput.classList.add('required-highlight');
        mutationTagsDiv.innerHTML = '';
        selectedMutations = [];
        // updateResultContainerMinHeight();
    });

    // When searching, re-render with mutation filter
    if (!resultSearchInput) resultSearchInput = document.getElementById('resultSearch');
    if (resultSearchInput) {
        resultSearchInput.addEventListener('input', function() {
            if (!lastParsed) return;
            resultDiv.innerHTML = renderDropChancesTable(lastParsed, lastLuck, resultSearchInput.value, selectedMutations);
            // updateResultContainerMinHeight();
        });
    }

    // .empty logic removed
});
