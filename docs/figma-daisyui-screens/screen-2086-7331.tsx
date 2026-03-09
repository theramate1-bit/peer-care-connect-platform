/**
 * Figma daisyUI reference – Node 2086:7331
 * https://www.figma.com/design/dg4TsiL1rnz8gjuI6bj1fh/daisyUI-component-library--Community-?node-id=2086-7331
 *
 * React + TypeScript + Tailwind + daisyUI. Adapt to your project.
 */

export function Screen20867331() {
  return (
    <div className="p-6 space-y-6">
      {/* Modal – use dialog + modal classes or open state */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Modal</h2>
        <dialog id="modal-2086-7331" className="modal">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Modal title</h3>
            <p className="py-4">Modal content. Use modal, modal-box, modal-action. Close with form method=&quot;dialog&quot; or JS.</p>
            <div className="modal-action">
              <form method="dialog">
                <button type="submit" className="btn">Close</button>
              </form>
              <button type="button" className="btn btn-primary">Confirm</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button type="submit">close</button>
          </form>
        </dialog>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => (document.getElementById('modal-2086-7331') as HTMLDialogElement)?.showModal()}
        >
          Open modal
        </button>
      </section>
    </div>
  );
}
