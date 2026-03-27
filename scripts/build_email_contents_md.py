import json
from pathlib import Path


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    dumps_dir = root / ".email-dumps"
    manifest_path = dumps_dir / "manifest.json"
    output_path = dumps_dir / "ALL_EMAIL_CONTENTS.md"

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    lines: list[str] = []
    lines.append("# All Email Contents")
    lines.append("")
    lines.append("Generated from `.email-dumps/manifest.json` and corresponding HTML files.")
    lines.append("")
    lines.append(f"Total emails: **{len(manifest)}**")
    lines.append("")

    for item in manifest:
        n = item.get("n")
        email_type = item.get("type", "")
        subject = item.get("subject", "")
        file_path = Path(item.get("file", ""))

        if not file_path.is_absolute():
            file_path = (root / file_path).resolve()

        html = file_path.read_text(encoding="utf-8", errors="replace")

        lines.append(f"## {n}. {email_type}")
        lines.append("")
        lines.append(f"- **Type:** `{email_type}`")
        lines.append(f"- **Subject:** {subject}")
        lines.append(f"- **Source File:** `{file_path}`")
        lines.append("")
        lines.append("```html")
        lines.append(html)
        lines.append("```")
        lines.append("")

    output_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote: {output_path}")


if __name__ == "__main__":
    main()

