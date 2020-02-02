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
        const matches =
            line.match(/\s*\*\s*(\d+)\s*x\s*\[([^\]]+)\]\(https:\/\/netrunnerdb.com\/en\/card\/(\d+)/)
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
    const lines = markdown.split(/\r?\n/)
    parsed = []
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

window.addEventListener("load", () => {
    goButton().addEventListener("click", () => {
        result().innerHTML = JSON.stringify(parseDeckMarkdown(oldDeck().value))
    })
});
