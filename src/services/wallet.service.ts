import {
  createWallet,
  deleteWallet,
  findWalletById,
  getWallets,
} from "../repositories/wallet.repository";

export async function addWallet(data: {
  userId: string;
  name: string;
  balance?: number;
}) {
  return createWallet(data);
}

export async function listWallets(userId: string) {
  return getWallets(userId);
}

export async function removeWallet(userId: string, id: string) {
  const wallet = await findWalletById(userId, id);

  if (!wallet) {
    return null;
  }

  await deleteWallet(wallet.id);

  return wallet;
}