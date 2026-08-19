import datetime
import pathlib


DOMAIN = "https://focusmixer.com"
SITEMAP_NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9"

STATIC_PAGES = [
    ("index.html", "/", "1.0", "weekly"),
    ("jp/index.html", "/jp/", "1.0", "weekly"),
    ("about/index.html", "/about/", "0.8", "monthly"),
    ("privacy-policy/index.html", "/privacy-policy/", "0.5", "yearly"),
    ("jp/privacy-policy/index.html", "/jp/privacy-policy/", "0.5", "yearly"),
]


def find_pages(home):
    pages = []
    for file_name, url, priority, changefreq in STATIC_PAGES:
        if (home / file_name).is_file():
            pages.append((url, priority, changefreq))

    blog_dir = home / "blog"
    if blog_dir.is_dir():
        for file_path in sorted(blog_dir.glob("*.html")):
            if file_path.name in {"index.html", "article_template.html"}:
                continue
            pages.append((f"/blog/{file_path.name}", "0.7", "weekly"))

    return pages


def generate_sitemap(home):
    today = datetime.date.today().isoformat()
    pages = find_pages(home)
    entries = []
    for url, priority, changefreq in pages:
        entries.append(
            "  <url>\n"
            f"    <loc>{DOMAIN}{url}</loc>\n"
            f"    <lastmod>{today}</lastmod>\n"
            f"    <changefreq>{changefreq}</changefreq>\n"
            f"    <priority>{priority}</priority>\n"
            "  </url>"
        )

    sitemap_content = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<urlset xmlns="{SITEMAP_NAMESPACE}">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )
    sitemap_path = home / "sitemap.xml"
    sitemap_path.write_text(sitemap_content, encoding="utf-8")
    return sitemap_path, len(pages)


if __name__ == "__main__":
    sitemap_path, page_count = generate_sitemap(pathlib.Path(__file__).resolve().parent)
    print(f"Generated {page_count} URLs in {sitemap_path}")