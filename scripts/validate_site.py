"""Validate local links and basic structure for the static portfolio."""

from html.parser import HTMLParser
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
HTML_FILES = sorted(ROOT.glob("*.html"))


class ReferenceParser(HTMLParser):
    """Collect local href/src references from an HTML document."""

    def __init__(self) -> None:
        super().__init__()
        self.references: list[str] = []

    def _collect(self, attrs: list[tuple[str, str | None]]) -> None:
        for name, value in attrs:
            if name in {"href", "src"} and value:
                self.references.append(value)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._collect(attrs)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._collect(attrs)


def local_path(reference: str) -> Path | None:
    parsed = urlsplit(reference)
    if parsed.scheme or parsed.netloc or not parsed.path:
        return None
    relative = parsed.path.lstrip("/")
    return (ROOT / Path(unquote(relative.replace("/", "\\")))).resolve()


def validate_html(path: Path, errors: list[str]) -> int:
    content = path.read_text(encoding="utf-8")
    if not re.match(r"\s*<!doctype html>", content, re.IGNORECASE):
        errors.append(f"{path.name}: missing HTML5 doctype")
    if not re.search(r"<html\b[^>]*\blang=[\"']", content, re.IGNORECASE):
        errors.append(f"{path.name}: missing html lang attribute")
    if not re.search(r"<title>.*?</title>", content, re.IGNORECASE | re.DOTALL):
        errors.append(f"{path.name}: missing title")
    if not re.search(r"<meta\b[^>]*name=[\"']viewport[\"']", content, re.IGNORECASE):
        errors.append(f"{path.name}: missing viewport meta tag")

    parser = ReferenceParser()
    try:
        parser.feed(content)
    except Exception as exc:  # pragma: no cover - defensive parser reporting
        errors.append(f"{path.name}: HTML parsing failed: {exc}")
        return 0

    checked = 0
    for reference in parser.references:
        if reference.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        target = local_path(reference)
        if target is None:
            continue
        checked += 1
        try:
            target.relative_to(ROOT)
        except ValueError:
            errors.append(f"{path.name}: reference escapes site root: {reference}")
            continue
        if not target.exists():
            errors.append(f"{path.name}: missing local reference: {reference}")
    return checked


def validate_project_catalog(errors: list[str]) -> int:
    catalog_path = ROOT / "data" / "projects.js"
    content = catalog_path.read_text(encoding="utf-8")
    ids = re.findall(r"\bid:\s*['\"]([^'\"]+)['\"]", content)
    if len(ids) != len(set(ids)):
        errors.append("data/projects.js: project ids must be unique")

    download_paths = re.findall(r"\bhref:\s*['\"]([^'\"]+)['\"]", content)
    for download in download_paths:
        target = local_path(download)
        if target is None or not target.exists():
            errors.append(f"data/projects.js: missing download reference: {download}")
    return len(ids) + len(download_paths)


def main() -> int:
    errors: list[str] = []
    if not HTML_FILES:
        errors.append("No HTML files found")

    references = sum(validate_html(path, errors) for path in HTML_FILES)
    catalog_entries = validate_project_catalog(errors)

    all_html = "\n".join(path.read_text(encoding="utf-8") for path in HTML_FILES)
    if "gk_isXlsx" in all_html:
        errors.append("HTML pages still contain the obsolete spreadsheet helper")
    if re.search(r"\[Your [^\]]+\]", all_html):
        errors.append("HTML pages still contain bracketed placeholder copy")

    if errors:
        print("Site validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"Site validation passed: {len(HTML_FILES)} HTML pages, {references} local references, and {catalog_entries} catalog entries checked.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
