import { Test, TestingModule } from "@nestjs/testing";
import { mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { Config } from "src/config";
import { SermonDto } from "src/dto/sermon.dto";
import { SalvatorService } from "../salvator/salvator.service";
import { SearchService } from "./search.service";

const sermons: SermonDto[] = [
	{
		id: "1000-2025-01-05-kriz",
		title: "O kříži",
		description: "Kázání o utrpení",
		url_audio: "https://example.com/1000-2025-01-05-kriz.mp3",
		date: "2025-01-05T10:00:00.000Z",
	},
	{
		id: "1001-2025-02-09-vira",
		title: "O víře",
		description: "Kázání o naději",
		url_audio: "https://example.com/1001-2025-02-09-vira.mp3",
		date: "2025-02-09T10:00:00.000Z",
	},
	{
		id: "1002-2025-03-16-nadeje",
		title: "O naději",
		description: "Kázání o naději",
		url_audio: "https://example.com/1002-2025-03-16-nadeje.mp3",
		date: "2025-03-16T10:00:00.000Z",
	},
];

describe("SearchService", () => {
	let service: SearchService;
	let outputDir: string;

	beforeEach(async () => {
		outputDir = await mkdtemp(join(tmpdir(), "salvator-search-test-"));

		await writeFile(join(outputDir, "1000-2025-01-05-kriz.txt"), "puvodni prepis o krizi");
		await writeFile(
			join(outputDir, "1000-2025-01-05-kriz.corrected.txt"),
			"Moji milí, dnes mluvíme o kříži. Kříž je znamením naděje. Naděje neumírá, naděje zůstává.",
		);
		await writeFile(join(outputDir, "1001-2025-02-09-vira.corrected.txt"), "Víra není jistota, ale důvěra.");
		await writeFile(join(outputDir, "1002-2025-03-16-nadeje.txt"), "Naděje umírá poslední, říká se.");
		await writeFile(join(outputDir, "sermons.json"), JSON.stringify(sermons));

		const config = {
			transcription: { outputDir },
			search: { indexTtl: 0 },
		} as unknown as Config;

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SearchService,
				{ provide: Config, useValue: config },
				{ provide: SalvatorService, useValue: { getSermons: async () => sermons } },
			],
		}).compile();

		service = module.get<SearchService>(SearchService);
	});

	afterEach(async () => {
		await rm(outputDir, { recursive: true, force: true });
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	it("finds a sermon by a word from the transcript, without diacritics", async () => {
		const result = await service.search({ q: "krizi" });

		expect(result.total).toBe(1);
		expect(result.results[0].sermon.id).toBe("1000-2025-01-05-kriz");
		expect(result.results[0].snippets[0].filter((part) => part.highlight)).toEqual([
			{ text: "kříži", highlight: true },
		]);
	});

	it("returns the corrected transcript instead of the original one", async () => {
		const result = await service.search({ q: "puvodni" });

		expect(result.total).toBe(0);
	});

	it("indexes sermons that have no corrected transcript", async () => {
		const result = await service.search({ q: "poslední" });

		expect(result.results.map((r) => r.sermon.id)).toEqual(["1002-2025-03-16-nadeje"]);
	});

	it("requires all terms to be found", async () => {
		expect((await service.search({ q: "kříž naděje" })).total).toBe(1);
		expect((await service.search({ q: "kříž jistota" })).total).toBe(0);
	});

	it("matches the title and the description as well", async () => {
		const result = await service.search({ q: "utrpení" });

		expect(result.results.map((r) => r.sermon.id)).toEqual(["1000-2025-01-05-kriz"]);
		// nothing to highlight in the transcript, the beginning of it is shown instead
		expect(result.results[0].snippets[0].some((part) => part.highlight)).toBe(false);
	});

	it("sorts by the number of matches by default", async () => {
		const result = await service.search({ q: "naděje" });

		expect(result.results.map((r) => [r.sermon.id, r.matchCount])).toEqual([
			["1000-2025-01-05-kriz", 3],
			["1002-2025-03-16-nadeje", 1],
		]);
	});

	it("sorts from the newest sermon when asked to", async () => {
		const result = await service.search({ q: "naděje", sort: "date" });

		expect(result.results.map((r) => r.sermon.id)).toEqual(["1002-2025-03-16-nadeje", "1000-2025-01-05-kriz"]);
	});

	it("paginates the results", async () => {
		const result = await service.search({ q: "kázání", sort: "date", limit: 2, offset: 2 });

		expect(result.total).toBe(3);
		expect(result.limit).toBe(2);
		expect(result.offset).toBe(2);
		expect(result.results.map((r) => r.sermon.id)).toEqual(["1000-2025-01-05-kriz"]);
	});

	it("returns nothing for an empty query", async () => {
		const result = await service.search({ q: "  " });

		expect(result).toMatchObject({ query: "", terms: [], total: 0, results: [] });
	});

	it("ignores transcripts of sermons that are not in the metadata", async () => {
		await writeFile(join(outputDir, "9999-neznamy.corrected.txt"), "Kříž bez metadat.");

		const result = await service.search({ q: "metadat" });

		expect(result.total).toBe(0);
	});

	it("picks up transcripts added after the index was built", async () => {
		expect((await service.search({ q: "novinka" })).total).toBe(0);

		await writeFile(join(outputDir, "1001-2025-02-09-vira.corrected.txt"), "Novinka v přepisu.");

		expect((await service.search({ q: "novinka" })).total).toBe(1);
	});
});
