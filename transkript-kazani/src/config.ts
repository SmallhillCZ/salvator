import { Injectable } from "@nestjs/common";

const server = {
	port: process.env["PORT"],
};

@Injectable()
export class Config {
	server = server;
}
