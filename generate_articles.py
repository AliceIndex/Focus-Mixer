#!/usr/bin/env python3
"""
Markdown SSG for Focus Mixer blog/news articles.

Scans `blog/contents/*.md` and `news/contents/*.md`, parses YAML front matter
(title, pubDate, draft), converts the body to HTML, and renders each article
as a standalone `[UID].html` file using the section's `article_template.html`.

Draft articles (front matter `draft: true`) are skipped entirely.

Also generates `blog/list.json` and `news/list.json` with metadata for the
index page and external integrations.
"""

import json
import re
import sys
from datetime import datetime
from pathlib import Path

try:
    import markdown as md_lib
except ImportError:
    print("ERROR: 'markdown' package not installed. Run: pip install markdown",
          file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent
SECTIONS = ['blog', 'news']


def parse_front_matter(text):
    """Parse a minimal YAML front matter delimited by '---' lines.

    Returns (meta_dict, body_text). Only flat key: value pairs are supported;
    that matches the schema used by the existing posting tool.
    """
    if not text.startswith('---'):
        return {}, text
    end = text.find('\n---', 3)
    if end == -1:
        return {}, text
    fm_text = text[3:end].strip()
    body = text[end + 4:].lstrip('\n')

    meta = {}
    for line in fm_text.split('\n'):
        if ':' not in line:
            continue
        key, _, value = line.partition(':')
        value = value.strip()
        if (value.startswith('"') and value.endswith('"')) or \
           (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        lowered = value.lower()
        if lowered == 'true':
            value = True
        elif lowered == 'false':
            value = False
        meta[key.strip()] = value
    return meta, body


_TEMPLATE_RE = re.compile(r'\{\{\s*(\w+)\s*\}\}')


def render_template(template, variables):
    """Substitute {{ key }} placeholders. Missing keys render as empty."""
    return _TEMPLATE_RE.sub(
        lambda m: str(variables.get(m.group(1).strip(), '')),
        template
    )


def format_date(iso_date):
    """Format ISO-8601 timestamps as YYYY-MM-DD; pass through on failure."""
    if not iso_date:
        return ''
    try:
        dt = datetime.fromisoformat(iso_date.replace('Z', '+00:00'))
        return dt.strftime('%Y-%m-%d')
    except (ValueError, AttributeError):
        return iso_date


def escape_html(s):
    return (str(s).replace('&', '&amp;')
                  .replace('<', '&lt;')
                  .replace('>', '&gt;')
                  .replace('"', '&quot;'))


def process_section(section_dir):
    """Generate per-article HTML and list.json for one section.

    Returns the list of published-article metadata dicts.
    """
    contents_dir = section_dir / 'contents'
    template_path = section_dir / 'article_template.html'
    list_path = section_dir / 'list.json'
    section_name = section_dir.name

    if not contents_dir.exists():
        print(f"  skip: no contents/ in {section_dir}")
        return []
    if not template_path.exists():
        print(f"  skip: no article_template.html in {section_dir}")
        return []

    template = template_path.read_text(encoding='utf-8')

    articles = []
    for md_path in sorted(contents_dir.glob('*.md')):
        uid = md_path.stem
        raw = md_path.read_text(encoding='utf-8')
        meta, body = parse_front_matter(raw)

        if meta.get('draft') is True:
            print(f"  skip draft: {md_path.name}")
            continue

        title = meta.get('title', 'Untitled')
        pub_date = meta.get('pubDate', '')
        date_str = format_date(pub_date)

        body_html = md_lib.markdown(
            body, extensions=['extra', 'sane_lists', 'fenced_code']
        )

        html = render_template(template, {
            'title': escape_html(title),
            'date': escape_html(date_str),
            'pubDate': escape_html(pub_date),
            'uid': escape_html(uid),
            'content': body_html,
            'section': section_name,
        })

        output_path = section_dir / f'{uid}.html'
        output_path.write_text(html, encoding='utf-8')
        print(f"  generated: {output_path.relative_to(ROOT)}")

        articles.append({
            'uid': uid,
            'title': title,
            'pubDate': pub_date,
            'date': date_str,
            'url': f'/{section_name}/{uid}.html',
        })

    articles.sort(key=lambda a: a.get('pubDate', ''), reverse=True)

    list_path.write_text(
        json.dumps(articles, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8'
    )
    print(f"  wrote: {list_path.relative_to(ROOT)} ({len(articles)} articles)")
    return articles


def main():
    for section in SECTIONS:
        section_dir = ROOT / section
        if not section_dir.exists():
            continue
        print(f"Processing {section}/")
        process_section(section_dir)


if __name__ == '__main__':
    main()
