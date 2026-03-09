/**
 * Figma daisyUI reference – Node 2086:7337
 * https://www.figma.com/design/dg4TsiL1rnz8gjuI6bj1fh/daisyUI-component-library--Community-?node-id=2086-7337
 *
 * React + TypeScript + Tailwind + daisyUI. Adapt to your project.
 */

export function Screen20867337() {
  return (
    <div className="p-6 space-y-6">
      {/* Avatar */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Avatar</h2>
        <div className="flex gap-4">
          <div className="avatar">
            <div className="w-12 rounded-full">
              <img src="https://daisyui.com/images/stock/photo-1534528741775-53994a69daeb.jpg" alt="Avatar" />
            </div>
          </div>
          <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content w-12 rounded-full">
              <span>AB</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tooltip */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Tooltip</h2>
        <div className="tooltip" data-tip="Tooltip text">
          <button type="button" className="btn">Hover me</button>
        </div>
      </section>
    </div>
  );
}
