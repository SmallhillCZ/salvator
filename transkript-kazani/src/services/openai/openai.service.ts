import { Injectable } from "@nestjs/common";
import axios from "axios";
import OpenAI from "openai";
import { FsReadStream } from "openai/_shims";
import { Config } from "src/config";

@Injectable()
export class OpenaiService {
	private openaiInstance: OpenAI;

	constructor(config: Config) {
		this.openaiInstance = new OpenAI({
			apiKey: config.openai.apiKey,
		});
	}

	async transcribe(url: string) {
		const file = await axios.get<FsReadStream>(url, { responseType: "stream" }).then((res) => res.data);

		file.path = url;

		const response = await this.openaiInstance.audio.transcriptions.create({
			file,
			model: "whisper-1",
		});

		return response.text;
	}
}
