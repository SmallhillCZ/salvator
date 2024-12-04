import { Injectable } from "@nestjs/common";
import { config } from "dotenv";
import { readFileSync } from "fs";

config({ override: true });

@Injectable()
export class Config {
	packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));

	server = {
		port: process.env["PORT"] ? parseInt(process.env["PORT"]) : 3000,
		host: process.env["HOST"] || "127.0.0.1",
	};

	app = {
		name: this.packageJson.name,
		version: this.packageJson.version,
	};
}
