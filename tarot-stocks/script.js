document.addEventListener("DOMContentLoaded", () => {
    let tarotData = [];
    fetch("data.json")
        .then(response => response.json())
        .then(jsonData => {
            tarotData = jsonData;
            populateTable(tarotData);
            populateCardDetails(tarotData);
        })
    const searchInput = document.getElementById("searchInput");
    const randomButton = document.getElementById("randomButton");
    const tableBody = document.getElementById("tableBody");
    const cardDetailsContainer = document.getElementById(
        "card-details-container"
    );
    let randomButtonPressed = false;

    function populateTable(data) {
        tableBody.innerHTML = "";
        if (data.length === 0) {
            tableBody.innerHTML =
                '<tr><td colspan="5" style="text-align:center; padding: 40px; color: #777;">No cards match your search.</td></tr>';
            return;
        }

        data.forEach((card) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${card.name}</td>
                <td>${card.core}</td>
                <td>${card.coreRev}</td>
                <td>${card.interp}</td>
                <td>${card.interpRev}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    function populateCardDetails(data) {
        cardDetailsContainer.innerHTML = "";
        if (data.length === 0) {
            return;
        }

        if (data.length > 0) {
            const copyButton = document.createElement("button");
            copyButton.textContent = "Copy to Clipboard";
            copyButton.classList.add("copy-btn");
            cardDetailsContainer.appendChild(copyButton);
        }

        data.forEach((card, index) => {
            const detailDiv = document.createElement("div");
            detailDiv.classList.add("card-detail");
            detailDiv.dataset.cardName = card.name;

            const isReversed = randomButtonPressed && Math.random() > 0.775;

            detailDiv.innerHTML = `
                <h3>${index + 1}. ${card.name}${
                isReversed ? " (Reversed)" : ""
            }</h3>
                <p><strong>Meaning:</strong> ${
                    isReversed ? card.coreRev : card.core
                }</p>
                <p><strong>Stock:</strong> ${
                    isReversed ? card.interpRev : card.interp
                }</p>
            `;
            cardDetailsContainer.appendChild(detailDiv);
        });

        if (data.length > 0) {
            const copyButton = document.createElement("button");
            copyButton.textContent = "Copy to Clipboard";
            copyButton.classList.add("copy-btn");
            cardDetailsContainer.appendChild(copyButton);
        }
    }

    function filterData() {
        const query = searchInput.value.toLowerCase().trim();

        if (!query) {
            populateTable(tarotData);
            populateCardDetails(tarotData);
            randomButtonPressed = false;
            return;
        }

        const searchTerms = query
            .split(",")
            .map((term) => term.trim())
            .filter((term) => term.length > 0);

        if (searchTerms.length === 0) {
            populateTable(tarotData);
            populateCardDetails(tarotData);
            return;
        }

        const filteredData = [];
        const addedCardNames = new Set();

        searchTerms.forEach((term) => {
            const foundCard = tarotData.find((card) => {
                if (addedCardNames.has(card.name)) {
                    return false;
                }

                const cardNameLower = card.name.toLowerCase();
                const termWords = term.split(/\s+/).filter((w) => w.length > 0);

                if (termWords.length === 0) return false;

                return termWords.every((word) => {
                    const isRoman = /^[ivx]+$/.test(word);
                    if (isRoman) {
                        const regex = new RegExp("\\b" + word + "\\b");
                        return regex.test(cardNameLower);
                    } else {
                        return cardNameLower.includes(word);
                    }
                });
            });

            if (foundCard) {
                filteredData.push(foundCard);
                addedCardNames.add(foundCard.name);
            }
        });

        populateTable(filteredData);
        populateCardDetails(filteredData);
    }

    cardDetailsContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("copy-btn")) {
            const details =
                cardDetailsContainer.querySelectorAll(".card-detail");
            const cardNames = Array.from(details).map(
                (detail) => detail.dataset.cardName
            );
            const searchQuery = cardNames.join(", ");

            let textToCopy = `${searchQuery}\n\n`;

            details.forEach((detail) => {
                const title = detail.querySelector("h3").textContent.trim();
                const meaningHTML = detail.querySelector(
                    "p:nth-of-type(1)"
                ).innerHTML;
                const stockHTML = detail.querySelector(
                    "p:nth-of-type(2)"
                ).innerHTML;

                const meaning = meaningHTML
                    .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
                    .trim();
                const stock = stockHTML
                    .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
                    .trim();
                textToCopy += `${title}\n${meaning}\n${stock}\n\n`;
            });

            navigator.clipboard.writeText(textToCopy.trim()).then(() => {
                const originalText = e.target.textContent;
                e.target.textContent = "Copied!";
                setTimeout(() => {
                    e.target.textContent = originalText;
                }, 2000);
            });
            return;
        }

        const cardDetailDiv = e.target.closest(".card-detail");
        if (!cardDetailDiv) return;

        const cardName = cardDetailDiv.dataset.cardName;
        const card = tarotData.find((c) => c.name === cardName);
        const h3 = cardDetailDiv.querySelector("h3");
        const isReversed = h3.textContent.includes("(Reversed)");

        if (isReversed) {
            const originalName = h3.textContent
                .replace(" (Reversed)", "")
                .split(". ")[1];
            h3.innerHTML = `${Array.from(
                cardDetailDiv.parentNode.children
            ).indexOf(cardDetailDiv)}. ${originalName}`;
            cardDetailDiv.querySelector(
                "p:nth-of-type(1)"
            ).innerHTML = `<strong>Meaning:</strong> ${card.core}`;
            cardDetailDiv.querySelector(
                "p:nth-of-type(2)"
            ).innerHTML = `<strong>Stock:</strong> ${card.interp}`;
        } else {
            h3.textContent += " (Reversed)";
            cardDetailDiv.querySelector(
                "p:nth-of-type(1)"
            ).innerHTML = `<strong>Meaning:</strong> ${card.coreRev}`;
            cardDetailDiv.querySelector(
                "p:nth-of-type(2)"
            ).innerHTML = `<strong>Stock:</strong> ${card.interpRev}`;
        }
    });

    searchInput.addEventListener("input", filterData);

    randomButton.addEventListener("click", () => {
        randomButtonPressed = true;
        const shuffled = tarotData.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 5);
        searchInput.value = selected.map((c) => c.name).join(", ");
        filterData();
    });

    populateTable(tarotData);
    populateCardDetails(tarotData);
});
