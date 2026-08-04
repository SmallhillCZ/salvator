import {
	buildLeadSnippet,
	buildSnippets,
	countOccurrences,
	findMatchRanges,
	normalizeForSearch,
	normalizeForSearchWithMap,
	parseQueryTerms,
} from "./fulltext";

const snippetText = (parts: { text: string }[]) => parts.map((part) => part.text).join("");
const highlights = (parts: { text: string; highlight: boolean }[]) =>
	parts.filter((part) => part.highlight).map((part) => part.text);

describe("normalizeForSearch", () => {
	it("strips diacritics, lowercases and collapses whitespace", () => {
		expect(normalizeForSearch("Kříž\n  Ježíšův\tŽIVOT")).toBe("kriz jezisuv zivot");
	});

	it("matches the normalization of normalizeForSearchWithMap", () => {
		const text = "Moji milí,\n\n na kříži umřel Ježíš — Salvátor.\r\nA my?\t";

		expect(normalizeForSearchWithMap(text).normalized).toBe(normalizeForSearch(text));
	});

	it("maps normalized offsets back to the original text", () => {
		const text = "Ježíš na kříži";
		const { normalized, map } = normalizeForSearchWithMap(text);

		const index = normalized.indexOf("krizi");

		expect(map[index]).toBe(text.indexOf("kříži"));
		expect(text.slice(map[index], map[index + "krizi".length - 1] + 1)).toBe("kříži");
	});
});

describe("parseQueryTerms", () => {
	it("splits words, normalizes them and removes duplicates", () => {
		expect(parseQueryTerms("  Kříž ježíš KŘÍŽ ")).toEqual(["kriz", "jezis"]);
	});

	it("keeps quoted phrases together", () => {
		expect(parseQueryTerms('"Ježíš Kristus" kříž')).toEqual(["jezis kristus", "kriz"]);
	});

	it("ignores terms that are too short", () => {
		expect(parseQueryTerms("a v kříž")).toEqual(["kriz"]);
	});

	it("returns nothing for an empty query", () => {
		expect(parseQueryTerms("   ")).toEqual([]);
	});
});

describe("countOccurrences", () => {
	it("counts non overlapping occurrences", () => {
		expect(countOccurrences("kriz kriz krizi", "kriz")).toBe(3);
		expect(countOccurrences("kriz", "jezis")).toBe(0);
	});
});

describe("findMatchRanges", () => {
	it("merges overlapping matches of different terms", () => {
		expect(findMatchRanges("krizi", ["kriz", "rizi"])).toEqual([{ start: 0, end: 5 }]);
	});

	it("returns the matches sorted by position", () => {
		expect(findMatchRanges("jezis a kriz", ["kriz", "jezis"])).toEqual([
			{ start: 0, end: 5 },
			{ start: 8, end: 12 },
		]);
	});
});

describe("buildSnippets", () => {
	it("highlights the match in the original text", () => {
		const snippets = buildSnippets("Moji milí, dnes mluvíme o kříži.", ["krizi"]);

		expect(snippets).toHaveLength(1);
		expect(highlights(snippets[0])).toEqual(["kříži"]);
		expect(snippetText(snippets[0])).toBe("Moji milí, dnes mluvíme o kříži.");
	});

	it("finds inflected words and phrases spanning line breaks", () => {
		const snippets = buildSnippets("Ježíš\nKristus na kříži", ["jezis kristus"]);

		expect(highlights(snippets[0])).toEqual(["Ježíš Kristus"]);
	});

	it("cuts context around the match and marks it with ellipses", () => {
		const text = `${"slovo ".repeat(50)}kříž ${"slovo ".repeat(50)}`;
		const snippets = buildSnippets(text, ["kriz"], { radius: 20 });

		const snippet = snippetText(snippets[0]);

		expect(snippet.startsWith("… ")).toBe(true);
		expect(snippet.endsWith(" …")).toBe(true);
		expect(snippet).toContain("kříž");
		expect(snippet.length).toBeLessThan(70);
		expect(snippet).not.toMatch(/slov(?![oa])/u);
	});

	it("groups nearby matches into a single snippet", () => {
		const snippets = buildSnippets(`kříž kříž ${"slovo ".repeat(50)} kříž`, ["kriz"], { radius: 20 });

		expect(snippets).toHaveLength(2);
		expect(highlights(snippets[0])).toEqual(["kříž", "kříž"]);
		expect(highlights(snippets[1])).toEqual(["kříž"]);
	});

	it("returns at most the requested number of snippets", () => {
		const text = `kříž ${"slovo ".repeat(50)} kříž ${"slovo ".repeat(50)} kříž`;

		expect(buildSnippets(text, ["kriz"], { radius: 10, max: 2 })).toHaveLength(2);
	});

	it("returns nothing when there is no match", () => {
		expect(buildSnippets("Moji milí", ["kriz"])).toEqual([]);
	});
});

describe("buildLeadSnippet", () => {
	it("returns the beginning of the text without highlights", () => {
		const parts = buildLeadSnippet(`${"slovo ".repeat(50)}`, { radius: 10 });

		expect(highlights(parts)).toEqual([]);
		expect(snippetText(parts).startsWith("slovo slovo")).toBe(true);
		expect(snippetText(parts).endsWith(" …")).toBe(true);
	});
});
