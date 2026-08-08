import { createCategoryAction, toggleCategoryStatusAction, updateCategoryAction } from "@/app/actions";
import { requireOwner } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { getAllCategories, getProperty } from "@/lib/queries";

function bannerFromSearch(search: Record<string, string | string[] | undefined>): { kind: "error" | "success"; message: string } | null {
  if (search.error) {
    const errorValue = Array.isArray(search.error) ? search.error[0] : search.error;
    const messages: Record<string, string> = {
      "category-invalid": "Please provide a valid category name and details."
    };

    return {
      kind: "error",
      message: messages[errorValue] ?? "Something went wrong."
    };
  }

  if (search.success) {
    const successValue = Array.isArray(search.success) ? search.success[0] : search.success;
    const messages: Record<string, string> = {
      "category-created": "Category created.",
      "category-updated": "Category updated.",
      "category-disabled": "Category disabled.",
      "category-restored": "Category restored."
    };

    return {
      kind: "success",
      message: messages[successValue] ?? "Saved."
    };
  }

  return null;
}

export default async function CategoriesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOwner();
  const property = await getProperty();
  const search = await searchParams;

  if (!property) {
    return null;
  }

  const categories = await getAllCategories(property.id);
  const banner = bannerFromSearch(search);

  return (
    <main className="grid" style={{ marginTop: 18 }}>
      <section className="hero">
        <p className="eyebrow">Owner controls</p>
        <h2 className="section-title">Manage categories</h2>
        <p className="muted" style={{ margin: 0 }}>
          Keep the reporting clean by maintaining category names, order, and availability in one place.
        </p>
      </section>

      {banner ? <div className={`banner ${banner.kind}`}>{banner.message}</div> : null}

      <section className="grid cards">
        <article className="panel">
          <p className="eyebrow">Create</p>
          <h2 className="section-title">Create category</h2>
          <form action={createCategoryAction} className="grid">
            <div className="form-grid">
              <label>
                Name
                <input type="text" name="name" required placeholder="Insurance" />
              </label>
              <label>
                Type
                <select name="category_type" defaultValue="expense">
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="adjustment">Adjustment</option>
                  <option value="opening_balance">Opening balance</option>
                </select>
              </label>
            </div>

            <div>
              <button type="submit">Create category</button>
            </div>
          </form>
        </article>

        <article className="panel">
          <p className="eyebrow">Guidance</p>
          <h2 className="section-title">Category notes</h2>
          <ul className="muted" style={{ margin: 0, paddingLeft: 20 }}>
            <li>Inactive categories no longer appear in the new-entry dropdown.</li>
            <li>Existing ledger rows keep their original category when a category is disabled.</li>
            <li>Use sort order to control the order Murray sees in forms and reports.</li>
          </ul>
        </article>
      </section>

      <section className="panel">
        <p className="eyebrow">Current setup</p>
        <h2 className="section-title">Existing categories</h2>
        <div className="table-wrap table-glow">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Order</th>
                <th>Entries</th>
                <th>Total amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td data-label="Name">
                    <form action={updateCategoryAction} className="inline-edit-form">
                      <input type="hidden" name="category_id" value={category.id} />
                      <input type="text" name="name" defaultValue={category.name} required />
                      <select name="category_type" defaultValue={category.category_type}>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                        <option value="adjustment">Adjustment</option>
                        <option value="opening_balance">Opening balance</option>
                      </select>
                      <input type="number" name="sort_order" defaultValue={category.sort_order} />
                      <button type="submit" className="ghost">Save</button>
                    </form>
                  </td>
                  <td data-label="Type">{category.category_type.replace("_", " ")}</td>
                  <td data-label="Order">{category.sort_order}</td>
                  <td data-label="Entries">{category.entry_count}</td>
                  <td data-label="Total amount">{formatCurrency(category.total_amount)}</td>
                  <td data-label="Status">
                    <span className={`pill ${category.is_active ? "" : "hidden"}`}>
                      {category.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <form action={toggleCategoryStatusAction}>
                      <input type="hidden" name="category_id" value={category.id} />
                      <input type="hidden" name="next_active" value={category.is_active ? "false" : "true"} />
                      <button type="submit" className="ghost">
                        {category.is_active ? "Disable" : "Restore"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
