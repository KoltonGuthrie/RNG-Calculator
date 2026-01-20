document.getElementById('chanceForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const petChance = parseFloat(document.getElementById('petChance').value);
    const luck = parseFloat(document.getElementById('luck').value);
    if (petChance > 0) {
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
        document.getElementById('result').innerHTML =
            `<div>Original Chance: 1 in <b>${baseOneInFormatted}</b> (${basePercentFormatted}%)</div>` +
            `<div>Luck Bonus: <b>${luckFormatted}%</b></div>` +
            `<div>Improved Chance: 1 in <b>${oneInFormatted}</b> (<b>${percentFormatted}%</b>)</div>`;
    } else {
        document.getElementById('result').textContent = 
            'Please enter a valid Pet Chance greater than 0.';
    }
});
