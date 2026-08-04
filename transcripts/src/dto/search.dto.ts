import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { SermonDto } from "./sermon.dto";

export const SEARCH_SORTS = ["relevance", "date"] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export const SEARCH_DEFAULT_LIMIT = 20;
export const SEARCH_MAX_LIMIT = 100;

export class SearchQueryDto {
	/** Hledaný výraz. Všechna slova musí být nalezena, fráze lze uzavřít do dvojitých uvozovek. */
	@IsString() @MaxLength(200) @IsOptional() q?: string;

	/** Počet výsledků na stránku. */
	@IsInt() @Min(1) @Max(SEARCH_MAX_LIMIT) @IsOptional() limit?: number;

	/** Pořadí prvního vráceného výsledku. */
	@IsInt() @Min(0) @IsOptional() offset?: number;

	/** Řazení výsledků: podle relevance (výchozí), nebo od nejnovějšího kázání. */
	@ApiPropertyOptional({ enum: SEARCH_SORTS })
	@IsIn(SEARCH_SORTS)
	@IsOptional()
	sort?: SearchSort;
}

export class SearchSnippetPartDto {
	text!: string;

	/** Označuje část úryvku, která odpovídá hledanému výrazu. */
	highlight!: boolean;
}

export class SearchResultDto {
	sermon!: SermonDto;

	/** Počet nalezených výskytů hledaných výrazů v přepisu. */
	matchCount!: number;

	/** Úryvky přepisu s nalezenými výskyty, rozdělené na části podle zvýraznění. */
	snippets!: SearchSnippetPartDto[][];
}

export class SearchResponseDto {
	/** Hledaný výraz, jak byl zadán. */
	query!: string;

	/** Výrazy, které byly z dotazu skutečně použity pro hledání. */
	terms!: string[];

	/** Celkový počet nalezených kázání. */
	total!: number;

	limit!: number;
	offset!: number;

	@ApiProperty({ enum: SEARCH_SORTS })
	sort!: SearchSort;

	results!: SearchResultDto[];
}
