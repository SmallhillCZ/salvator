import { Controller, Get, NotFoundException, Param, Query, Render } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { marked } from "marked";
import { GetSermonQueryDto, SermonDto } from "src/dto/sermon.dto";
import { SalvatorService } from "src/services/salvator/salvator.service";

@Controller("")
@ApiTags("HTML")
export class SermonsController {
	constructor(private salvatorService: SalvatorService) {}

	@Get()
	@Render("sermons")
	async getSermonsView() {
		const sermons = await this.salvatorService.getSermons();

		return {
			sermons: sermons
				.sort((a, b) => (a.date && b.date ? b.date.localeCompare(a.date) : 0))
				.map((sermon) => this.formatSermonForView(sermon)),
		};
	}

	@Get(":id")
	@Render("sermon")
	async getSermonTranscriptView(@Param("id") id: string, @Query() query: GetSermonQueryDto) {
		const sermon = await this.salvatorService.getSermon(id);
		if (!sermon) throw new NotFoundException();

		const transcription = await this.salvatorService.getSermonTranscript(id, { original: !!query.original });
		if (!transcription) throw new NotFoundException();

		const html = await marked.parse(transcription);

		return {
			title: sermon.title ?? null,
			sermon: this.formatSermonForView(sermon),
			transcript: html,
		};
	}

	private formatSermonForView(sermon: SermonDto) {
		return {
			...sermon,
			date: sermon.date ? new Date(sermon.date).toLocaleDateString("cs-CZ", { timeZone: "CET" }) : null,
		};
	}
}
