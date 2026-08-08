"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { authenticate, createSession, destroySession, requireOwner } from "@/lib/auth";
import { getProperty, getCategories } from "@/lib/queries";
import { sql } from "@/lib/db";

function parseAmount(value: FormDataEntryValue | null): number {
  return Number(String(value ?? "0").replace(/,/g, ""));
}

function deriveBalanceEffect(entryType: string, amount: number): number {
  if (entryType === "expense") {
    return -Math.abs(amount);
  }

  return Math.abs(amount);
}

function ownerRequiredForScope(entryScope: string, ownerIdRaw: string): boolean {
  const ownerRequiredScopes = new Set(["owner_withdrawal", "owner_expense", "owner_distribution"]);
  return ownerRequiredScopes.has(entryScope) && !ownerIdRaw;
}

export async function loginAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const user = await authenticate(email, password);

  if (!user) {
    redirect("/login?error=invalid");
  }

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function createCategoryAction(formData: FormData): Promise<void> {
  await requireOwner();
  const property = await getProperty();

  if (!property) {
    throw new Error("Property not configured.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const categoryType = String(formData.get("category_type") ?? "expense");

  if (!name) {
    redirect("/ledger?error=category-name-required");
  }

  const categories = await getCategories(property.id);
  const nextSortOrder = categories.length + 1;

  await sql(
    `INSERT INTO categories (property_id, name, category_type, sort_order)
     VALUES ($1, $2, $3, $4)`,
    [property.id, name, categoryType, nextSortOrder]
  );

  revalidatePath("/ledger");
  revalidatePath("/reports");
  revalidatePath("/categories");
  redirect("/ledger?success=category-created");
}

export async function updateCategoryAction(formData: FormData): Promise<void> {
  await requireOwner();
  const property = await getProperty();

  if (!property) {
    throw new Error("Property not configured.");
  }

  const categoryId = Number(formData.get("category_id"));
  const name = String(formData.get("name") ?? "").trim();
  const categoryType = String(formData.get("category_type") ?? "expense");
  const sortOrder = Number(formData.get("sort_order") ?? 0);

  if (!categoryId || !name) {
    redirect("/categories?error=category-invalid");
  }

  await sql(
    `UPDATE categories
     SET name = $3,
         category_type = $4,
         sort_order = $5,
         updated_at = NOW()
     WHERE id = $1
       AND property_id = $2`,
    [categoryId, property.id, name, categoryType, Number.isFinite(sortOrder) ? sortOrder : 0]
  );

  revalidatePath("/ledger");
  revalidatePath("/reports");
  revalidatePath("/categories");
  redirect("/categories?success=category-updated");
}

export async function toggleCategoryStatusAction(formData: FormData): Promise<void> {
  await requireOwner();
  const property = await getProperty();

  if (!property) {
    throw new Error("Property not configured.");
  }

  const categoryId = Number(formData.get("category_id"));
  const nextActive = String(formData.get("next_active")) === "true";

  if (!categoryId) {
    redirect("/categories?error=category-invalid");
  }

  await sql(
    `UPDATE categories
     SET is_active = $3,
         updated_at = NOW()
     WHERE id = $1
       AND property_id = $2`,
    [categoryId, property.id, nextActive]
  );

  revalidatePath("/ledger");
  revalidatePath("/reports");
  revalidatePath("/categories");
  redirect(`/categories?success=${nextActive ? "category-restored" : "category-disabled"}`);
}

export async function createLedgerEntryAction(formData: FormData): Promise<void> {
  const user = await requireOwner();
  const property = await getProperty();

  if (!property) {
    throw new Error("Property not configured.");
  }

  const entryDate = String(formData.get("entry_date") ?? "");
  const entryType = String(formData.get("entry_type") ?? "expense");
  const entryScope = String(formData.get("entry_scope") ?? "shared_property");
  const categoryIdRaw = String(formData.get("category_id") ?? "");
  const ownerIdRaw = String(formData.get("owner_id") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const amount = parseAmount(formData.get("amount"));
  const visible = formData.get("is_visible_to_stakeholders") === "on";

  if (!entryDate || !description || !Number.isFinite(amount) || amount <= 0) {
    redirect("/ledger?error=entry-invalid");
  }

  if (ownerRequiredForScope(entryScope, ownerIdRaw)) {
    redirect("/ledger?error=owner-required");
  }

  await sql(
    `INSERT INTO ledger_entries (
        property_id,
        category_id,
        owner_id,
        entry_date,
        entry_type,
        entry_scope,
        description,
        notes,
        amount,
        balance_effect,
        source,
        is_visible_to_stakeholders,
        created_by_user_id,
        updated_by_user_id
     ) VALUES ($1, NULLIF($2, '')::bigint, NULLIF($3, '')::bigint, $4, $5, $6, $7, NULLIF($8, ''), $9, $10, 'manual', $11, $12, $12)`,
    [
      property.id,
      categoryIdRaw,
      ownerIdRaw,
      entryDate,
      entryType,
      entryScope,
      description,
      notes,
      amount.toFixed(2),
      deriveBalanceEffect(entryType, amount).toFixed(2),
      visible,
      user.id
    ]
  );

  revalidatePath("/");
  revalidatePath("/ledger");
  revalidatePath("/reports");
  revalidatePath("/categories");
  redirect("/ledger?success=entry-created");
}

export async function updateLedgerEntryAction(formData: FormData): Promise<void> {
  const user = await requireOwner();
  const property = await getProperty();

  if (!property) {
    throw new Error("Property not configured.");
  }

  const entryId = Number(formData.get("entry_id"));
  const entryDate = String(formData.get("entry_date") ?? "");
  const entryType = String(formData.get("entry_type") ?? "expense");
  const entryScope = String(formData.get("entry_scope") ?? "shared_property");
  const categoryIdRaw = String(formData.get("category_id") ?? "");
  const ownerIdRaw = String(formData.get("owner_id") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const amount = parseAmount(formData.get("amount"));
  const visible = formData.get("is_visible_to_stakeholders") === "on";

  if (!entryId) {
    redirect("/ledger?error=entry-missing");
  }

  if (!entryDate || !description || !Number.isFinite(amount) || amount <= 0) {
    redirect(`/ledger?edit_id=${entryId}&error=entry-invalid`);
  }

  if (ownerRequiredForScope(entryScope, ownerIdRaw)) {
    redirect(`/ledger?edit_id=${entryId}&error=owner-required`);
  }

  await sql(
    `UPDATE ledger_entries
     SET category_id = NULLIF($3, '')::bigint,
         owner_id = NULLIF($4, '')::bigint,
         entry_date = $5,
         entry_type = $6,
         entry_scope = $7,
         description = $8,
         notes = NULLIF($9, ''),
         amount = $10,
         balance_effect = $11,
         is_visible_to_stakeholders = $12,
         updated_by_user_id = $13,
         updated_at = NOW()
     WHERE id = $1
       AND property_id = $2
       AND is_archived = FALSE`,
    [
      entryId,
      property.id,
      categoryIdRaw,
      ownerIdRaw,
      entryDate,
      entryType,
      entryScope,
      description,
      notes,
      amount.toFixed(2),
      deriveBalanceEffect(entryType, amount).toFixed(2),
      visible,
      user.id
    ]
  );

  revalidatePath("/");
  revalidatePath("/ledger");
  revalidatePath("/reports");
  revalidatePath("/categories");
  redirect("/ledger?success=entry-updated");
}

export async function archiveLedgerEntryAction(formData: FormData): Promise<void> {
  const user = await requireOwner();
  const entryId = Number(formData.get("entry_id"));

  if (!entryId) {
    redirect("/ledger?error=entry-missing");
  }

  await sql(
    `UPDATE ledger_entries
     SET is_archived = TRUE,
         updated_by_user_id = $2,
         updated_at = NOW()
     WHERE id = $1`,
    [entryId, user.id]
  );

  revalidatePath("/");
  revalidatePath("/ledger");
  revalidatePath("/reports");
  revalidatePath("/categories");
  redirect("/ledger?success=entry-archived");
}
