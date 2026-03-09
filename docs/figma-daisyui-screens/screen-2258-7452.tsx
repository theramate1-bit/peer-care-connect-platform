/**
 * Figma daisyUI reference – Node 2258:7452
 * https://www.figma.com/design/dg4TsiL1rnz8gjuI6bj1fh/daisyUI-component-library--Community-?node-id=2258-7452
 *
 * React + TypeScript + Tailwind + daisyUI. Adapt to your project.
 */

export function Screen22587452() {
  return (
    <div className="p-6 space-y-6">
      {/* Navbar */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Navbar</h2>
        <div className="navbar bg-base-100 shadow-lg rounded-box">
          <div className="flex-1">
            <a href="/" className="btn btn-ghost text-xl">daisyUI</a>
          </div>
          <div className="flex-none">
            <ul className="menu menu-horizontal px-1">
              <li><a>Link</a></li>
              <li><a>Link</a></li>
              <li>
                <details>
                  <summary>Dropdown</summary>
                  <ul className="p-2 bg-base-100 rounded-t-none">
                    <li><a>Submenu 1</a></li>
                    <li><a>Submenu 2</a></li>
                  </ul>
                </details>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Breadcrumbs */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Breadcrumbs</h2>
        <div className="breadcrumbs text-sm">
          <ul>
            <li><a>Home</a></li>
            <li><a>Documents</a></li>
            <li>Add Document</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
