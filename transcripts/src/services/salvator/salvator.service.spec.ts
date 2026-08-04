import { Test, TestingModule } from "@nestjs/testing";
import { Config } from "src/config";
import { RssParserService } from "../rss-parser/rss-parser.service";
import { TranscriptionService } from "../transcription/transcription.service";
import { SalvatorService } from "./salvator.service";

describe("SalvatorService", () => {
	let service: SalvatorService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SalvatorService,
				{ provide: Config, useValue: { salvator: { sermonsFile: "output/sermons.json" } } },
				{ provide: RssParserService, useValue: {} },
				{ provide: TranscriptionService, useValue: {} },
			],
		}).compile();

		service = module.get<SalvatorService>(SalvatorService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});
});
