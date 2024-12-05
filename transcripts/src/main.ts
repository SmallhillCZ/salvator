import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { AppModule } from "./app.module";
import { Config } from "./config";
import { registerOpenAPI } from "./openapi";

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);

	const config = app.get(Config);

	app.useStaticAssets(join(__dirname, "..", "public"));
	app.setBaseViewsDir(join(__dirname, "..", "views"));
	app.setViewEngine("hbs");

	registerOpenAPI("api", app, config);

	await app.listen(config.server.port, config.server.host);
}
bootstrap();
