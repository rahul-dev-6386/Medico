import re
import logging
from rapidfuzz import fuzz, process

logger = logging.getLogger(__name__)

MEDICAL_DICT = {
    "paracetamol": "Paracetamol",
    "acetaminophen": "Paracetamol",
    "pcm": "Paracetamol",
    "panadol": "Paracetamol",
    "crocin": "Paracetamol",
    "calpol": "Paracetamol",
    "ibuprofen": "Ibuprofen",
    "brufen": "Ibuprofen",
    "combiflam": "Ibuprofen + Paracetamol",
    "diclofenac": "Diclofenac",
    "voveran": "Diclofenac",
    "mefenamic acid": "Mefenamic Acid",
    "meftal": "Mefenamic Acid",
    "amoxicillin": "Amoxicillin",
    "mox": "Amoxicillin",
    "augmentin": "Amoxicillin + Clavulanic Acid",
    "clavam": "Amoxicillin + Clavulanic Acid",
    "azithromycin": "Azithromycin",
    "azee": "Azithromycin",
    "azithral": "Azithromycin",
    "ciprofloxacin": "Ciprofloxacin",
    "cipro": "Ciprofloxacin",
    "cipox": "Ciprofloxacin",
    "norfloxacin": "Norfloxacin",
    "norflox": "Norfloxacin",
    "ofloxacin": "Ofloxacin",
    "levofloxacin": "Levofloxacin",
    "levo": "Levofloxacin",
    "doxycycline": "Doxycycline",
    "dox": "Doxycycline",
    "metronidazole": "Metronidazole",
    "flagyl": "Metronidazole",
    "metrogyl": "Metronidazole",
    "pantoprazole": "Pantoprazole",
    "pantop": "Pantoprazole",
    "pan": "Pantoprazole",
    "pantodac": "Pantoprazole",
    "omeprazole": "Omeprazole",
    "omee": "Omeprazole",
    "omez": "Omeprazole",
    "ranitidine": "Ranitidine",
    "rantac": "Ranitidine",
    "domperidone": "Domperidone",
    "dom": "Domperidone",
    "domstal": "Domperidone",
    "ondansetron": "Ondansetron",
    "emset": "Ondansetron",
    "vomikind": "Ondansetron",
    "atorvastatin": "Atorvastatin",
    "ator": "Atorvastatin",
    "lipitor": "Atorvastatin",
    "rosuvastatin": "Rosuvastatin",
    "rosuvas": "Rosuvastatin",
    "crestor": "Rosuvastatin",
    "amlodipine": "Amlodipine",
    "amlip": "Amlodipine",
    "amlokind": "Amlodipine",
    "losartan": "Losartan",
    "losar": "Losartan",
    "telmisartan": "Telmisartan",
    "telma": "Telmisartan",
    "enalapril": "Enalapril",
    "ramipril": "Ramipril",
    "cardace": "Ramipril",
    "metformin": "Metformin",
    "glycomet": "Metformin",
    "glucophage": "Metformin",
    "glimepiride": "Glimepiride",
    "glimisave": "Glimepiride",
    "glyburide": "Glyburide",
    "glynase": "Glyburide",
    "insulin": "Insulin",
    "lantus": "Insulin Glargine",
    "novorapid": "Insulin Aspart",
    "humalog": "Insulin Lispro",
    "furosemide": "Furosemide",
    "lasix": "Furosemide",
    "spironolactone": "Spironolactone",
    "aldactone": "Spironolactone",
    "hydrochlorothiazide": "Hydrochlorothiazide",
    "warfarin": "Warfarin",
    "acitrom": "Acenocoumarol",
    "aspirin": "Aspirin",
    "ecosprin": "Aspirin",
    "disprin": "Aspirin",
    "clopidogrel": "Clopidogrel",
    "clopivas": "Clopidogrel",
    "plavix": "Clopidogrel",
    "levothyroxine": "Levothyroxine",
    "thyronorm": "Levothyroxine",
    "eltroxin": "Levothyroxine",
    "prednisolone": "Prednisolone",
    "wysolone": "Prednisolone",
    "omecort": "Prednisolone",
    "cetirizine": "Cetirizine",
    "zyrtec": "Cetirizine",
    "cetzine": "Cetirizine",
    "levocetirizine": "Levocetirizine",
    "levozet": "Levocetirizine",
    "montelukast": "Montelukast",
    "montair": "Montelukast",
    "albuterol": "Salbutamol",
    "salbutamol": "Salbutamol",
    "asthalin": "Salbutamol",
    "duolin": "Levosalbutamol + Ipratropium",
    "formoterol": "Formoterol",
    "budesonide": "Budesonide",
    "budes": "Budesonide",
    "pulmicort": "Budesonide",
}

ABBREVIATION_MAP = {
    r"\bbd\b": "twice daily",
    r"\bod\b": "once daily",
    r"\btds\b": "three times daily",
    r"\bqid\b": "four times daily",
    r"\bhs\b": "at bedtime",
    r"\bsos\b": "as required",
    r"\bac\b": "before meals",
    r"\bpc\b": "after meals",
    r"\bprn\b": "as needed",
    r"\bstat\b": "immediately",
    r"\bpo\b": "oral",
    r"\biv\b": "intravenous",
    r"\bim\b": "intramuscular",
    r"\bsc\b": "subcutaneous",
    r"\bsl\b": "sublingual",
    r"\btab\b": "tablet",
    r"\bcap\b": "capsule",
    r"\bsyp\b": "syrup",
    r"\binj\b": "injection",
    r"\boint\b": "ointment",
    r"\bcream\b": "cream",
    r"\bdrop\b": "drops",
    r"\bneb\b": "nebulization",
    r"\bmcg\b": "microgram",
    r"\bmg\b": "milligram",
    r"\bgm\b": "gram",
    r"\bml\b": "milliliter",
}

