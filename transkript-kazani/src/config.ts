import { Injectable } from "@nestjs/common";
import { config } from "dotenv";

config({ override: true });

@Injectable()
export class Config {
	server = {
		port: process.env["PORT"] ? parseInt(process.env["PORT"]) : 3000,
		host: process.env["HOST"] || "127.0.0.1",
	};
}
