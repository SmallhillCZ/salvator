import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Config } from "./config";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	const config = app.get(Config);

	await app.listen(config.server.port, config.server.host);
}
bootstrap();
