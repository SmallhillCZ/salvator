import { NestExpressApplication } from "@nestjs/platform-express";
import * as hbs from "express-handlebars";
import { join } from "path";

export function registerTemplating(app: NestExpressApplication) {
	app.useStaticAssets(join(__dirname, "..", "public"));
	app.setBaseViewsDir(join(__dirname, "..", "views"));

	app.engine(
		"hbs",
		hbs.engine({
			extname: "hbs",
			layoutsDir: join(__dirname, "..", "views/layouts"),
			partialsDir: join(__dirname, "..", "views/partials"),
			defaultLayout: "default",
		}),
	);

	app.setViewEngine("hbs");
}
