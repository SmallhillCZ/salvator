import { Controller, Get, Param, Query, Render } from "@nestjs/common";
import { marked } from "marked";
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
					return {
						id: sermon.id,
						date,
						title: sermon.title,
						description: sermon.description,
					};
				}),
		};
	}

	@Get(":id/transcript")
	@Render("sermon-transcript")
	async getSermonTranscriptView(@Param("id") id: string, @Query("original") original: boolean) {
		const transcription = await this.salvatorService.getSermonTranscript(id, { original });

		const content = await marked.parse(transcription);

		return {
			content: content,
		};
	}

	@Get("api/sermons")
	async getSermons() {
		return await this.salvatorService.getSermons();
	}

	@Get("api/sermons/:id/transcript")
	async getSermonTranscript(@Param("id") id: string, @Query("original") original: boolean) {
		return await this.salvatorService.getSermonTranscript(id, { original });
	}
}
