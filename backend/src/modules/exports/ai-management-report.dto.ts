import { ApiProperty } from "@nestjs/swagger";

export class AiManagementReportV2Dto {
  @ApiProperty({ example: "2.0" }) schema_version!: "2.0";
  @ApiProperty({ description: "Період і фактичне охоплення без технічних фільтрів." })
  report_context!: Record<string, unknown>;
  @ApiProperty({ description: "Управлінські KPI для вибраного періоду." })
  executive_metrics!: Record<string, number>;
  @ApiProperty({ description: "Розподіли, тренд і дозволена capacity-деталізація." })
  breakdowns!: Record<string, unknown[]>;
  @ApiProperty({
    type: "array",
    items: { type: "object", additionalProperties: true },
    description: "Компактні ініціативи без текстів та ID завдань скоупу.",
  })
  initiatives!: Array<Record<string, unknown>>;
  @ApiProperty({ description: "Лічильники незаповнених управлінських атрибутів." })
  data_quality!: Record<string, number>;
  @ApiProperty({ description: "Стабільне завдання для українського звіту керівництву." })
  analysis_brief!: Record<string, unknown>;
}
