import { HttpStatus } from "@nestjs/common";
import { Prisma } from "../../../generated/prisma/client";
import { AppError } from "../../../common/errors/app-error";

const unique = <T>(values: T[]) => [...new Set(values)];

export async function assertPeriodCapacity(
  tx: Prisma.TransactionClient,
  year: number,
  quarter: number,
) {
  const cards = await tx.quarterCard.findMany({
    where: { quarter, initiativeYear: { year } },
    include: {
      departments: true,
      scopeItems: { include: { executors: true } },
    },
  });
  const loads = new Map<string, number>();
  for (const card of cards) {
    const allExecutors = new Set(
      card.scopeItems.flatMap((item) =>
        item.executors.map((link) => link.departmentId),
      ),
    );
    for (const item of card.scopeItems) {
      const executors = unique(item.executors.map((link) => link.departmentId));
      const share = executors.length
        ? item.weightSnapshotValue.toNumber() / executors.length
        : 0;
      executors.forEach((id) => loads.set(id, (loads.get(id) ?? 0) + share));
    }
    const involved = card.departments
      .map((link) => link.departmentId)
      .filter((id) => !allExecutors.has(id));
    if (card.scopeItems.length && involved.length) {
      const total = card.scopeItems.reduce(
        (sum, item) => sum + item.weightSnapshotValue.toNumber(),
        0,
      );
      const share = total / card.scopeItems.length / involved.length;
      involved.forEach((id) => loads.set(id, (loads.get(id) ?? 0) + share));
    }
  }
  if (!loads.size) return;
  const departments = await tx.department.findMany({
    where: { id: { in: [...loads.keys()] } },
  });
  const exceeded = departments
    .filter(
      (department) =>
        (loads.get(department.id) ?? 0) >
        department.capacityLimitPoints.toNumber(),
    )
    .map((department) => ({
      department_id: department.id,
      name: department.name,
      load: Math.round((loads.get(department.id) ?? 0) * 100) / 100,
      limit: department.capacityLimitPoints.toNumber(),
    }));
  if (exceeded.length)
    throw new AppError(
      "DEPARTMENT_CAPACITY_EXCEEDED",
      "Навантаження підрозділів перевищує встановлений ліміт.",
      HttpStatus.UNPROCESSABLE_ENTITY,
      { departments: exceeded },
    );
}
