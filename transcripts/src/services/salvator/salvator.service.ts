import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { readFile, writeFile } from "fs/promises";
import { Config } from "src/config";
import { SermonDto } from "src/dto/sermon.dto";
import { RssParserService } from "../rss-parser/rss-parser.service";
import { TranscriptionService } from "../transcription/transcription.service";

@Injectable()
export class SalvatorService {
	private readonly logger = new Logger(SalvatorService.name);

	private updateRunning = false;

	constructor(
		private readonly config: Config,
		private readonly rssParser: RssParserService,
		private readonly transcriptionService: TranscriptionService,
	) {}

	async getSermons(): Promise<SermonDto[]> {
		const sermons = await this.loadSermons();
		return sermons;
	}

	async getSermon(id: string): Promise<SermonDto | null> {
		const sermons = await this.loadSermons();
		const sermon = sermons.find((sermon) => sermon.id === id);

		if (!sermon) return null;
		return sermon;
	}

	async getSermonTranscript(id: string, { original }: { original?: boolean } = {}) {
		const transcription = await this.transcriptionService.getTranscription(id, { original });
		return transcription;
	}

	@Cron("0 0 * * * *")
	async updateSermons() {
		try {
			if (this.updateRunning) return;
			this.updateRunning = true;

			this.logger.verbose("Loading sermons");
			const feed = await this.rssParser.parseFeed(this.config.salvator.feedUrl);

			const oldSermons = await this.loadSermons();

			const newSermons: SermonDto[] = feed.items
				.filter((item) => item.guid && item.enclosure)
				.map((item) => {
					const id = this.getSermonId(item.guid!);
					const idparts = id.match(/^(\d{4})-(\d{4}-\d{2}-\d{2})/);

					return {
						id,
						title: item.title?.replace("●", "").trim() || id,
						description: item.content,
						url_audio: item.enclosure!.url,
						url_farnost: idparts
							? `https://www.farnostsalvator.cz/kazani/${idparts[1]}/${idparts[2]}`
							: undefined,
						date: item.isoDate,
					};
				});

			const sermonsMap = new Map<string, SermonDto>();
			for (const sermon of [...oldSermons, ...newSermons]) {
				sermonsMap.set(sermon.id, sermon);
			}

			const sermons = Array.from(sermonsMap.values());

			await writeFile(this.config.transcription.outputDir + "/sermons.json", JSON.stringify(sermons));

			this.logger.verbose(`Loaded ${newSermons.length} sermons. Total: ${sermons.length}`);

			this.logger.verbose("Transcribing sermons");

			for (const sermon of sermons) {
				if (await this.transcriptionService.transcriptionExists(sermon.id)) continue;

				try {
					this.logger.verbose(`Transcribing ${sermon.id}`);
					await this.transcriptionService.transcribe(sermon.id, sermon.url_audio);
					this.logger.log(`Transcribed ${sermon.id}`);
				} catch (e) {
					this.logger.error(`Error transcribing ${sermon.id}`);
					console.error(JSON.stringify(e));
				}
			}
		} catch (e) {
			this.logger.error("Error transcribing sermons");
			console.error(JSON.stringify(e));
		} finally {
			this.logger.verbose("Finished transcribing sermons");
			this.updateRunning = false;
		}
	}

	private async loadSermons() {
		const sermons: SermonDto[] = await readFile(this.config.salvator.sermonsFile, "utf-8")
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
