import { prisma } from "../database/prisma";

export async function upsertTelegramUser(data: {
  id: string;
  firstName?: string;
  username?: string;
}) {
  return prisma.user.upsert({
    where: {
      id: data.id,
    },
    update: {
      firstName: data.firstName,
      username: data.username,
    },
    create: {
      id: data.id,
      firstName: data.firstName,
      username: data.username,
    },
  });
}