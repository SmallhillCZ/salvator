import { Module } from "@nestjs/common";
import { Config } from "./config";
import { OpenaiService } from "./services/openai/openai.service";
import { RssParserService } from "./services/rss-parser/rss-parser.service";
import { TranscriptionService } from "./services/transcription/transcription.service";

@Module({
	imports: [],
	controllers: [],
	providers: [Config, OpenaiService, TranscriptionService, RssParserService],
})
export class AppModule {}
