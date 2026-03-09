/**
 * Figma daisyUI reference – Node 2004:7184
 * https://www.figma.com/design/dg4TsiL1rnz8gjuI6bj1fh/daisyUI-component-library--Community-?node-id=2004-7184
 *
 * React + TypeScript + Tailwind + daisyUI. Adapt to your project.
 */

export function Screen20047184() {
  return (
    <div className="p-6 space-y-6">
      {/* Buttons – daisyUI btn variants */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Buttons</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary">Primary</button>
          <button type="button" className="btn btn-secondary">Secondary</button>
          <button type="button" className="btn btn-accent">Accent</button>
          <button type="button" className="btn btn-ghost">Ghost</button>
          <button type="button" className="btn btn-link">Link</button>
        </div>
      </section>

      {/* Card */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Card</h2>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">Card title</h3>
            <p>Card description. Use card, card-body, card-title, card-actions.</p>
            <div className="card-actions justify-end">
              <button type="button" className="btn btn-primary">Action</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
