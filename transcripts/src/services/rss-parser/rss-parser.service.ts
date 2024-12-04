import { Injectable } from "@nestjs/common";
import * as Parser from "rss-parser";

@Injectable()
export class RssParserService {
	private readonly parser = new Parser();

	async parseFeed(url: string) {
		return await this.parser.parseURL(url);
	}
}
