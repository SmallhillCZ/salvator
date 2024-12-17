import { IsNumber, IsOptional } from "class-validator";

export class SermonDto {
	id!: string;
	title!: string;
	url_audio!: string;

	url_farnost?: string;
	description?: string;
	date?: string;
}

export class GetSermonQueryDto {
	@IsNumber() @IsOptional() original?: number;
}
