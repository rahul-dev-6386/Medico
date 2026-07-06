"""
DailyMed ingestion CLI.

Usage:
  python -m app.domain.dailymed.cli [options]

Examples:
  # Ingest a few drugs by name
  python -m app.domain.dailymed.cli --drugs metformin,ibuprofen,warfarin

  # Ingest by set_id
  python -m app.domain.dailymed.cli --set-ids <setid1>,<setid2>

  # Ingest from a list of drug names
  python -m app.domain.dailymed.cli --drug-file drugs.txt

  # Full pipeline - crawl and ingest top 100 prescribed drugs
  python -m app.domain.dailymed.cli --all-top-drugs

  # Incremental update (only new/changed SPLs)
  python -m app.domain.dailymed.cli --incremental

  # JSON-only output (no DB, no embeddings)
  python -m app.domain.dailymed.cli --drugs metformin --json-only
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from typing import Optional


def setup_logging(verbose: bool = False):
    level = logging.DEBUG if verbose else logging.INFO
    fmt = "%(asctime)s [%(name)s] %(levelname)s: %(message)s"
    logging.basicConfig(level=level, format=fmt)


def parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="DailyMed drug data ingestion pipeline for Sanjeevni AI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    input_group = parser.add_mutually_exclusive_group()
    input_group.add_argument(
        "--drugs",
        help="Comma-separated list of drug names (generic or brand)",
    )
    input_group.add_argument(
        "--drug-file",
        help="File with one drug name per line",
    )
    input_group.add_argument(
        "--set-ids",
        help="Comma-separated list of DailyMed SPL set IDs",
    )
    input_group.add_argument(
        "--all-top-drugs",
        action="store_true",
        help="Ingest the top prescribed drugs from the built-in list",
    )
    input_group.add_argument(
        "--incremental",
        action="store_true",
        help="Check DailyMed API for new/changed/removed SPLs since last run",
    )

    parser.add_argument(
        "--output-dir",
        default="data/dailymed_json",
        help="Output directory for JSON files (default: data/dailymed_json)",
    )
    parser.add_argument(
        "--xml-dir",
        default="data/dailymed_xml",
        help="Directory to cache SPL XML files (default: data/dailymed_xml)",
    )
    parser.add_argument(
        "--json-only",
        action="store_true",
        help="Only write JSON files, skip database and embedding storage",
    )
    parser.add_argument(
        "--no-db",
        action="store_true",
        help="Skip database storage",
    )
    parser.add_argument(
        "--no-embeddings",
        action="store_true",
        help="Skip embedding generation",
    )
    parser.add_argument(
        "--no-validation",
        action="store_true",
        help="Skip validation warnings",
    )
    parser.add_argument(
        "--max-drugs",
        type=int,
        default=None,
        help="Limit number of drugs to process",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose (DEBUG) logging",
    )
    parser.add_argument(
        "--dag",
        action="store_true",
        help="Build a DAG for each drug instead of flat JSON",
    )

    return parser.parse_args(argv)


TOP_100_DRUGS = [
    "Metformin", "Lisinopril", "Atorvastatin", "Levothyroxine",
    "Amlodipine", "Metoprolol", "Omeprazole", "Losartan",
    "Albuterol", "Gabapentin", "Hydrochlorothiazide", "Simvastatin",
    "Ibuprofen", "Acetaminophen", "Prednisone", "Amoxicillin",
    "Sertraline", "Fluoxetine", "Warfarin", "Furosemide",
    "Pantoprazole", "Rosuvastatin", "Montelukast", "Clopidogrel",
    "Escitalopram", "Duloxetine", "Tamsulosin", "Carvedilol",
    "Tramadol", "Ondansetron", "Methotrexate", "Azithromycin",
    "Spironolactone", "Doxycycline", "Rivaroxaban", "Apixaban",
    "Pregabalin", "Quetiapine", "Olanzapine", "Risperidone",
    "Methylphenidate", "Donepezil", "Levodopa", "Lithium",
    "Diazepam", "Lorazepam", "Clonazepam", "Zolpidem",
    "Haloperidol", "Buprenorphine", "Methadone", "Naloxone",
    "Buprenorphine Naloxone", "Fentanyl", "Hydromorphone", "Morphine",
    "Oxycodone", "Tramadol", "Cyclobenzaprine", "Baclofen",
    "Naproxen", "Celecoxib", "Diclofenac", "Prednisolone",
    "Hydroxychloroquine", "Sulfasalazine", "Azathioprine", "Mycophenolate",
    "Tacrolimus", "Cyclosporine", "Enoxaparin", "Heparin",
    "Clindamycin", "Ciprofloxacin", "Levofloxacin", "Metronidazole",
    "Nitrofurantoin", "Vancomycin", "Linezolid", "Amoxicillin Clavulanate",
    "Clarithromycin", "Fluconazole", "Terbinafine", "Acyclovir",
    "Valacyclovir", "Oseltamivir", "Remdesivir", "Dexamethasone",
    "Prednisone", "Budesonide", "Fluticasone", "Tiotropium",
    "Ipratropium", "Salmeterol", "Formoterol", "Theophylline",
    "Famotidine", "Ranitidine", "Loperamide", "Mesalamine",
]


def main(argv: Optional[list[str]] = None):
    args = parse_args(argv)
    setup_logging(args.verbose)

    from app.domain.dailymed.pipeline import run_pipeline, process_single_drug

    store_in_db = not args.no_db and not args.json_only
    generate_embeddings = not args.no_embeddings and not args.json_only

    drug_names: Optional[list[str]] = None
    set_ids: Optional[list[str]] = None

    if args.drugs:
        drug_names = [d.strip() for d in args.drugs.split(",") if d.strip()]
    elif args.drug_file:
        path = args.drug_file
        if not os.path.exists(path):
            print(f"Error: drug file not found: {path}", file=sys.stderr)
            sys.exit(1)
        with open(path) as f:
            drug_names = [line.strip() for line in f if line.strip()]
    elif args.all_top_drugs:
        drug_names = TOP_100_DRUGS
    elif args.set_ids:
        set_ids = [s.strip() for s in args.set_ids.split(",") if s.strip()]
    elif args.incremental:
        drug_names = []  # will check API for updates
    else:
        drug_names = TOP_100_DRUGS

    if drug_names and len(drug_names) == 1 and not args.all_top_drugs:
        doc = process_single_drug(
            drug_names[0],
            output_dir=args.output_dir,
            xml_dir=args.xml_dir,
            store_in_db=store_in_db,
        )
        if doc is None:
            print(f"Failed to process drug: {drug_names[0]}")
            sys.exit(1)
        print(f"Successfully ingested: {drug_names[0]}")
        return

    stats = run_pipeline(
        drug_names=drug_names,
        set_ids=set_ids,
        output_dir=args.output_dir,
        xml_dir=args.xml_dir,
        store_in_db=store_in_db,
        generate_embeddings=generate_embeddings,
        incremental=args.incremental,
        skip_validation=args.no_validation,
        max_drugs=args.max_drugs,
    )

    if stats.failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
