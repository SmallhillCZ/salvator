import { Test, TestingModule } from "@nestjs/testing";
import { SearchService } from "src/services/search/search.service";
import { SearchApiController } from "./search-api.controller";

describe("SearchApiController", () => {
	let controller: SearchApiController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [SearchApiController],
			providers: [{ provide: SearchService, useValue: {} }],
		}).compile();

		controller = module.get<SearchApiController>(SearchApiController);
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});
});
