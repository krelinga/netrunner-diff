let resultTemplate = null

function setUpTemplates() {
    Handlebars.registerPartial(
        "cardList",
        document.getElementById("cardListPartialTemplate").innerHTML)
    Handlebars.registerPartial(
        "type",
        document.getElementById("typePartialTemplate").innerHTML)
    Handlebars.registerPartial(
        "faction",
        document.getElementById("factionPartialTemplate").innerHTML)
    Handlebars.registerPartial(
        "delta",
        document.getElementById("deltaPartialTemplate").innerHTML)

    resultTemplate = Handlebars.compile(
        document.getElementById("resultTemplate").innerHTML)
}

function loading() {
    return document.getElementById("loading")
}

function mainApp() {
    return document.getElementById("mainApp")
}

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

function toAdd() {
    return document.getElementById("toAdd")
}

function toRemove() {
    return document.getElementById("toRemove")
}

function capFirstLetter(inString) {
    if (!inString) return inString
    return inString.charAt(0).toUpperCase() + inString.substr(1)
}

function toUnique(inArray) {
    const entries = {}
    for (const x of inArray) {
        entries[x] = 1
    }
    const out = []
    for (const x in entries) {
        out.push(x)
    }
    return out
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
            console.log("could not parse line: [%s]", line)
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

function renderDiff(diff) {
    function makeRenderCards(diff) {
        function getType(rawType, rawKeywords) {
            if (rawKeywords && rawKeywords.includes("Icebreaker")) {
                return "Icebreaker"
            }
            if (rawType) return capFirstLetter(rawType)
            return "Unknown Type"
        }
        function getImageUrl(id, data) {
            if (!data) return null
            if (data.image_url) return data.image_url
            const imageUrlTemplate = "https://netrunnerdb.com/card_image/{code}.png"
            return imageUrlTemplate.replace("{code}", id)
        }
        function copies(n, thing) {
            if (!thing) return thing
            const toReturn = []
            for (let i = 0; i < n; ++i) {
                toReturn.push(thing)
            }
            return toReturn
        }
        const renderCards = []
        for (cardName in diff) {
            const card = diff[cardName]
            const signedDelta = card.decks.new.count - card.decks.old.count
            const data = getCard(card.id)

            renderCards.push({
                id: card.id,
                name: card.name,
                delta: Math.abs(signedDelta),
                action: signedDelta < 0 ? "Remove" : "Add",
                faction: data ? capFirstLetter(data.faction_code) : "Unknown Faction",
                type: getType(data.type_code, data.keywords),
                imageUrl: copies(Math.abs(signedDelta), getImageUrl(card.id, data))
            })
        }
        return renderCards
    }

    function toTypes(renderCards) {
        function one(renderCards, type) {
            const cards = renderCards.filter(x => x.type == type)
            return {
                "name": type,
                "cards": cards,
                "total": cards.reduce((t, x) => t + x.delta, 0)
            }
        }
        const types = toUnique(renderCards.map(x => x.type))
        return types.map(x => one(renderCards, x)).filter(x => x.total > 0)
    }

    function toFactions(renderCards) {
        function one(renderCards, faction) {
            const types = toTypes(renderCards.filter(x => x.faction == faction))
            return {
                "name": faction,
                "type": types,
                "total": types.reduce((t, x) => t + x.total, 0)
            }
        }
        const factions = toUnique(renderCards.map(x => x.faction))
        return factions.map(x => one(renderCards, x)).filter(x => x.total > 0)
    }

    function toDeltas(renderCards) {
        function one(renderCards, kind) {
            const factions = toFactions(renderCards.filter(x => x.action == kind))
            return {
                "kind": kind,
                "faction": factions,
                "total": factions.reduce((t, x) => t + x.total, 0)
            }
        }
        return {
            "delta": [
                one(renderCards, "Remove"),
                one(renderCards, "Add")
            ].filter(x => x.total > 0)
        }
    }

    const renderCards = makeRenderCards(diff)
    console.log(toDeltas(renderCards))
    result().innerHTML = resultTemplate(toDeltas(renderCards))
    result().style.display = "block"
}

let cardsDb = null

function loadCardsDb() {
    fetch("https://netrunnerdb.com/api/2.0/public/cards")
        .then((response) => {
            return response.json()
        })
        .then((myJson) => {
            cardsDb = myJson
            loading().style.display = "none"
            mainApp().style.display = "block"
        });
}

function getCard(cardId) {
    for (const card of cardsDb.data) {
        if (card.code == cardId) return card
    }
    return null
}


window.addEventListener("load", () => {
    function hideResults() {
        result().style.display = "none"
    }
    setUpTemplates()
    newDeck().addEventListener("input", hideResults)
    oldDeck().addEventListener("input", hideResults)
    goButton().addEventListener("click", () => {
        const oldDeckCards = parseDeckMarkdown(oldDeck().value)
        const newDeckCards = parseDeckMarkdown(newDeck().value)
        const diff = diffDecks(oldDeckCards, newDeckCards)
        renderDiff(diff)
    })
    loadCardsDb()
});
