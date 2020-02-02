function oldDeck() {
    return document.getElementById("oldDeck")
}

function newDeck() {
    return document.getElementById("newDeck")
}

function goButton() {
    return document.getElementById("go")
}

function result() {
    return document.getElementById("result")
}

function parseDeckMarkdown(markdown) {
    function parseOneLine(line) {
        function matchIdentityCard(line) {
            const matches =
                line.match(/^\[([^\]]+)\]\(https:\/\/netrunnerdb.com\/en\/card\/(\d+)/)
            if (matches == null) return null
            if (matches.length != 3) return null
            if (matches[0] == null) return null
            if (matches[1] == null) return null
            if (matches[2] == null) return null
            return {
                name: matches[1],
                count: 1,
                id: matches[2]
            }
        }
        function matchNormalCard(line) {
            const matches =
                line.match(/^\s*\*\s*(\d+)\s*x\s*\[([^\]]+)\]\(https:\/\/netrunnerdb.com\/en\/card\/(\d+)/)
            if (matches == null) return null
            if (matches.length != 4) return null
            if (matches[0] == null) return null
            if (matches[1] == null) return null
            if (matches[2] == null) return null
            if (matches[3] == null) return null
            return {
                name: matches[2],
                count: matches[1],
                id: matches[3]
            }
        }
        const identity = matchIdentityCard(line)
        if (identity) return identity
        return matchNormalCard(line)
    }
    const lines = markdown.split(/\r?\n/)
    let parsed = []
    for (const line of lines) {
        const result = parseOneLine(line)
        if (result != null) {
            parsed.push(result)
        } else {
            console.warn("could not parse line: [%s]", line)
        }
    }
    return parsed
}

function diffDecks(oldDeck, newDeck) {
    const oldField = "old"
    const newField = "new"
    function addDeckToAggregate(deck, name, aggregate) {
        for (const card of deck) {
            let found = aggregate[card.name]
            if (!found) {
                // we need to create a new entry in the aggregate.
                found = {
                    name: card.name,
                    id: card.id,
                    decks: {}
                }
                aggregate[card.name] = found
            }
            found.decks[name] = {
                count: card.count
            }
        }
    }
    function normalizeCounts(aggregate) {
        function normalizeOne(card, field) {
            if (!card.decks[field]) {
                card.decks[field] = {
                    count: 0
                }
            }
        }
        for (const card in aggregate) {
            normalizeOne(aggregate[card], oldField)
            normalizeOne(aggregate[card], newField)
        }
    }
    function dropEntriesWithNoDiff(aggregate) {
        const out = {}
        for (const card in aggregate) {
            if (aggregate[card].decks[oldField].count !=
                aggregate[card].decks[newField].count) {
                out[card] = aggregate[card]
            }
        }
        return out
    }
    const aggregate = {}
    addDeckToAggregate(oldDeck, oldField, aggregate)
    addDeckToAggregate(newDeck, newField, aggregate)
    normalizeCounts(aggregate)
    return dropEntriesWithNoDiff(aggregate)
}

window.addEventListener("load", () => {
    goButton().addEventListener("click", () => {
        const oldDeckCards = parseDeckMarkdown(oldDeck().value)
        const newDeckCards = parseDeckMarkdown(newDeck().value)
        const diff = diffDecks(oldDeckCards, newDeckCards)
        result().innerHTML = JSON.stringify(diff)
    })
});
