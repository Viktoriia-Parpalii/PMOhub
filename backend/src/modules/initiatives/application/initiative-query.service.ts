import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma.service";
import { AppError } from "../../../common/errors/app-error";
import { HttpStatus } from "@nestjs/common";
import { QuarterDto } from "../api/initiative.dto";
import {
  cardInclude,
  backlogCardSummaryInclude,
  cardSummaryInclude,
  mapBacklogCardSummary,
  mapCard,
  mapCardSummary,
  mapYear,
  yearInclude,
} from "../infrastructure/initiative.mapper";

const ok = <T>(message: string, data: T) => ({
  success: true as const,
  message,
  data,
});

@Injectable()
export class InitiativeQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async listYears(query: { kind?: string; year?: number }) {
    this.validateYear(query.year);
    const years = await this.prisma.initiativeYear.findMany({
      where: {
        year: query.year,
        initiative: query.kind ? { kind: this.kind(query.kind) } : undefined,
      },
      include: yearInclude,
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    });
    return ok("Роки ініціатив завантажено", years.map(mapYear));
  }

  async countYears(year: number) {
    this.validateYear(year);
    const [projects, operationalTasks] = await Promise.all([
      this.prisma.initiativeYear.count({
        where: { year, initiative: { kind: "PROJECT" } },
      }),
      this.prisma.initiativeYear.count({
        where: { year, initiative: { kind: "OPERATIONAL_TASK" } },
      }),
    ]);
    return ok("Лічильники беклогу завантажено", {
      projects,
      operational_tasks: operationalTasks,
    });
  }

  async listCards(query: {
    kind?: string;
    year?: number;
    quarter?: QuarterDto;
  }) {
    this.validateYear(query.year);
    if (query.quarter && !["Q1", "Q2", "Q3", "Q4"].includes(query.quarter)) {
      throw new AppError(
        "INVALID_QUARTER",
        "Невідомий квартал.",
        HttpStatus.BAD_REQUEST,
      );
    }
    const cards = await this.prisma.quarterCard.findMany({
      where: {
        quarter: query.quarter ? Number(query.quarter.slice(1)) : undefined,
        initiativeYear: {
          year: query.year,
          initiative: query.kind ? { kind: this.kind(query.kind) } : undefined,
        },
      },
      include: cardSummaryInclude,
      orderBy: [
        { initiativeYear: { year: "desc" } },
        { quarter: "asc" },
        { createdAt: "desc" },
      ],
    });
    return ok("Квартальні картки завантажено", cards.map(mapCardSummary));
  }

  async listBacklogCardSummaries(initiativeYearId: string) {
    const cards = await this.prisma.quarterCard.findMany({
      where: {
        initiativeYearId,
      },
      include: backlogCardSummaryInclude,
      orderBy: [
        { initiativeYear: { year: "desc" } },
        { quarter: "asc" },
        { createdAt: "desc" },
      ],
    });
    return ok(
      "Квартальні картки беклогу завантажено",
      cards.map(mapBacklogCardSummary),
    );
  }

  async getYear(id: string) {
    const year = await this.prisma.initiativeYear.findUnique({
      where: { id },
      include: yearInclude,
    });
    if (!year)
      throw new AppError(
        "NOT_FOUND",
        "Рік ініціативи не знайдено.",
        HttpStatus.NOT_FOUND,
      );
    return ok("Рік ініціативи завантажено", mapYear(year));
  }

  async getCard(id: string) {
    const card = await this.prisma.quarterCard.findUnique({
      where: { id },
      include: cardInclude,
    });
    if (!card)
      throw new AppError(
        "NOT_FOUND",
        "Картку не знайдено.",
        HttpStatus.NOT_FOUND,
      );
    return ok("Картку завантажено", mapCard(card));
  }

  private kind(value: string) {
    const normalized = value.toUpperCase();
    if (!["PROJECT", "OPERATIONAL_TASK"].includes(normalized))
      throw new AppError("INVALID_KIND", "Невідомий тип ініціативи.");
    return normalized;
  }

  private validateYear(year?: number) {
    if (
      year !== undefined &&
      (!Number.isInteger(year) || year < 2000 || year > 2200)
    ) {
      throw new AppError(
        "INVALID_YEAR",
        "Некоректний рік.",
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
