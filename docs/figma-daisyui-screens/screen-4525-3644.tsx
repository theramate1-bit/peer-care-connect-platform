/**
 * Figma daisyUI reference – Node 4525:3644
 * https://www.figma.com/design/dg4TsiL1rnz8gjuI6bj1fh/daisyUI-component-library--Community-?node-id=4525-3644
 *
 * React + TypeScript + Tailwind + daisyUI. Adapt to your project.
 */

export function Screen45253644() {
  return (
    <div className="p-6 space-y-6">
      {/* Table */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Table</h2>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Alice</td>
                <td>Admin</td>
                <td><span className="badge badge-success">Active</span></td>
              </tr>
              <tr>
                <td>Bob</td>
                <td>User</td>
                <td><span className="badge badge-ghost">Pending</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Stats */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Stats</h2>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Total Page Views</div>
            <div className="stat-value">89,400</div>
            <div className="stat-desc">21% more than last month</div>
          </div>
          <div className="stat">
            <div className="stat-title">Total Users</div>
            <div className="stat-value">2,350</div>
            <div className="stat-desc">14% more than last month</div>
          </div>
        </div>
      </section>
    </div>
  );
}
