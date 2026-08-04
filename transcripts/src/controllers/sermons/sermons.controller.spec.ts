import { Test, TestingModule } from "@nestjs/testing";
import { SalvatorService } from "src/services/salvator/salvator.service";
import { SearchService } from "src/services/search/search.service";
import { SermonsController } from "./sermons.controller";

describe("SermonsController", () => {
	let controller: SermonsController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [SermonsController],
			providers: [
				{ provide: SalvatorService, useValue: {} },
				{ provide: SearchService, useValue: {} },
			],
		}).compile();

		controller = module.get<SermonsController>(SermonsController);
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});
});
