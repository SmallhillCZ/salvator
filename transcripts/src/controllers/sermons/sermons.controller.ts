import { Controller, Get, NotFoundException, Param, Query, Render } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { marked } from "marked";
import { SEARCH_DEFAULT_LIMIT, SearchQueryDto, SearchResponseDto, SearchSort } from "src/dto/search.dto";
import { GetSermonQueryDto, SermonDto } from "src/dto/sermon.dto";
import { SalvatorService } from "src/services/salvator/salvator.service";
import { SearchService } from "src/services/search/search.service";

@Controller("")
@ApiTags("HTML")
export class SermonsController {
	constructor(
		private salvatorService: SalvatorService,
		private searchService: SearchService,
	) {}

	@Get()
	@Render("sermons")
	async getSermonsView() {
		const sermons = await this.salvatorService.getSermons();

		return {
			sermons: sermons
				.sort((a, b) => (a.date && b.date ? b.date.localeCompare(a.date) : 0))
				.map((sermon) => this.formatSermonForView(sermon)),
		};
	}

	/** Has to stay above the `:id` route below, otherwise it would be handled as a sermon id. */
	@Get("search")
	@Render("search")
	async getSearchView(@Query() query: SearchQueryDto) {
		const search = await this.searchService.search(query);

		const nextOffset = search.offset + search.limit;

		return {
			title: search.query ? `Hledání „${search.query}“` : "Hledání v přepisech kázání",
			q: search.query,
			searched: !!search.terms.length,
			total: search.total,
			from: search.offset + 1,
			to: search.offset + search.results.length,
			results: search.results.map((result) => ({
				...result,
				sermon: this.formatSermonForView(result.sermon),
			})),
			sortedByDate: search.sort === "date",
			relevanceUrl: this.buildSearchUrl(search, { sort: "relevance", offset: 0 }),
			dateUrl: this.buildSearchUrl(search, { sort: "date", offset: 0 }),
			previousUrl:
				search.offset > 0
					? this.buildSearchUrl(search, { offset: Math.max(0, search.offset - search.limit) })
					: null,
			nextUrl: nextOffset < search.total ? this.buildSearchUrl(search, { offset: nextOffset }) : null,
		};
	}

	@Get(":id")
	@Render("sermon")
	async getSermonTranscriptView(@Param("id") id: string, @Query() query: GetSermonQueryDto) {
		const sermon = await this.salvatorService.getSermon(id);
		if (!sermon) throw new NotFoundException();

		const transcription = await this.salvatorService.getSermonTranscript(id, { original: !!query.original });
		if (!transcription) throw new NotFoundException();

		const html = await marked.parse(transcription);

		return {
			title: sermon.title ?? null,
			date: sermon.date,
			description: sermon.description ?? null,
			sermon: this.formatSermonForView(sermon),
			transcript: html,
		};
	}

	private buildSearchUrl(
		search: SearchResponseDto,
		{ sort = search.sort, offset = search.offset }: { sort?: SearchSort; offset?: number },
	) {
		const params = new URLSearchParams({ q: search.query });

		if (sort !== "relevance") params.set("sort", sort);
		if (search.limit !== SEARCH_DEFAULT_LIMIT) params.set("limit", String(search.limit));
		if (offset) params.set("offset", String(offset));

		return `/search?${params.toString()}`;
	}

	private formatSermonForView(sermon: SermonDto) {
		return {
			...sermon,
			date: sermon.date ? new Date(sermon.date).toLocaleDateString("cs-CZ", { timeZone: "CET" }) : null,
		};
	}
}
