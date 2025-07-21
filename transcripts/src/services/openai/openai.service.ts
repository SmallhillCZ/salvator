import { Injectable } from "@nestjs/common";
import { createReadStream } from "fs";
import OpenAI from "openai";
import { Config } from "src/config";

export type TranscribeOptions = Omit<
	OpenAI.Audio.Transcriptions.TranscriptionCreateParams<"json" | undefined>,
	"file" | "model"
>;
@Injectable()
export class OpenaiService {
	private openaiInstance: OpenAI;

	constructor(config: Config) {
		this.openaiInstance = new OpenAI({
			apiKey: config.openai.apiKey,
		});
	}

	async transcribe(filePath: string, options: TranscribeOptions = {}) {
		const file = createReadStream(filePath);

		const response = await this.openaiInstance.audio.transcriptions.create({
			language: "cs",
			...options,
			file,
			model: "whisper-1",
			stream: false,
		});

		return response.text;
	}

	async correctTranscript(prompt: string, transcription: string) {
		const completion = await this.openaiInstance.chat.completions.create({
			model: "gpt-4o",
			messages: [
				{
					role: "system",
					content: prompt,
				},
				{
					role: "user",
					content: transcription,
				},
			],
		});
		return completion.choices[0].message.content;
	}
}
