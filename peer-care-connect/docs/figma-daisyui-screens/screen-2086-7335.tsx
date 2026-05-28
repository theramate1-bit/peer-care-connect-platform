/**
 * Figma daisyUI reference – Node 2086:7335
 * https://www.figma.com/design/dg4TsiL1rnz8gjuI6bj1fh/daisyUI-component-library--Community-?node-id=2086-7335
 *
 * React + TypeScript + Tailwind + daisyUI. Adapt to your project.
 */

export function Screen20867335() {
  return (
    <div className="p-6 space-y-6">
      {/* Dropdown / Menu */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Dropdown</h2>
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-primary m-1">
            Dropdown
          </div>
          <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
            <li><a>Item 1</a></li>
            <li><a>Item 2</a></li>
            <li><a>Item 3</a></li>
          </ul>
        </div>
      </section>

      {/* Kbd */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Kbd</h2>
        <div className="flex gap-2">
          <kbd className="kbd kbd-sm">ctrl</kbd>
          <kbd className="kbd kbd-sm">K</kbd>
        </div>
      </section>
    </div>
  );
}
