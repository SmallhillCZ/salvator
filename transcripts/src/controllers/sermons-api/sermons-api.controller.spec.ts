import { Test, TestingModule } from "@nestjs/testing";
import { SalvatorService } from "src/services/salvator/salvator.service";
import { SermonsApiController } from "./sermons-api.controller";

describe("SermonsApiController", () => {
	let controller: SermonsApiController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [SermonsApiController],
			providers: [{ provide: SalvatorService, useValue: {} }],
		}).compile();

		controller = module.get<SermonsApiController>(SermonsApiController);
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});
});
