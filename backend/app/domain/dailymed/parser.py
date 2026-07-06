"""
SPL XML parser using lxml.

DailyMed SPL XML follows the HL7 Structured Product Labeling schema.
We traverse the XML tree properly - no regex.

Key XML structure:
<document>
  <component>
    <structuredBody>
      <component>
        <section>
          <id code="..." />
          <code code="..." />
          <title>...</title>
          <text>...</text>
          <component>
            <section>...</section>
          </component>
        </section>
      </component>
    </structuredBody>
  </component>
</document>

The <text> element contains XHTML-formatted body content.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Optional
from xml.parsers.expat import ExpatError

from lxml import etree

logger = logging.getLogger("dailymed.parser")

NAMESPACES = {
    "hl7": "urn:hl7-org:v3",
    "xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "spl": "urn:hl7-org:spl",
}

XHTML_NS = "urn:hl7-org:v3"


def parse_spl_xml(xml_bytes: bytes) -> Optional[dict[str, Any]]:
    try:
        tree = etree.fromstring(xml_bytes)
    except (etree.XMLSyntaxError, ExpatError, ValueError) as e:
        logger.error(f"XML parse error: {e}")
        return None

    result: dict[str, Any] = {
        "set_id": _extract_set_id(tree),
        "title": _extract_title(tree),
        "effective_time": _extract_effective_time(tree),
        "version_number": _extract_version_number(tree),
        "sections": {},
    }

    # Extract manufacturer / author
    author = _find(tree, ".//hl7:author/hl7:assignedEntity/hl7:representedOrganization/hl7:name", NAMESPACES)
    if author is not None:
        result["manufacturer"] = _collect_text(author)

    # Traverse all sections recursively
    body = _find(tree, ".//hl7:structuredBody", NAMESPACES)
    if body is not None:
        _traverse_sections(body, result["sections"], depth=0)

    # Extract active ingredients from the <manufacturedProduct> section
    ingredients = _extract_ingredients(tree)
    if ingredients:
        result["active_ingredients"] = ingredients

    # Extract NDC codes
    ndcs = _extract_ndcs(tree)
    if ndcs:
        result["ndc_codes"] = ndcs

    return result


def _find(element: etree._Element, xpath: str, ns: dict) -> Optional[etree._Element]:
    try:
        return element.find(xpath, ns)
    except (etree.XSLTApplyError, ValueError):
        return None


def _findall(element: etree._Element, xpath: str, ns: dict) -> list[etree._Element]:
    try:
        return element.findall(xpath, ns)
    except (etree.XSLTApplyError, ValueError):
        return []


def _collect_text(element: etree._Element) -> str:
    parts = [element.text or ""]
    for child in element:
        tail = child.tail or ""
        if child.tag.endswith("}br"):
            parts.append("\n")
        elif child.tag.endswith("}content"):
            parts.append(child.text or "")
        else:
            parts.append(_collect_text(child))
        parts.append(tail)
    return "".join(parts).strip()


def _extract_set_id(tree: etree._Element) -> Optional[str]:
    el = _find(tree, ".//hl7:setId/hl7:id", NAMESPACES)
    if el is not None:
        return el.get("extension") or el.get("root")
    el = _find(tree, ".//hl7:id", NAMESPACES)
    if el is not None:
        return el.get("extension") or el.get("root")
    return None


def _extract_title(tree: etree._Element) -> Optional[str]:
    el = _find(tree, ".//hl7:title", NAMESPACES)
    if el is not None and el.text:
        return el.text.strip()
    return None


def _extract_effective_time(tree: etree._Element) -> Optional[str]:
    el = _find(tree, ".//hl7:effectiveTime/hl7:center", NAMESPACES)
    if el is None:
        el = _find(tree, ".//hl7:effectiveTime/hl7:low", NAMESPACES)
    if el is not None:
        return el.get("value")
    return None


def _extract_version_number(tree: etree._Element) -> Optional[str]:
    el = _find(tree, ".//hl7:versionNumber", NAMESPACES)
    if el is not None:
        return el.get("value")
    return None


def _extract_ingredients(tree: etree._Element) -> list[dict[str, str]]:
    ingredients = []
    for product in _findall(tree, ".//hl7:manufacturedProduct", NAMESPACES):
        for ingredient in _findall(product, ".//hl7:ingredient", NAMESPACES):
            name_el = _find(ingredient, ".//hl7:name", NAMESPACES)
            if name_el is not None:
                name = _collect_text(name_el)
                ing_dict: dict[str, str] = {"name": name}
                # Try to get strength
                strength_el = _find(ingredient, ".//hl7:quantity", NAMESPACES)
                if strength_el is not None:
                    value = strength_el.get("value")
                    unit = strength_el.get("unit")
                    if value and unit:
                        ing_dict["strength"] = f"{value} {unit}"
                ingredients.append(ing_dict)
    return ingredients


def _extract_ndcs(tree: etree._Element) -> list[str]:
    ndcs = []
    for code_el in _findall(tree, ".//hl7:manufacturedProduct/hl7:manufacturedMaterial/hl7:code", NAMESPACES):
        ext = code_el.get("extension")
        if ext and re.match(r"\d{4,11}", ext):
            ndcs.append(ext)
        root = code_el.get("root")
        if root and re.match(r"\d{10,11}", root.replace("-", "")):
            ndcs.append(root)
    return ndcs


def _traverse_sections(parent: etree._Element, result: dict, depth: int = 0) -> None:
    for component in _findall(parent, "hl7:component", NAMESPACES):
        section = _find(component, "hl7:section", NAMESPACES)
        if section is None:
            continue

        code_el = _find(section, "hl7:code", NAMESPACES)
        code = code_el.get("code") if code_el is not None else None
        code_system = code_el.get("codeSystem") if code_el is not None else None

        title_el = _find(section, "hl7:title", NAMESPACES)
        title = title_el.text.strip() if title_el is not None and title_el.text else ""

        text_el = _find(section, "hl7:text", NAMESPACES)
        text = _extract_xhtml_text(text_el) if text_el is not None else ""

        section_key = code or title or f"section_{depth}"

        entry = {
            "code": code,
            "code_system": code_system,
            "title": title,
            "text": text,
            "subsections": {},
        }
        if section_key in result:
            base = section_key
            i = 2
            while section_key in result:
                section_key = f"{base}_{i}"
                i += 1

        result[section_key] = entry

        nested = _findall(section, "hl7:component/hl7:section", NAMESPACES)
        if nested:
            _traverse_sections(section, entry["subsections"], depth + 1)


def _extract_xhtml_text(text_el: Optional[etree._Element]) -> str:
    if text_el is None:
        return ""

    parts: list[str] = []

    def _walk(el: etree._Element):
        tag = el.tag
        local = tag.split("}")[-1] if "}" in tag else tag

        if el.text:
            text = el.text.strip()
            if text:
                parts.append(text)

        for child in el:
            child_tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag

            if child_tag in ("br", "BR"):
                parts.append("\n")
            elif child_tag in ("p", "P"):
                _walk(child)
                parts.append("\n\n")
            elif child_tag in ("li", "LI"):
                parts.append("  * ")
                _walk(child)
                parts.append("\n")
            elif child_tag in ("ol", "ul", "OL", "UL"):
                _walk(child)
                parts.append("\n")
            elif child_tag in ("table", "TABLE"):
                _extract_table(child, parts)
                parts.append("\n")
            elif child_tag in ("sub", "sup", "SUP", "SUB", "b", "i", "em", "strong"):
                _walk(child)
            elif child_tag in ("content", "Content"):
                _walk(child)
            else:
                _walk(child)

            if child.tail:
                tail = child.tail.strip()
                if tail:
                    parts.append(tail)

    _walk(text_el)
    return _clean_xhtml_text("".join(parts))


def _extract_table(table_el: etree._Element, parts: list[str]) -> None:
    parts.append("\n")
    for row in table_el.iterchildren():
        local = row.tag.split("}")[-1] if "}" in row.tag else row.tag
        if local.lower() not in ("tr", "row"):
            continue
        cells = []
        for cell in row.iterchildren():
            clocal = cell.tag.split("}")[-1] if "}" in cell.tag else cell.tag
            if clocal.lower() in ("td", "th", "cell"):
                cell_text = _collect_text(cell)
                cells.append(cell_text)
        if cells:
            parts.append(" | ".join(cells))
            parts.append("\n")


def _clean_xhtml_text(text: str) -> str:
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"^\n+", "", text)
    text = re.sub(r"\n+$", "", text)
    return text.strip()
