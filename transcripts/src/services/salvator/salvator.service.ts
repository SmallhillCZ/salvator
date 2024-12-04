import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { readFile, writeFile } from "fs/promises";
import { Config } from "src/config";
import { RssParserService } from "../rss-parser/rss-parser.service";
import { TranscriptionService } from "../transcription/transcription.service";

export interface Sermon {
	id: string;
	title: string;
	description: string;
	url: string;
	date: string;
}

@Injectable()
export class SalvatorService implements OnApplicationBootstrap {
	private readonly logger = new Logger(SalvatorService.name);

	private transcriptionRunning = false;

	constructor(
		private readonly config: Config,
		private readonly rssParser: RssParserService,
		private readonly transcriptionService: TranscriptionService,
	) {}

	onApplicationBootstrap() {
		this.processSermons();
	}

	async getSermons(): Promise<Sermon[]> {
		const sermons = await this.loadSermons();
		return sermons;
	}

	async getSermonTranscript(id: string, { original }: { original?: boolean } = {}) {
		const transcription = await this.transcriptionService.getTranscription(id, { original });
		return transcription;
	}

	@Cron("0 0 * * * *")
	async processSermons() {
		try {
			this.logger.verbose("Loading sermons");
			const feed = await this.rssParser.parseFeed(this.config.salvator.feedUrl);

			const oldSermons = await this.loadSermons();

			const newSermons: Sermon[] = feed.items.map((item) => ({
				id: this.getSermonId(item.guid),
				title: item.title.replace("●", "").trim(),
				description: item.content,
				url: item.enclosure.url,
				date: item.isoDate,
			}));

			const sermonsMap = new Map<string, Sermon>();
			for (const sermon of [...oldSermons, ...newSermons]) {
				sermonsMap.set(sermon.id, sermon);
			}

			const sermons = Array.from(sermonsMap.values());

			await writeFile(this.config.transcription.outputDir + "/sermons.json", JSON.stringify(sermons));

			if (this.transcriptionRunning) return;
			this.transcriptionRunning = true;

			this.logger.verbose(`Loaded ${newSermons.length} sermons. Total: ${sermons.length}`);

			this.logger.verbose("Transcribing sermons");

			for (const sermon of sermons) {
				if (await this.transcriptionService.transcriptionExists(sermon.id)) continue;

				try {
					this.logger.verbose(`Transcribing ${sermon.id}`);
					await this.transcriptionService.transcribe(sermon.id, sermon.url);
					this.logger.log(`Transcribed ${sermon.id}`);
				} catch (e) {
					this.logger.error(`Error transcribing ${sermon.id}`);
					this.logger.error(e);
				}
			}
		} catch (e) {
			this.logger.error("Error transcribing sermons");
			this.logger.error(e);
		} finally {
			this.logger.verbose("Finished transcribing sermons");
			this.transcriptionRunning = false;
		}
	}

	private async loadSermons() {
		const sermons: Sermon[] = await readFile(this.config.salvator.sermonsFile, "utf-8")
			.then((data) => JSON.parse(data))
			.catch(() => []);

		return sermons;
	}

	private getSermonId(guid: string) {
		const parts = guid.match(/\/([^\/]+)\.mp3$/);
		if (!parts) throw new Error(`Invalid guid: ${guid}`);
		return parts[1];
	}
}
