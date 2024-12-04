import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import axios from "axios";
import { createWriteStream, mkdirSync } from "fs";

import { access, constants, readFile, writeFile } from "fs/promises";
import { Config } from "src/config";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { OpenaiService } from "../openai/openai.service";

@Injectable()
export class TranscriptionService implements OnApplicationBootstrap {
	private logger = new Logger(TranscriptionService.name);

	private readonly transcriptionPrompt = "Moji milí, křesťanství, ježíš, pilát, salvátor";

	private readonly correctionPrompt = `\
Jsi korektor v akademické farnosti nejsvětejšího Salvátora.
Tvým úkolem je opravit následující text, který byl přepsán z nahrávky kazatele.
 * Oprav prosím všechny možné překlepy a gramatické chyby, které mohly vzniknout strojovým přepisem.
 * Použij českou typografii, tedy například české uvozovky a pomlčky.
 * Rozděl text do odstavců souvisejícího textu. Odstavce nemusí být stejně dlouhé.
 * Použij pouze dodaný kontext, nezakládej se na vlastní znalosti či zkušenostech.
 * Odpověz pouze opraveným textem.`;

	constructor(
		private readonly config: Config,
		private openai: OpenaiService,
	) {}

	onApplicationBootstrap() {
		mkdirSync(this.config.transcription.outputDir, { recursive: true });
		mkdirSync(this.config.transcription.tmpDir, { recursive: true });
	}

	async transcribe(id: string, url: string, force?: boolean) {
		const fileName = url.split("/").pop();
		const sourcePath = `${this.config.transcription.tmpDir}/${fileName}`;
		const targetPath = `${this.config.transcription.outputDir}/${id}.txt`;
		const correctedPath = `${this.config.transcription.outputDir}/${id}.corrected.txt`;

		if (!force && (await this.transcriptionExists(id))) return;

		this.logger.debug("Downloading transcription");
		await this.downloadTranscription(url, sourcePath);

		this.logger.debug("Transcribing");
		const transcription = await this.openai.transcribe(sourcePath, { prompt: this.transcriptionPrompt });
		await writeFile(targetPath, transcription);

		this.logger.debug("Correcting transcription");
		const correctedTranscription = await this.openai.correctTranscript(this.correctionPrompt, transcription);
		await writeFile(correctedPath, correctedTranscription);

		return transcription;
	}

	async transcriptionExists(id: string) {
		return await this.fileExists(`${this.config.transcription.outputDir}/${id}.txt`);
	}

	async getTranscription(id: string, { original }: { original?: boolean } = {}) {
		const filePath = `${this.config.transcription.outputDir}/${original ? id : id + ".corrected"}.txt`;

		if (!(await this.fileExists(filePath))) return null;

		return await readFile(filePath, "utf-8");
	}

	private async downloadTranscription(url: string, targetPath: string) {
		await pipeline(
			await axios.get<Readable>(url, { responseType: "stream" }).then((res) => res.data),
			createWriteStream(targetPath),
		);
	}

	private async fileExists(file: string) {
		return await access(file, constants.F_OK)
			.then(() => true)
			.catch(() => false);
	}
}
