import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Config } from "./config";

export function registerOpenAPI(app: INestApplication, config: Config) {
	const options = new DocumentBuilder().setTitle(config.app.name).setVersion(config.app.version).build();

	const document = SwaggerModule.createDocument(app, options, {
		operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
	});

	SwaggerModule.setup("openapi", app, document, {});
}