MED_NAMES = list(MEDICAL_DICT.keys())


def correct_medicine_spelling(word: str) -> str:
    if not word or len(word) < 2:
        return word
    best, score, _ = process.extractOne(word, MED_NAMES, scorer=fuzz.ratio)
    if score >= 75:
        return MEDICAL_DICT[best]
    return word


def expand_abbreviations(text: str) -> str:
    for pattern, expansion in ABBREVIATION_MAP.items():
        text = re.sub(pattern, expansion, text, flags=re.IGNORECASE)
    return text


def extract_medications(text: str) -> list[dict]:
    meds = []
    lines = text.split("\n")
    current_dosage = ""
    current_frequency = ""

    for line in lines:
        line_lower = line.lower().strip()
        if not line_lower:
            continue

        freq_match = re.search(
            r"\b(bd|od|tds|qid|hs|sos|prn|once daily|twice daily|three times daily)\b",
            line_lower,
        )
        if freq_match:
            current_frequency = freq_match.group(1).upper()

        dosage_match = re.search(
            r"(\d+\s*(?:mg|mcg|gm|ml|g|iu|%)[^\s]*)",
            line_lower,
        )
        if dosage_match:
            current_dosage = dosage_match.group(1).strip()

        words = line_lower.split()
        for word in words:
            clean = word.strip(".,;:()[]{}")
            if len(clean) < 2:
                continue
            best, score, _ = process.extractOne(clean, MED_NAMES, scorer=fuzz.ratio)
            if score >= 75:
                already = any(m["name"].lower() == MEDICAL_DICT[best].lower() for m in meds)
                if not already:
                    meds.append({
                        "name": MEDICAL_DICT[best],
                        "generic_name": MEDICAL_DICT[best],
                        "strength": current_dosage,
                        "frequency": current_frequency,
                        "duration": "",
                        "route": "",
                    })
                    current_dosage = ""
                    current_frequency = ""

    return meds


def extract_patient_info(text: str) -> dict:
    info = {
        "patient_name": "",
        "hospital": "",
        "date": "",
    }

    date_match = re.search(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", text)
    if date_match:
        info["date"] = date_match.group(1)

    name_match = re.search(
        r"(?:name|patient|pt\.?)\s*[:;]\s*([A-Za-z\s]+)",
        text,
        re.IGNORECASE,
    )
    if name_match:
        name = name_match.group(1).strip()
        if len(name) > 1:
            info["patient_name"] = name

    hospital_match = re.search(
        r"(?:hospital|clinic|centre|center|dr\.?|doctor)\s*[:;]\s*([A-Za-z\s]+)",
        text,
        re.IGNORECASE,
    )
    if hospital_match:
        hospital = hospital_match.group(1).strip()
        if len(hospital) > 2:
            info["hospital"] = hospital

    return info


def extract_vitals(text: str) -> dict:
    vitals = {}
    bp_match = re.search(r"(?:bp|blood\s*pressure)\s*[:;]?\s*(\d{2,3})\s*[/]\s*(\d{2,3})", text, re.IGNORECASE)
    if bp_match:
        vitals["blood_pressure"] = f"{bp_match.group(1)}/{bp_match.group(2)}"

    pulse_match = re.search(r"(?:pulse|pr|pulse\s*rate)\s*[:;]?\s*(\d{2,3})", text, re.IGNORECASE)
    if pulse_match:
        vitals["pulse"] = pulse_match.group(1)

    temp_match = re.search(r"(?:temp|temperature)\s*[:;]?\s*(\d{2}\.?\d*)", text, re.IGNORECASE)
    if temp_match:
        vitals["temperature"] = temp_match.group(1)

    rr_match = re.search(r"(?:rr|resp|respiratory\s*rate)\s*[:;]?\s*(\d{2})", text, re.IGNORECASE)
    if rr_match:
        vitals["respiratory_rate"] = rr_match.group(1)

    spo2_match = re.search(r"(?:spo2|o2\s*sat|oxygen)\s*[:;]?\s*(\d{2,3})", text, re.IGNORECASE)
    if spo2_match:
        vitals["spo2"] = spo2_match.group(1)

    return vitals


def postprocess(text: str, engine: str, confidence: float) -> dict:
    expanded = expand_abbreviations(text)
    meds = extract_medications(expanded)
    patient_info = extract_patient_info(expanded)
    vitals = extract_vitals(expanded)

    return {
        "raw_text": text,
        "expanded_text": expanded,
        "confidence": confidence,
        "engine": engine,
        "structured_data": {
            "patient_name": patient_info["patient_name"],
            "hospital": patient_info["hospital"],
            "date": patient_info["date"],
            "symptoms": [],
            "diagnosis": "",
            "medications": meds,
            "vitals": vitals,
        },
        "patient": patient_info,
    }
