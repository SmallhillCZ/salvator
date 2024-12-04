import { Module } from "@nestjs/common";
import { Config } from "./config";

@Module({
	imports: [],
	controllers: [],
	providers: [Config],
})
export class AppModule {}
