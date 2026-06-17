import {
  createBudget,
  deleteBudget,
  getBudgets,
} from "../repositories/budget.repository";

export async function addBudget(data: {
  userId: string;
  category: string;
  amount: number;
}) {
  return createBudget(data);
}

export async function listBudgets(userId: string) {
  return getBudgets(userId);
}

export async function removeBudget(id: string) {
  return deleteBudget(id);
}