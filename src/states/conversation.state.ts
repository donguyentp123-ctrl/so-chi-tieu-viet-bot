export type ConversationAction =
  | "ADD_EXPENSE"
  | "ADD_INCOME"
  | "EDIT_TRANSACTION"
  | "DELETE_TRANSACTION"
  | "VIEW_DETAIL"
  | "SEARCH_TRANSACTION";

export type ConversationStep =
  | "INPUT_AMOUNT_NOTE"
  | "SELECT_CATEGORY"
  | "SELECT_WALLET"
  | "INPUT_ID"
  | "INPUT_AMOUNT"
  | "INPUT_NOTE"
  | "SELECT_EDIT_FIELD"
  | "INPUT_KEYWORD";

export type ConversationState = {
  action: ConversationAction;
  step: ConversationStep;
  data?: Record<string, unknown>;
};

const conversationMap = new Map<number, ConversationState>();

export function setConversation(userId: number, state: ConversationState) {
  conversationMap.set(userId, state);
}

export function getConversation(userId: number) {
  return conversationMap.get(userId);
}

export function clearConversation(userId: number) {
  conversationMap.delete(userId);
}

export function hasConversation(userId: number) {
  return conversationMap.has(userId);
}