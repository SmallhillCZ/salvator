import { Controller, Get, Header, NotFoundException, Param, Query, Res } from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { GetSermonQueryDto, SermonDto } from "src/dto/sermon.dto";
import { SalvatorService } from "src/services/salvator/salvator.service";

@Controller("api/sermons")
@ApiTags("API")
export class SermonsApiController {
	constructor(private salvatorService: SalvatorService) {}

	@Get("")
	async getSermons(): Promise<SermonDto[]> {
		const sermons = await this.salvatorService.getSermons();
		return sermons;
	}

	@Get(":id")
	async getSermon(@Param("id") id: string): Promise<SermonDto> {
		const sermon = await this.salvatorService.getSermon(id);
		if (!sermon) throw new NotFoundException();

		return sermon;
	}

	@Get(":id/transcript")
	@Header("Content-Type", "text/plain")
	@ApiResponse({ type: String, status: 200 })
	async getSermonTranscript(
		@Param("id") id: string,
		@Query() query: GetSermonQueryDto,
		@Res() res: Response,
	): Promise<void> {
		const transcript = await this.salvatorService.getSermonTranscript(id, { original: query.original });

		if (!transcript) res.sendStatus(404);
		else res.status(200).send(transcript);
	}
}
