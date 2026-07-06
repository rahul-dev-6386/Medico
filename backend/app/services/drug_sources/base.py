from typing import Any
from abc import ABC, abstractmethod


class DrugSourceResult(dict):
    """Typed dict for a drug record from any source. All fields optional."""
    pass


class AbstractDrugSource(ABC):
    """Base class for drug data source adapters."""

    @property
    @abstractmethod
    def source_name(self) -> str:
        """Human-readable name (e.g. 'dailymed', 'openfda')."""
        ...

    @abstractmethod
    def search_by_name(self, name: str) -> dict[str, Any] | None:
        """Search by generic or brand name. Returns DrugEntry-like dict or None."""
        ...

    def search_by_rxcui(self, rxcui: str) -> dict[str, Any] | None:
        """Search by RxNorm ID. Returns DrugEntry-like dict or None."""
        return None

    @staticmethod
    def merge(base: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
        """Merge incoming into base, filling only missing fields."""
        for key, value in incoming.items():
            if key not in ("id", "embedding_id", "ingested_at", "data_sources"):
                if base.get(key) is None and value is not None:
                    base[key] = value
        return base
