/**
 * Figma daisyUI reference – Node 2086:7333
 * https://www.figma.com/design/dg4TsiL1rnz8gjuI6bj1fh/daisyUI-component-library--Community-?node-id=2086-7333
 *
 * React + TypeScript + Tailwind + daisyUI. Adapt to your project.
 */

export function Screen20867333() {
  return (
    <div className="p-6 space-y-6">
      {/* Tabs */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Tabs</h2>
        <div role="tablist" className="tabs tabs-boxed">
          <a role="tab" className="tab tab-active">Tab 1</a>
          <a role="tab" className="tab">Tab 2</a>
          <a role="tab" className="tab">Tab 3</a>
        </div>
        <div className="pt-2">
          <p>Tab content. Use tabs, tab, tab-active; or tabs tabs-lifted with tab-content.</p>
        </div>
      </section>

      {/* Progress */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Progress</h2>
        <progress className="progress progress-primary w-56" value={70} max={100} />
      </section>
    </div>
  );
}
