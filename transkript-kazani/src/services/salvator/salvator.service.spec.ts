import { Test, TestingModule } from '@nestjs/testing';
import { SalvatorService } from './salvator.service';

describe('SalvatorService', () => {
  let service: SalvatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SalvatorService],
    }).compile();

    service = module.get<SalvatorService>(SalvatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
