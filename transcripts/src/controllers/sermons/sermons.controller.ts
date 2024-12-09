import { Controller, Get, NotFoundException, Param, Query, Render } from "@nestjs/common";
import { marked } from "marked";
import { GetSermonQueryDto } from "src/dto/sermon.dto";
import { SalvatorService } from "src/services/salvator/salvator.service";

@Controller("")
export class SermonsController {
	constructor(private salvatorService: SalvatorService) {}

	@Get()
	@Render("sermons")
	async getSermonsView() {
		const sermons = await this.salvatorService.getSermons();

		return {
			sermons: sermons
				.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
				.map((sermon) => {
					const date = new Date(sermon.date).toLocaleDateString("cs-CZ", { timeZone: "CET" });
					const idparts = sermon.id.match(/^(\d{4})-(\d{4}-\d{2}-\d{2})/);
					return {
						id: sermon.id,
						date,
						title: sermon.title,
						description: sermon.description,
						url_farnost: `https://www.farnostsalvator.cz/kazani/${idparts[1]}/${idparts[2]}`,
					};
				}),
		};
	}

	@Get(":id")
	@Render("sermon")
	async getSermonTranscriptView(@Param("id") id: string, @Query() query: GetSermonQueryDto) {
		const sermon = await this.salvatorService.getSermon(id);
		if (!sermon) throw new NotFoundException();

		const transcription = await this.salvatorService.getSermonTranscript(id, { original: query.original });
		if (!transcription) throw new NotFoundException();

		const html = await marked.parse(transcription);

		return {
			sermon,
			transcript: html,
		};
	}

	@Get("api/sermons")
	async getSermons() {
		return await this.salvatorService.getSermons();
	}

	@Get("api/sermons/:id/transcript")
	async getSermonTranscript(@Param("id") id: string, @Query() query: GetSermonQueryDto) {
		return await this.salvatorService.getSermonTranscript(id, { original: query.original });
	}
}
