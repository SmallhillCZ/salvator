import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { SearchQueryDto, SearchResponseDto } from "src/dto/search.dto";
import { SearchService } from "src/services/search/search.service";

@Controller("api/search")
@ApiTags("API")
export class SearchApiController {
	constructor(private searchService: SearchService) {}

	/** Fulltextové hledání v přepisech kázání. */
	@Get("")
	async search(@Query() query: SearchQueryDto): Promise<SearchResponseDto> {
		return await this.searchService.search(query);
	}
}
