import { Test, TestingModule } from "@nestjs/testing";
import { Config } from "src/config";
import { OpenaiService } from "../openai/openai.service";
import { TranscriptionService } from "./transcription.service";

describe("TranscriptionService", () => {
	let service: TranscriptionService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				TranscriptionService,
				{ provide: Config, useValue: { transcription: { outputDir: "output", tmpDir: "tmp" } } },
				{ provide: OpenaiService, useValue: {} },
			],
		}).compile();

		service = module.get<TranscriptionService>(TranscriptionService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});
});
