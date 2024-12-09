import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { Config } from "./config";
import { SermonsController } from "./controllers/sermons/sermons.controller";
import { OpenaiService } from "./services/openai/openai.service";
import { RssParserService } from "./services/rss-parser/rss-parser.service";
import { SalvatorService } from "./services/salvator/salvator.service";
import { TranscriptionService } from "./services/transcription/transcription.service";
import { SermonsApiController } from './controllers/sermons-api/sermons-api.controller';

@Module({
	imports: [ScheduleModule.forRoot()],
	controllers: [SermonsController, SermonsApiController],
	providers: [Config, OpenaiService, TranscriptionService, RssParserService, SalvatorService],
})
export class AppModule {}
