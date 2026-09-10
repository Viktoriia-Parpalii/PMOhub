import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt, Min } from "class-validator";
import { FILTER_OPTION_VISIBILITY_MODES } from "./system-settings.types";

export class UpdateFilterOptionVisibilityDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  revision!: number;

  @ApiProperty({ enum: FILTER_OPTION_VISIBILITY_MODES })
  @IsIn(FILTER_OPTION_VISIBILITY_MODES)
  analytics!: "ACTIVE_ONLY" | "ALL";

  @ApiProperty({ enum: FILTER_OPTION_VISIBILITY_MODES })
  @IsIn(FILTER_OPTION_VISIBILITY_MODES)
  portfolio!: "ACTIVE_ONLY" | "ALL";

  @ApiProperty({ enum: FILTER_OPTION_VISIBILITY_MODES })
  @IsIn(FILTER_OPTION_VISIBILITY_MODES)
  backlog!: "ACTIVE_ONLY" | "ALL";
}
