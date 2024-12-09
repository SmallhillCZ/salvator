import { Test, TestingModule } from '@nestjs/testing';
import { SermonsApiController } from './sermons-api.controller';

describe('SermonsApiController', () => {
  let controller: SermonsApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SermonsApiController],
    }).compile();

    controller = module.get<SermonsApiController>(SermonsApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
