import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";

import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import { Config } from "./config";
import { registerOpenAPI } from "./openapi";
import { registerTemplating } from "./templating";

async function bootstrap() {
	const logger = new Logger("MAIN");

	const app = await NestFactory.create<NestExpressApplication>(AppModule);

	const config = app.get(Config);

	// comment to disable templating
	registerTemplating(app);

	// comment to disable OpenAPI and Swagger
	registerOpenAPI("api", app, config);

	await app.listen(config.server.port, config.server.host);

	logger.log(`Server running on http://${config.server.host}:${config.server.port}`);
}
bootstrap();
