import { IsBoolean, IsOptional } from "class-validator";

export class GetSermonQueryDto {
	@IsBoolean() @IsOptional() original?: boolean;
}
