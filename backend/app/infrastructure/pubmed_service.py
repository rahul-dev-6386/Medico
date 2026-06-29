import json
import os
from typing import Optional

import httpx
from sqlalchemy.orm import Session
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.models.pubmed_article import PubMedArticle
from app.infrastructure.embedding_service import embedding_service
from app.infrastructure.vector_store import vector_store


PUBMED_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
PUBMED_SEARCH_LIMIT = 50


class PubMedService:
    def __init__(self, db: Session):
        self.db = db
        self.client = httpx.Client(timeout=30.0)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def search_and_fetch(self, query: str, max_results: int = 20) -> list[dict]:
        search_url = f"{PUBMED_BASE}/esearch.fcgi"
        params = {
            "db": "pubmed",
            "term": query,
            "retmax": min(max_results, PUBMED_SEARCH_LIMIT),
            "retmode": "json",
            "sort": "relevance",
        }
        resp = self.client.get(search_url, params=params)
        resp.raise_for_status()
        search_data = resp.json()

        id_list = search_data.get("esearchresult", {}).get("idlist", [])
        if not id_list:
            return []

        ids = ",".join(id_list)
        fetch_url = f"{PUBMED_BASE}/efetch.fcgi"
        fetch_params = {
            "db": "pubmed",
            "id": ids,
            "retmode": "xml",
            "rettype": "abstract",
        }
        fetch_resp = self.client.get(fetch_url, params=fetch_params)
        fetch_resp.raise_for_status()

        articles = self._parse_pubmed_xml(fetch_resp.text)
        return articles

    def _parse_pubmed_xml(self, xml_text: str) -> list[dict]:
        articles = []
        try:
            import xml.etree.ElementTree as ET
            root = ET.fromstring(xml_text)
            for article_elem in root.findall(".//PubmedArticle"):
                article_data = self._parse_single_article(article_elem)
                if article_data:
                    articles.append(article_data)
        except Exception:
            pass
        return articles

    def _parse_single_article(self, elem) -> Optional[dict]:
        try:
            medline = elem.find(".//MedlineCitation")
            if medline is None:
                return None

            pmid_elem = medline.find("./PMID")
            pmid = pmid_elem.text if pmid_elem is not None else ""

            article = medline.find("./Article")
            if article is None:
                return None

            title_elem = article.find("./ArticleTitle")
            title = "".join(title_elem.itertext()) if title_elem is not None else ""

            abstract_elem = article.find("./Abstract/AbstractText")
            abstract = "".join(abstract_elem.itertext()) if abstract_elem is not None else ""

            journal_elem = article.find("./Journal/Title")
            journal = journal_elem.text if journal_elem is not None else ""

            authors = []
            for author_elem in article.findall("./AuthorList/Author"):
                last = author_elem.find("./LastName")
                fore = author_elem.find("./ForeName")
                if last is not None and fore is not None:
                    authors.append(f"{fore.text} {last.text}")

            keywords = []
            for kw in medline.findall(".//Keyword"):
                if kw.text:
                    keywords.append(kw.text)

            mesh_terms = []
            for mesh in medline.findall(".//MeshHeading/DescriptorName"):
                if mesh.text:
                    mesh_terms.append(mesh.text)

            return {
                "pubmed_id": pmid,
                "title": title,
                "abstract": abstract,
                "authors": authors,
                "journal": journal,
                "keywords": keywords,
                "mesh_terms": mesh_terms,
            }
        except Exception:
            return None

    def store_articles(self, articles: list[dict]):
        for article in articles:
            pmid = article["pubmed_id"]
            existing = (
                self.db.query(PubMedArticle)
                .filter(PubMedArticle.pubmed_id == pmid)
                .first()
            )
            if existing:
                continue

            full_text = f"{article['title']}\n\n{article['abstract']}"
            chunks = self._chunk_text(full_text)
            for i, chunk in enumerate(chunks):
                embedding_data = embedding_service.embed_document(chunk)
                embedding_id = f"pubmed_{pmid}_{i}"

                entry = PubMedArticle(
                    pubmed_id=pmid,
                    title=article["title"],
                    authors=article.get("authors", []),
                    abstract=article.get("abstract", ""),
                    journal=article.get("journal", ""),
                    keywords=article.get("keywords", []),
                    mesh_terms=article.get("mesh_terms", []),
                    chunk_index=i,
                    content_chunk=chunk,
                    embedding_id=embedding_id,
                )
                self.db.add(entry)
                self.db.flush()

                vector_store.upsert(
                    embedding_id=embedding_id,
                    embedding=embedding_data["embedding"],
                    payload={
                        "type": "pubmed",
                        "pmid": pmid,
                        "title": article["title"],
                        "journal": article.get("journal", ""),
                        "chunk_index": i,
                    },
                )
        self.db.commit()

    def search_local(self, query: str, top_k: int = 5) -> list[dict]:
        query_emb = embedding_service.embed(query)
        results = vector_store.search(query_emb, top_k=top_k)
        enriched = []
        for r in results:
            if r["payload"].get("type") == "pubmed":
                entry = (
                    self.db.query(PubMedArticle)
                    .filter(PubMedArticle.embedding_id == r["id"])
                    .first()
                )
                if entry:
                    enriched.append({
                        "content": entry.content_chunk,
                        "title": entry.title,
                        "pmid": entry.pubmed_id,
                        "journal": entry.journal,
                        "authors": entry.authors,
                        "score": r["score"],
                    })
        return enriched

    def count(self) -> int:
        return self.db.query(PubMedArticle).count()

    def _chunk_text(self, text: str) -> list[str]:
        from app.core.config import settings
        words = text.split()
        chunks = []
        chunk_size = settings.CHUNK_SIZE
        overlap = settings.CHUNK_OVERLAP
        i = 0
        while i < len(words):
            chunk = " ".join(words[i:i + chunk_size])
            if chunk:
                chunks.append(chunk)
            i += chunk_size - overlap
        return chunks if chunks else [text]
