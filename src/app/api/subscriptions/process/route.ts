import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Procesa suscripciones:
// 1. Crea gastos automáticamente para suscripciones vencidas y avanza la fecha
// 2. Crea recordatorios para suscripciones que vencen en 3 días
export async function POST(_req: NextRequest) {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 86400000);
  const result = {
    charged: 0,
    reminders: 0,
    advanced: 0,
    details: [] as Array<{ name: string; action: string; amount?: number }>,
  };

  const subscriptions = await db.subscription.findMany({
    where: { active: true },
    include: { category: true, account: true },
  });

  for (const sub of subscriptions) {
    let nextDate = new Date(sub.nextDate);

    // 1. Si la fecha ya pasó → cobrar y avanzar
    while (nextDate.getTime() <= now.getTime()) {
      // Crear el gasto
      await db.expense.create({
        data: {
          amount: sub.amount,
          type: "expense",
          currency: sub.currency,
          date: new Date(nextDate),
          categoryId: sub.categoryId || (await getDefaultCategoryId()),
          merchantName: sub.merchantName || sub.name,
          paymentMethod: "credit",
          accountId: sub.accountId || null,
          notes: `Suscripción: ${sub.name}`,
          tags: "suscripcion,recurrente",
          isRecurring: true,
          recurringName: sub.name,
          source: "subscription",
        },
      });

      // Actualizar balance de cuenta
      if (sub.accountId) {
        await db.account.update({
          where: { id: sub.accountId },
          data: { balance: { decrement: sub.amount } },
        });
      }

      // Avanzar la fecha
      nextDate = advanceDate(nextDate, sub.period);
      result.charged++;
      result.advanced++;
      result.details.push({
        name: sub.name,
        action: "charged",
        amount: sub.amount,
      });
    }

    // Actualizar nextDate en la BD si avanzó
    if (nextDate.getTime() !== new Date(sub.nextDate).getTime()) {
      await db.subscription.update({
        where: { id: sub.id },
        data: { nextDate: nextDate },
      });
    }

    // 2. Si vence en 3 días → crear recordatorio (si no existe ya)
    if (nextDate.getTime() <= threeDaysFromNow.getTime() && nextDate.getTime() > now.getTime()) {
      const existingReminder = await db.reminder.findFirst({
        where: {
          title: { contains: sub.name },
          dueDate: { gte: now, lte: nextDate },
          done: false,
        },
      });

      if (!existingReminder) {
        await db.reminder.create({
          data: {
            title: `Suscripción por vencer: ${sub.name}`,
            type: "pay_service",
            dueDate: nextDate,
            notes: `Se cobrarán ${sub.amount} ${sub.currency} de tu suscripción a ${sub.name}.`,
          },
        });
        result.reminders++;
        result.details.push({
          name: sub.name,
          action: "reminder",
        });
      }
    }
  }

  return NextResponse.json(result);
}

async function getDefaultCategoryId(): Promise<string> {
  const cat = await db.category.findFirst({ where: { name: "Servicios" } })
    || await db.category.findFirst({ where: { name: "Otros" } })
    || await db.category.findFirst();
  return cat?.id || "";
}

function advanceDate(date: Date, period: string): Date {
  const d = new Date(date);
  if (period === "yearly") {
    d.setFullYear(d.getFullYear() + 1);
  } else if (period === "weekly") {
    d.setDate(d.getDate() + 7);
  } else if (period === "biweekly") {
    d.setDate(d.getDate() + 15);
  } else {
    // monthly (default)
    d.setMonth(d.getMonth() + 1);
  }
  return d;
}
