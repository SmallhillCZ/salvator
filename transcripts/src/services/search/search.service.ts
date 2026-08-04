import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { readFile, readdir, stat } from "fs/promises";
import { join } from "path";
import { Config } from "src/config";
import {
	SEARCH_DEFAULT_LIMIT,
	SearchQueryDto,
	SearchResponseDto,
	SearchResultDto,
	SearchSnippetPartDto,
} from "src/dto/search.dto";
import { SermonDto } from "src/dto/sermon.dto";
import { SalvatorService } from "../salvator/salvator.service";
import { buildLeadSnippet, buildSnippets, countOccurrences, normalizeForSearch, parseQueryTerms } from "./fulltext";

/** A match in the title or the description counts as this many matches in the transcript. */
const HEADING_WEIGHT = 5;

const SNIPPET_RADIUS = 120;
const MAX_SNIPPETS = 3;

const CORRECTED_SUFFIX = ".corrected.txt";
const TRANSCRIPT_SUFFIX = ".txt";

interface IndexEntry {
	id: string;
	/** File the entry was built from, relative to the transcriptions directory. */
	file: string;
	mtimeMs: number;
	/** Normalized transcript, kept in memory for matching. Snippets are built from the file. */
	text: string;
}

interface Match {
	entry: IndexEntry;
	sermon: SermonDto;
	score: number;
	matchCount: number;
}

@Injectable()
export class SearchService implements OnApplicationBootstrap {
	private readonly logger = new Logger(SearchService.name);

	private index = new Map<string, IndexEntry>();
	private indexedAt = 0;
	private refreshing: Promise<void> | null = null;

	constructor(
		private readonly config: Config,
		private readonly salvatorService: SalvatorService,
	) {}

	onApplicationBootstrap() {
		// warm the index up so the first search does not have to wait for it
		void this.ensureIndex();
	}

	async search({
		q,
		limit = SEARCH_DEFAULT_LIMIT,
		offset = 0,
		sort = "relevance",
	}: SearchQueryDto): Promise<SearchResponseDto> {
		const query = q?.trim() ?? "";
		const terms = parseQueryTerms(query);

		const response: SearchResponseDto = { query, terms, total: 0, limit, offset, sort, results: [] };
		if (!terms.length) return response;

		await this.ensureIndex();

		const sermons = new Map((await this.salvatorService.getSermons()).map((sermon) => [sermon.id, sermon]));

		const matches: Match[] = [];
		for (const entry of this.index.values()) {
			// transcriptions without metadata are not reachable in the app, do not offer them
			const sermon = sermons.get(entry.id);
			if (!sermon) continue;

			const match = this.matchSermon(entry, sermon, terms);
			if (match) matches.push(match);
		}

		matches.sort(sort === "date" ? compareByDate : compareByScore);

		const page = matches.slice(offset, offset + limit);

		return {
			...response,
			total: matches.length,
			results: await Promise.all(page.map((match) => this.buildResult(match, terms))),
		};
	}

	/** Scores a sermon against the query. All terms have to be found, either in the transcript or in the heading. */
	private matchSermon(entry: IndexEntry, sermon: SermonDto, terms: string[]): Match | null {
		const heading = normalizeForSearch(`${sermon.title ?? ""} ${sermon.description ?? ""}`);

		let score = 0;
		let matchCount = 0;

		for (const term of terms) {
			const inText = countOccurrences(entry.text, term);
			const inHeading = countOccurrences(heading, term);

			if (!inText && !inHeading) return null;

			score += inText + inHeading * HEADING_WEIGHT;
			matchCount += inText + inHeading;
		}

		return { entry, sermon, score, matchCount };
	}

	private async buildResult({ entry, sermon, matchCount }: Match, terms: string[]): Promise<SearchResultDto> {
		const text = await this.readTranscript(entry.file);

		let snippets: SearchSnippetPartDto[][] = text
			? buildSnippets(text, terms, { radius: SNIPPET_RADIUS, max: MAX_SNIPPETS })
			: [];

		// the query was matched by the title or the description only, show the beginning of the transcript
		if (!snippets.length && text) snippets = [buildLeadSnippet(text, { radius: SNIPPET_RADIUS })];

		return { sermon, matchCount, snippets };
	}

	/** Rebuilds the index if it is older than the configured time to live. */
	private async ensureIndex(): Promise<void> {
		if (this.indexedAt && Date.now() - this.indexedAt < this.config.search.indexTtl) return;

		// concurrent searches share a single refresh
		if (!this.refreshing) {
			this.refreshing = this.refreshIndex().finally(() => {
				this.refreshing = null;
			});
		}

		await this.refreshing;
	}

	private async refreshIndex(): Promise<void> {
		const files = await this.listTranscriptFiles();

		const index = new Map<string, IndexEntry>();
		let indexed = 0;

		for (const [id, file] of files) {
			const stats = await stat(join(this.config.transcription.outputDir, file)).catch(() => null);
			if (!stats) continue;

			// reuse what is already indexed, transcripts never change once they are written
			const cached = this.index.get(id);
			if (cached && cached.file === file && cached.mtimeMs === stats.mtimeMs) {
				index.set(id, cached);
				continue;
			}

			const text = await this.readTranscript(file);
			if (text === null) continue;

			index.set(id, { id, file, mtimeMs: stats.mtimeMs, text: normalizeForSearch(text) });
			indexed++;
		}

		this.index = index;
		this.indexedAt = Date.now();

		this.logger.verbose(`Indexed ${indexed} transcripts, ${index.size} in the search index`);
	}

	/** Maps sermon ids to the file to index, preferring the corrected transcript over the original one. */
	private async listTranscriptFiles(): Promise<Map<string, string>> {
		const files = await readdir(this.config.transcription.outputDir).catch((e) => {
			this.logger.error(`Cannot read the transcriptions directory: ${e}`);
			return [] as string[];
		});

		const transcripts = new Map<string, string>();

		for (const file of files) {
			if (!file.endsWith(TRANSCRIPT_SUFFIX)) continue;

			const corrected = file.endsWith(CORRECTED_SUFFIX);
			const id = file.slice(0, -(corrected ? CORRECTED_SUFFIX : TRANSCRIPT_SUFFIX).length);
			if (!id) continue;

			const current = transcripts.get(id);
			if (!current || (corrected && !current.endsWith(CORRECTED_SUFFIX))) transcripts.set(id, file);
		}

		return transcripts;
	}

	private async readTranscript(file: string): Promise<string | null> {
		return await readFile(join(this.config.transcription.outputDir, file), "utf-8").catch((e) => {
			this.logger.error(`Cannot read transcript ${file}: ${e}`);
			return null;
		});
	}
}

function compareByScore(a: Match, b: Match): number {
	return b.score - a.score || compareDates(a.sermon, b.sermon);
}

function compareByDate(a: Match, b: Match): number {
	return compareDates(a.sermon, b.sermon) || b.score - a.score;
}

/** Newest first, sermons without a date last. */
function compareDates(a: SermonDto, b: SermonDto): number {
	if (!a.date || !b.date) return (b.date ? 1 : 0) - (a.date ? 1 : 0);
	return b.date.localeCompare(a.date);
}
