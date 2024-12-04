import { Injectable } from "@nestjs/common";

@Injectable()
export class Config {
	server = {
		port: process.env["PORT"] ? parseInt(process.env["PORT"]) : 3000,
		host: process.env["HOST"] || "127.0.0.1",
	};

	openai = {
		apiKey: process.env.OPENAI_API_KEY,
	};

	kazani = {
		feedUrl: process.env["FEED_URL"] || "https://www.farnostsalvator.cz/kazani.rss",
	};
}
