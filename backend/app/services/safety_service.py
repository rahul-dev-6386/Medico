import re
from typing import Optional


EMERGENCY_PATTERNS = [
    (r"chest pain", "cardiac", "Possible heart attack. Chest pain can indicate a heart attack."),
    (r"heart attack", "cardiac", "Possible heart attack detected."),
    (r"stroke", "neurological", "Possible stroke detected. Look for facial drooping, arm weakness, speech difficulty."),
    (r"severe bleeding", "trauma", "Severe bleeding requires immediate medical attention."),
    (r"suicidal", "mental_health", "Suicidal thoughts require immediate crisis intervention."),
    (r"want to die", "mental_health", "Suicidal ideation detected. Crisis support needed."),
    (r"self-harm", "mental_health", "Self-harm detected. Immediate crisis intervention required."),
    (r"difficulty breathing", "respiratory", "Respiratory distress detected."),
    (r"can't breathe", "respiratory", "Severe respiratory distress — call emergency services immediately."),
    (r"shortness of breath", "respiratory", "Respiratory distress detected."),
    (r"severe allergic reaction", "allergic", "Anaphylaxis suspected. Use epinephrine auto-injector if available."),
    (r"anaphylaxis", "allergic", "Anaphylaxis detected. This is life-threatening."),
    (r"unconscious", "neurological", "Unconsciousness requires immediate emergency response."),
    (r"not breathing", "respiratory", "Patient not breathing. Begin CPR immediately."),
    (r"choking", "respiratory", "Choking detected. Perform Heimlich maneuver."),
    (r"severe burn", "trauma", "Severe burns require emergency medical treatment."),
    (r"broken bone.*protruding", "trauma", "Open fracture detected. Seek emergency care."),
    (r"head injury.*vomiting", "neurological", "Head injury with vomiting may indicate brain injury."),
    (r"poisoning", "toxicology", "Poisoning detected. Contact poison control immediately."),
    (r"overdose", "toxicology", "Overdose detected. This is a medical emergency."),
    (r"seizure", "neurological", "Seizure detected. Ensure patient safety and call emergency services."),
    (r"confusion|disoriented", "neurological", "Sudden confusion may indicate a medical emergency."),
    (r"severe abdominal pain", "gastrointestinal", "Severe abdominal pain may indicate a medical emergency."),
    (r"vision loss|blindness", "ophthalmic", "Sudden vision loss is a medical emergency."),
    (r"slurred speech", "neurological", "Slurred speech may indicate stroke."),
    (r"facial droop", "neurological", "Facial drooping may indicate stroke."),
]

EMERGENCY_RESPONSE_TEMPLATE = (
    "⚠️ **EMERGENCY DETECTED**\n\n"
    "**Type:** {category}\n"
    "**Detail:** {detail}\n\n"
    "Please call your local emergency services immediately.\n\n"
    "- **Do not wait** for an online response\n"
    "- Call 911 (US) or your local emergency number\n"
    "- If you're with someone, ask them to stay with you\n\n"
    "I'm an AI assistant and cannot provide emergency medical help. "
    "Please seek immediate professional medical attention."
)


class SafetyService:
    def check_message(self, content: str) -> dict:
        content_lower = content.lower().strip()

        matched_results = []
        for pattern, category, detail in EMERGENCY_PATTERNS:
            if re.search(pattern, content_lower):
                matched_results.append({
                    "category": category,
                    "detail": detail,
                    "pattern": pattern,
                })

        if matched_results:
            primary = matched_results[0]
            categories = list(set(m["category"] for m in matched_results))

            response = EMERGENCY_RESPONSE_TEMPLATE.format(
                category=categories[0].replace("_", " ").title(),
                detail=primary["detail"],
            )

            if len(categories) > 1:
                response += f"\n\nAdditional concerns detected: {', '.join(c.replace('_', ' ') for c in categories[1:])}."

            return {
                "emergency": True,
                "message": response,
                "matched_patterns": [m["pattern"] for m in matched_results],
                "categories": categories,
            }

        return {"emergency": False, "message": ""}

    def add_disclaimer(self, response: str) -> str:
        disclaimer = (
            "\n\n---\n*Disclaimer: I am an AI health assistant, not a doctor. "
            "This information is for educational purposes only and should not "
            "replace professional medical advice. Always consult a healthcare "
            "provider for medical decisions.*"
        )
        if "disclaimer" not in response.lower():
            response += disclaimer
        return response
