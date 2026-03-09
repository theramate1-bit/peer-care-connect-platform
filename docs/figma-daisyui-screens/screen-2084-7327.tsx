/**
 * Figma daisyUI reference – Node 2084:7327
 * https://www.figma.com/design/dg4TsiL1rnz8gjuI6bj1fh/daisyUI-component-library--Community-?node-id=2084-7327
 *
 * React + TypeScript + Tailwind + daisyUI. Adapt to your project.
 */

export function Screen20847327() {
  return (
    <div className="p-6 space-y-6">
      {/* Form inputs – daisyUI input, select, textarea, checkbox */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Form inputs</h2>
        <div className="space-y-4 max-w-md">
          <label className="form-control w-full">
            <span className="label-text">Label</span>
            <input type="text" placeholder="Placeholder" className="input input-bordered w-full" />
          </label>
          <label className="form-control w-full">
            <span className="label-text">Select</span>
            <select className="select select-bordered w-full">
              <option>Option 1</option>
              <option>Option 2</option>
            </select>
          </label>
          <label className="form-control">
            <span className="label-text">Textarea</span>
            <textarea className="textarea textarea-bordered h-24" placeholder="Bio" />
          </label>
          <label className="label cursor-pointer justify-start gap-2">
            <input type="checkbox" className="checkbox checkbox-primary" />
            <span className="label-text">Checkbox</span>
          </label>
        </div>
      </section>
    </div>
  );
}
