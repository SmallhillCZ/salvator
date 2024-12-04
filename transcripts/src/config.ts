import { Injectable } from "@nestjs/common";
import { config } from "dotenv";
import { readFileSync } from "fs";
import { tmpdir } from "os";
import * as path from "path";

config({ override: true, path: "../.env" });

@Injectable()
export class Config {
	packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));

	server = {
		port: process.env["PORT"] ? parseInt(process.env["PORT"]) : 3000,
		host: process.env["HOST"] || "127.0.0.1",
	};

	openai = {
		apiKey: process.env.OPENAI_API_KEY,
	};

	salvator = {
		feedUrl: process.env["FEED_URL"] || "https://www.farnostsalvator.cz/kazani.rss",
		sermonsFile: path.join(process.env["DATA_DIR"] || "output", "sermons.json"),
	};

	transcription = {
		outputDir: process.env["DATA_DIR"] || "output",
		tmpDir: path.join(tmpdir(), "transcriptions"),
	};

	app = {
		name: this.packageJson.name,
		version: this.packageJson.version,
	};
}
