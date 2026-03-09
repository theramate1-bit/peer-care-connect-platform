/**
 * Figma daisyUI reference – Node 2086:7329
 * https://www.figma.com/design/dg4TsiL1rnz8gjuI6bj1fh/daisyUI-component-library--Community-?node-id=2086-7329
 *
 * React + TypeScript + Tailwind + daisyUI. Adapt to your project.
 */

export function Screen20867329() {
  return (
    <div className="p-6 space-y-6">
      {/* Alerts */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Alerts</h2>
        <div className="space-y-2">
          <div className="alert alert-info">
            <span>Info alert. Use alert alert-info.</span>
          </div>
          <div className="alert alert-success">
            <span>Success alert.</span>
          </div>
          <div className="alert alert-warning">
            <span>Warning alert.</span>
          </div>
          <div className="alert alert-error">
            <span>Error alert.</span>
          </div>
        </div>
      </section>

      {/* Badge */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <span className="badge">neutral</span>
          <span className="badge badge-primary">primary</span>
          <span className="badge badge-secondary">secondary</span>
          <span className="badge badge-outline">outline</span>
        </div>
      </section>
    </div>
  );
}
