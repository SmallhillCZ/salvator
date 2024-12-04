import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Config } from "./config";
import { registerOpenAPI } from "./openapi";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	const config = app.get(Config);

	registerOpenAPI("openapi", app, config);

	await app.listen(config.server.port, config.server.host);
}
bootstrap();
