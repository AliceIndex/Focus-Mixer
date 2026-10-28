import datetime
import pathlib
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from urllib.parse import urlsplit


DOMAIN = "https://focusmixer.com"
SITEMAP_NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9"
XHTML_NAMESPACE = "http://www.w3.org/1999/xhtml"

ET.register_namespace("", SITEMAP_NAMESPACE)
ET.register_namespace("xhtml", XHTML_NAMESPACE)


class PageMetadataParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.canonical = None
        self.alternates = {}

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "link":
            return
        attributes = dict(attrs)
        relations = (attributes.get("rel") or "").lower().split()
        href = attributes.get("href")
        if not href:
            return
        if "canonical" in relations:
            self.canonical = href
        elif "alternate" in relations and attributes.get("hreflang"):
            self.alternates[attributes["hreflang"]] = href


def find_pages(home):
    pages = []
    site_origin = urlsplit(DOMAIN)
    for file_path in sorted(home.rglob("*.html")):
        if file_path.name == "article_template.html":
            continue
        parser = PageMetadataParser()
        parser.feed(file_path.read_text(encoding="utf-8"))
        if not parser.canonical:
            continue

        canonical = urlsplit(parser.canonical)
        if (
            canonical.scheme != site_origin.scheme
            or canonical.netloc != site_origin.netloc
            or canonical.query
            or canonical.fragment
        ):
            continue

        path = canonical.path
        if path in {"/", "/jp/"}:
            priority, changefreq = "1.0", "weekly"
        elif path.rstrip("/") in {"/privacy-policy", "/jp/privacy-policy"}:
            priority, changefreq = "0.5", "yearly"
        elif path in {"/blog/", "/news/"}:
            priority, changefreq = "0.6", "weekly"
        elif path.startswith(("/blog/", "/news/")):
            priority, changefreq = "0.7", "weekly"
        else:
            priority, changefreq = "0.5", "monthly"
        pages.append((parser.canonical, priority, changefreq, parser.alternates))

    return pages


def generate_sitemap(home):
    today = datetime.date.today().isoformat()
    pages = find_pages(home)
    urlset = ET.Element(f"{{{SITEMAP_NAMESPACE}}}urlset")
    for canonical, priority, changefreq, alternates in pages:
        url_element = ET.SubElement(urlset, f"{{{SITEMAP_NAMESPACE}}}url")
        ET.SubElement(url_element, f"{{{SITEMAP_NAMESPACE}}}loc").text = canonical
        for language, href in sorted(alternates.items()):
            ET.SubElement(
                url_element,
                f"{{{XHTML_NAMESPACE}}}link",
                {"rel": "alternate", "hreflang": language, "href": href},
            )
        ET.SubElement(url_element, f"{{{SITEMAP_NAMESPACE}}}lastmod").text = today
        ET.SubElement(url_element, f"{{{SITEMAP_NAMESPACE}}}changefreq").text = changefreq
        ET.SubElement(url_element, f"{{{SITEMAP_NAMESPACE}}}priority").text = priority

    ET.indent(urlset, space="  ")
    sitemap_content = ET.tostring(urlset, encoding="unicode", xml_declaration=True) + "\n"
    sitemap_path = home / "sitemap.xml"
    sitemap_path.write_text(sitemap_content, encoding="utf-8")
    return sitemap_path, len(pages)


if __name__ == "__main__":
    sitemap_path, page_count = generate_sitemap(pathlib.Path(__file__).resolve().parent)
    print(f"Generated {page_count} URLs in {sitemap_path}")