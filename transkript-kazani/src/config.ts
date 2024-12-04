import { Injectable } from "@nestjs/common";
import { config } from "dotenv";
import { tmpdir } from "os";
import * as path from "path";

config({ override: true, path: "../.env" });

@Injectable()
export class Config {
	server = {
		port: process.env["PORT"] ? parseInt(process.env["PORT"]) : 3000,
		host: process.env["HOST"] || "127.0.0.1",
	};

	openai = {
		apiKey: process.env.OPENAI_API_KEY,
	};

	salvator = {
		feedUrl: process.env["FEED_URL"] || "https://www.farnostsalvator.cz/kazani.rss",
		sermonsFile: "output/sermons.json",
	};

	transcription = {
		outputDir: "output",
		tmpDir: path.join(tmpdir(), "transcriptions"),
	};
}
