import { Test, TestingModule } from "@nestjs/testing";
import { Config } from "src/config";
import { OpenaiService } from "./openai.service";

describe("OpenaiService", () => {
	let service: OpenaiService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [OpenaiService, { provide: Config, useValue: { openai: { apiKey: "test" } } }],
		}).compile();

		service = module.get<OpenaiService>(OpenaiService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});
});
