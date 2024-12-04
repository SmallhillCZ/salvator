import { Injectable } from "@nestjs/common";
import { Config } from "src/config";
import { OpenaiService } from "../openai/openai.service";
import { RssParserService } from "../rss-parser/rss-parser.service";

@Injectable()
export class TranscriptionService {
	constructor(
		private readonly rssParser: RssParserService,
		private readonly config: Config,
		private openai: OpenaiService,
	) {}

	async transcribe() {
		const files = await this.getFilesForTranscription();
		console.log(files);
		for (const file of files) {
			// const transcription = await this.openai.transcribe(file);
			// console.log(transcription);
		}
	}

	private async getFilesForTranscription() {
		const feed = await this.rssParser.parseFeed(this.config.kazani.feedUrl);

		return feed.items.slice(1, 1).map((item) => item.enclosure.url);
	}
}
