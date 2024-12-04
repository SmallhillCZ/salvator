import { Injectable } from "@nestjs/common";
import { Config } from "src/config";
import { RssParserService } from "../rss-parser/rss-parser.service";

@Injectable()
export class TranscriptionService {
	constructor(
		private readonly rssParser: RssParserService,
		private readonly config: Config,
	) {}

	getFilesForTranscription() {
		const feed = this.rssParser.parseFeed();
	}
}
