/**
 * Pure text helpers for the fulltext search over sermon transcripts.
 *
 * Search is diacritics and case insensitive and matches substrings, so that inflected Czech words
 * ("kříž" → "kříže", "křížem") are found without any stemming.
 */

/** Terms shorter than this are ignored, they would match almost every transcript. */
export const MIN_TERM_LENGTH = 2;

/** Upper bound on the number of terms taken from a single query. */
export const MAX_TERMS = 10;

const COMBINING_MARKS = /\p{M}/gu;
const COMBINING_MARK = /\p{M}/u;
const WHITESPACE = /\s/u;

export interface TextRange {
	start: number;
	end: number;
}

export interface SnippetPart {
	text: string;
	highlight: boolean;
}

export interface BuildSnippetsOptions {
	/** How many characters of context to keep around a match. */
	radius?: number;
	/** How many snippets to return at most. */
	max?: number;
}

/** Normalizes text for matching: lowercase, no diacritics, whitespace collapsed into single spaces. */
export function normalizeForSearch(text: string): string {
	return text.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase().replace(/\s+/gu, " ");
}

/**
 * Same normalization as {@link normalizeForSearch}, but also returns a map from every offset in the
 * normalized text back to the offset of the character it came from in the original text. Needed to
 * highlight matches in the original (diacritics included) text.
 */
export function normalizeForSearchWithMap(text: string): { normalized: string; map: number[] } {
	let normalized = "";
	const map: number[] = [];

	let offset = 0;
	for (const char of text) {
		const normalizedChar = WHITESPACE.test(char)
			? " "
			: char.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase();

		// collapse whitespace runs the same way normalizeForSearch does
		if (!(normalizedChar === " " && normalized.endsWith(" "))) {
			for (const normalizedCharPart of normalizedChar) {
				normalized += normalizedCharPart;
				map.push(offset);
			}
		}

		offset += char.length;
	}

	return { normalized, map };
}

/** Splits a query into normalized terms. Parts wrapped in double quotes are kept together as a phrase. */
export function parseQueryTerms(query: string): string[] {
	const tokens = query.match(/"[^"]*"|\S+/gu) ?? [];

	const terms: string[] = [];
	for (const token of tokens) {
		const term = normalizeForSearch(token.replace(/"/gu, " ")).trim();

		if (term.length < MIN_TERM_LENGTH) continue;
		if (terms.includes(term)) continue;

		terms.push(term);
	}

	return terms.slice(0, MAX_TERMS);
}

/** Counts how many times a normalized term occurs in a normalized text. */
export function countOccurrences(text: string, term: string): number {
	if (!term) return 0;

	let count = 0;
	let index = text.indexOf(term);
	while (index !== -1) {
		count++;
		index = text.indexOf(term, index + term.length);
	}

	return count;
}

/** Finds all occurrences of all terms, merged into non overlapping ranges sorted by position. */
export function findMatchRanges(text: string, terms: string[]): TextRange[] {
	const ranges: TextRange[] = [];

	for (const term of terms) {
		if (!term) continue;

		let index = text.indexOf(term);
		while (index !== -1) {
			ranges.push({ start: index, end: index + term.length });
			index = text.indexOf(term, index + term.length);
		}
	}

	ranges.sort((a, b) => a.start - b.start || a.end - b.end);

	const merged: TextRange[] = [];
	for (const range of ranges) {
		const previous = merged[merged.length - 1];

		if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
		else merged.push({ ...range });
	}

	return merged;
}

/**
 * Builds snippets of the original text around the matches of the given terms. Each snippet is split
 * into parts so that the matches can be rendered as highlighted without building HTML here.
 */
export function buildSnippets(
	text: string,
	terms: string[],
	{ radius = 120, max = 3 }: BuildSnippetsOptions = {},
): SnippetPart[][] {
	const { normalized, map } = normalizeForSearchWithMap(text);

	const matches = findMatchRanges(normalized, terms).map(({ start, end }) => ({
		start: map[start],
		end: endInOriginalText(text, map[end - 1]),
	}));

	const snippets: SnippetPart[][] = [];

	let index = 0;
	while (index < matches.length && snippets.length < max) {
		const included = [matches[index]];
		let end = Math.min(text.length, matches[index].end + radius);

		// pull in the following matches as long as they still fit into the snippet window
		while (index + 1 < matches.length && matches[index + 1].start <= end) {
			index++;
			included.push(matches[index]);
			end = Math.min(text.length, Math.max(end, matches[index].end + radius));
		}
		index++;

		const start = Math.max(0, included[0].start - radius);
		snippets.push(buildSnippet(text, snapToWordBoundaries(text, { start, end }, included), included));
	}

	return snippets;
}

/** Builds a single snippet from the beginning of the text, used when there is nothing to highlight. */
export function buildLeadSnippet(text: string, { radius = 120 }: BuildSnippetsOptions = {}): SnippetPart[] {
	const end = snapToWordBoundaries(text, { start: 0, end: Math.min(text.length, radius * 2) }, []).end;
	return buildSnippet(text, { start: 0, end }, []);
}

/** Extends the end of a match past combining marks so highlights never cut a character in half. */
function endInOriginalText(text: string, lastCharacterOffset: number): number {
	let end = lastCharacterOffset + 1;
	while (end < text.length && COMBINING_MARK.test(text[end])) end++;
	return end;
}

/** Moves the snippet boundaries onto whitespace so that snippets do not start or end mid word. */
function snapToWordBoundaries(text: string, { start, end }: TextRange, matches: TextRange[]): TextRange {
	const firstMatchStart = matches.length ? matches[0].start : end;
	const lastMatchEnd = matches.length ? matches[matches.length - 1].end : start;

	if (start > 0) {
		const boundary = text.slice(start, firstMatchStart).search(WHITESPACE);
		if (boundary !== -1) start += boundary + 1;
	}

	if (end < text.length) {
		const boundary = lastWhitespaceIndex(text.slice(lastMatchEnd, end));
		if (boundary !== -1) end = lastMatchEnd + boundary;
	}

	return { start, end };
}

function lastWhitespaceIndex(text: string): number {
	for (let index = text.length - 1; index >= 0; index--) {
		if (WHITESPACE.test(text[index])) return index;
	}
	return -1;
}

function buildSnippet(text: string, { start, end }: TextRange, matches: TextRange[]): SnippetPart[] {
	const parts: SnippetPart[] = [];

	const pushPart = (from: number, to: number, highlight: boolean, prefix = "", suffix = "") => {
		const partText = prefix + collapseWhitespace(text.slice(from, to)) + suffix;
		if (partText) parts.push({ text: partText, highlight });
	};

	let offset = start;
	for (const match of matches) {
		if (match.start >= end) break;

		pushPart(offset, match.start, false, offset === start && start > 0 ? "… " : "");
		pushPart(Math.max(match.start, start), Math.min(match.end, end), true);

		offset = Math.min(match.end, end);
	}

	pushPart(offset, end, false, offset === start && start > 0 ? "… " : "", end < text.length ? " …" : "");

	return parts;
}

function collapseWhitespace(text: string): string {
	return text.replace(/\s+/gu, " ");
}
