import { archiveLedgerEntryAction, createCategoryAction, createLedgerEntryAction, updateLedgerEntryAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { getCategories, getLedgerEntries, getLedgerEntryById, getProperty } from "@/lib/queries";

function bannerFromSearch(search: Record<string, string | string[] | undefined>): { kind: "error" | "success"; message: string } | null {
  if (search.error) {
    const errorValue = Array.isArray(search.error) ? search.error[0] : search.error;
    const messages: Record<string, string> = {
      invalid: "The submitted values were not valid.",
      "entry-invalid": "Please provide a valid date, description, and amount.",
      "entry-missing": "The selected entry could not be found.",
      "category-name-required": "Category name is required."
    };

    return {
      kind: "error",
      message: messages[errorValue] ?? "Something went wrong."
    };
  }

  if (search.success) {
    const successValue = Array.isArray(search.success) ? search.success[0] : search.success;
    const messages: Record<string, string> = {
      "entry-created": "Ledger entry saved.",
      "entry-updated": "Ledger entry updated.",
      "entry-archived": "Ledger entry archived.",
      "category-created": "Category created."
    };

    return {
      kind: "success",
      message: messages[successValue] ?? "Saved."
    };
  }

  return null;
}

export default async function LedgerPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const property = await getProperty();
  const search = await searchParams;

  if (!property) {
    return null;
  }

  const filters = {
    year: typeof search.year === "string" ? search.year : undefined,
    month: typeof search.month === "string" ? search.month : undefined,
    entryType: typeof search.entry_type === "string" ? search.entry_type : undefined,
    search: typeof search.search === "string" ? search.search : undefined,
    stakeholdersOnly: user.role_code === "stakeholder_viewer"
  };
  const editId = typeof search.edit_id === "string" ? Number(search.edit_id) : 0;

  const [categories, entries, editingEntry] = await Promise.all([
    getCategories(property.id),
    getLedgerEntries(property.id, filters),
    editId > 0 ? getLedgerEntryById(property.id, editId) : Promise.resolve(null)
  ]);

  const banner = bannerFromSearch(search);
  const canEdit = user.role_code === "owner_admin";

  const entryFormAction = editingEntry ? updateLedgerEntryAction : createLedgerEntryAction;
  const entryFormTitle = editingEntry ? "Edit ledger entry" : "Add ledger entry";
  const entryFormButton = editingEntry ? "Update entry" : "Save entry";

  return (
    <main className="grid" style={{ marginTop: 18 }}>
      <section className="hero">
        <div className="topbar">
          <div>
            <p className="eyebrow">Ledger</p>
            <h2 className="section-title">Full ledger</h2>
            <p className="muted" style={{ margin: 0 }}>
              Every income, expense, adjustment, and opening balance entry in one timeline.
            </p>
          </div>
          <span className="pill">{canEdit ? "Owner editing enabled" : "Read-only viewer access"}</span>
        </div>

        {banner ? <div className={`banner ${banner.kind}`}>{banner.message}</div> : null}

        <form method="get" className="form-grid">
          <label>
            Year
            <input type="number" min="2000" max="2100" name="year" defaultValue={filters.year ?? ""} />
          </label>
          <label>
            Month
            <input type="month" name="month" defaultValue={filters.month ?? ""} />
          </label>
          <label>
            Entry type
            <select name="entry_type" defaultValue={filters.entryType ?? ""}>
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="adjustment">Adjustment</option>
              <option value="opening_balance">Opening balance</option>
            </select>
          </label>
          <label>
            Search
            <input type="search" name="search" defaultValue={filters.search ?? ""} placeholder="Description or notes" />
          </label>
          <div style={{ alignSelf: "end" }}>
            <button type="submit">Apply filters</button>
          </div>
        </form>
      </section>

      {canEdit ? (
        <section className="grid cards">
          <article className="panel">
            <h2 style={{ marginTop: 0 }}>{entryFormTitle}</h2>
            <form action={entryFormAction} className="grid">
              {editingEntry ? <input type="hidden" name="entry_id" value={editingEntry.id} /> : null}
              <div className="form-grid">
                <label>
                  Date
                  <input type="date" name="entry_date" required defaultValue={editingEntry?.entry_date ?? ""} />
                </label>
                <label>
                  Entry type
                  <select name="entry_type" defaultValue={editingEntry?.entry_type ?? "expense"}>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="adjustment">Adjustment</option>
                    <option value="opening_balance">Opening balance</option>
                  </select>
                </label>
                <label>
                  Category
                  <select name="category_id" defaultValue={editingEntry?.category_id ? String(editingEntry.category_id) : ""}>
                    <option value="">Uncategorised</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Amount
                  <input type="number" step="0.01" min="0" name="amount" required defaultValue={editingEntry?.amount ?? ""} />
                </label>
              </div>

              <label>
                Description
                <input
                  type="text"
                  name="description"
                  required
                  placeholder="Rent received, levy paid, painting repair..."
                  defaultValue={editingEntry?.description ?? ""}
                />
              </label>

              <label>
                Notes
                <textarea
                  name="notes"
                  placeholder="Optional extra context for Murray or the stakeholders."
                  defaultValue={editingEntry?.notes ?? ""}
                />
              </label>

              <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  type="checkbox"
                  name="is_visible_to_stakeholders"
                  defaultChecked={editingEntry ? editingEntry.is_visible_to_stakeholders : true}
                  style={{ width: "auto" }}
                />
                Visible to Astrid and Kiki
              </label>

              <div className="nav-links">
                <button type="submit">{entryFormButton}</button>
                {editingEntry ? (
                  <a href="/ledger" className="nav-link ghost">Cancel edit</a>
                ) : null}
              </div>
            </form>
          </article>

          <article className="panel">
            <h2 style={{ marginTop: 0 }}>Add category</h2>
            <form action={createCategoryAction} className="grid">
              <label>
                Category name
                <input type="text" name="name" required placeholder="Utilities" />
              </label>
              <label>
                Category type
                <select name="category_type" defaultValue="expense">
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="adjustment">Adjustment</option>
                  <option value="opening_balance">Opening balance</option>
                </select>
              </label>
              <div>
                <button type="submit" className="secondary">Create category</button>
              </div>
            </form>
          </article>
        </section>
      ) : null}

      <section className="panel">
        <div className="topbar">
          <div>
            <p className="eyebrow">Timeline</p>
            <h2 className="section-title">Ledger entries</h2>
            <p className="muted" style={{ margin: 0 }}>
              Running balance is the sum of balance effects over time. Expenses are negative movements.
            </p>
          </div>
        </div>

        <div className="table-wrap table-glow">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Balance effect</th>
                <th>Running balance</th>
                <th>Visibility</th>
                {canEdit ? <th>Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 9 : 8}>No entries match the current filters.</td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.entry_date}</td>
                    <td>{entry.entry_type.replace("_", " ")}</td>
                    <td>{entry.category_name ?? "Uncategorised"}</td>
                    <td>
                      <strong>{entry.description}</strong>
                      {entry.notes ? <div className="muted">{entry.notes}</div> : null}
                    </td>
                    <td>{formatCurrency(entry.amount)}</td>
                    <td>{formatCurrency(entry.balance_effect)}</td>
                    <td>{formatCurrency(entry.running_balance)}</td>
                    <td>
                      <span className={`pill ${entry.is_visible_to_stakeholders ? "" : "hidden"}`}>
                        {entry.is_visible_to_stakeholders ? "Visible" : "Owner only"}
                      </span>
                    </td>
                    {canEdit ? (
                      <td>
                        <div className="nav-links">
                          <a href={`/ledger?edit_id=${entry.id}`} className="nav-link ghost">Edit</a>
                          <form action={archiveLedgerEntryAction}>
                            <input type="hidden" name="entry_id" value={entry.id} />
                            <button type="submit" className="ghost">Archive</button>
                          </form>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
