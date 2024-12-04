import { Controller, Get, Header, Param, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { SalvatorService } from "src/services/salvator/salvator.service";

@Controller("")
export class SermonsController {
	constructor(private salvatorService: SalvatorService) {}

	@Get()
	@Header("content-type", "text/html")
	async getSermons(@Res({ passthrough: false }) res: Response) {
		const sermons = await this.salvatorService.getSermons();
		res.send(`\
<!DOCTYPE html>
<html>
	<head>
		<style>
			td,th{padding:0.5em}
		</style>
	</head>
	<body>
		<h1>Přepisy kázání</h1>
		<table>
			${sermons
				.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
				.map((sermon) => {
					const date = new Date(sermon.date).toLocaleDateString("cs-CZ");
					return `\
					<tr>
						<th>${date}</th>
						<td><a href="/${sermon.id}/transcript">${sermon.title}</a></td>
						<td>${sermon.description}</td>
					</tr>`;
				})
				.join("")}
		</table>
	</body>
</html>`);
	}

	@Get(":id/transcript")
	@Header("content-type", "text/plain")
	async getSermonTranscript(
		@Param("id") id: string,
		@Query("original") original: boolean,
		@Res({ passthrough: false }) res: Response,
	) {
		const transcription = await this.salvatorService.getSermonTranscript(id, { original });

		if (!transcription) return res.sendStatus(404);

		res.send(transcription);
	}
}
