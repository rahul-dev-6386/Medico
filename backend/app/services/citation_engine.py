from typing import Optional


class Citation:
    def __init__(self, source: str, title: str, url: Optional[str] = None, snippet: Optional[str] = None):
        self.source = source
        self.title = title
        self.url = url
        self.snippet = snippet

    def format_markdown(self) -> str:
        if self.url:
            return f"- [{self.title}]({self.url}) — *{self.source}*"
        return f"- {self.title} — *{self.source}*"

    def to_dict(self) -> dict:
        return {
            "source": self.source,
            "title": self.title,
            "url": self.url,
            "snippet": self.snippet,
        }


class CitationEngine:
    SOURCE_ABBREVIATIONS = {
        "world_health_organization": "WHO",
        "centers_for_disease_control": "CDC",
        "national_institutes_of_health": "NIH",
        "american_diabetes_association": "ADA",
        "american_heart_association": "AHA",
        "kidney_disease_improving_global_outcomes": "KDIGO",
        "pubmed": "PubMed",
        "openfda": "OpenFDA",
        "mayo_clinic": "Mayo Clinic",
        "webmd": "WebMD",
    }

    def __init__(self):
        self.citations: list[Citation] = []

    def add(self, source: str, title: str, url: Optional[str] = None, snippet: Optional[str] = None):
        citation = Citation(source=source, title=title, url=url, snippet=snippet)
        if not any(c.title == title and c.source == source for c in self.citations):
            self.citations.append(citation)
        return citation

    def add_guideline(self, specialty: str, title: str, url: Optional[str] = None):
        org = self.SOURCE_ABBREVIATIONS.get(specialty, specialty.replace("_", " ").title())
        return self.add(source=org, title=title, url=url)

    def add_pubmed(self, title: str, pmid: str, journal: Optional[str] = None):
        url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
        return self.add(source="PubMed", title=title, url=url)

    def add_drug(self, generic_name: str, brand_name: Optional[str] = None):
        display = brand_name if brand_name else generic_name
        return self.add(
            source="OpenFDA",
            title=f"{display} — Drug Information",
            url=f"https://open.fda.gov/drug/{generic_name}/",
        )

    def add_report_finding(self, test_name: str, flag: Optional[str] = None):
        flag_text = f" ({flag})" if flag else ""
        return self.add(
            source="Lab Report",
            title=f"{test_name}{flag_text}",
        )

    def format_all(self) -> str:
        if not self.citations:
            return ""
        lines = ["\n\n**Sources:**"]
        seen = set()
        for c in self.citations:
            key = (c.source, c.title)
            if key not in seen:
                seen.add(key)
                lines.append(c.format_markdown())
        return "\n".join(lines)

    def to_dict_list(self) -> list[dict]:
        return [c.to_dict() for c in self.citations]

    def reset(self):
        self.citations.clear()
