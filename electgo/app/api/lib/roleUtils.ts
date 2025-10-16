import { Session } from "next-auth";

export type UserRole = "ADMIN" | "MANAGER" | "STAFF" | "SUPERVISOR";

export function canManageInventory(role: UserRole): boolean {
  return role === "ADMIN" || role === "MANAGER" || role === "STAFF";
}

export function canDeleteInventory(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canViewInventory(role: UserRole): boolean {
  return role === "ADMIN" || role === "MANAGER" || role === "STAFF" || role === "SUPERVISOR";
}

export function canCreateSale(role: UserRole): boolean {
  return role === "ADMIN" || role === "MANAGER" || role === "STAFF" || role === "SUPERVISOR";
}

export function canDeleteSale(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canManageSales(role: UserRole): boolean {
  return role === "ADMIN" || role === "MANAGER" || role === "SUPERVISOR";
}

export function canViewSales(role: UserRole): boolean {
  return role === "ADMIN" || role === "MANAGER" || role === "STAFF" || role === "SUPERVISOR";
}

export function canCreateExpense(role: UserRole): boolean {
  return role === "ADMIN" || role === "MANAGER" || role === "STAFF";
}

export function canManageExpenses(role: UserRole): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

export function canDeleteExpense(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canViewExpenses(role: UserRole): boolean {
  return role === "ADMIN" || role === "MANAGER" || role === "STAFF" || role === "SUPERVISOR";
}
