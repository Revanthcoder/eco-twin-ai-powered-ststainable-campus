"""
System Prompts, Formatting Templates, and Prompt Injection Defense.
Enforces strict grounding on supplied database telemetry.
"""

import re
from typing import Tuple, List

# Patterns frequently used in prompt injection attacks
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior)\s+(instructions|prompts)",
    r"disregard\s+(all\s+)?(previous|prior|system)\s+(instructions|rules)",
    r"you\s+are\s+now\s+(an?\s+)?(unrestricted|dan|jailbroken|admin|developer)",
    r"override\s+system\s+(prompt|role|instructions)",
    r"reveal\s+(your|the)\s+(system\s+prompt|hidden\s+instructions|secret\s+key)",
    r"execute:\s*(bash|sh|cmd|powershell|python|sql)",
    r"drop\s+table",
    r"delete\s+from",
    r"curl\s+http",
    r"<script>",
    r"bypass\s+(safety|constraints|guidelines)"
]

COMPILED_INJECTION_REGEX = [re.compile(p, re.IGNORECASE) for p in INJECTION_PATTERNS]


def sanitize_untrusted_input(text: str) -> Tuple[str, bool, List[str]]:
    """
    Sanitizes user input string against prompt injection and jailbreak attempts.
    Returns: (sanitized_text, is_injection_detected, list_of_matched_patterns)
    """
    if not text:
        return "", False, []

    detected_patterns = []
    clean_text = text

    for regex in COMPILED_INJECTION_REGEX:
        matches = regex.findall(clean_text)
        if matches:
            pattern_str = regex.pattern
            detected_patterns.append(pattern_str)
            # Neutralize injection keyword by replacing with sanitized token
            clean_text = regex.sub("[REDACTED_SECURITY_OVERRIDE_ATTEMPT]", clean_text)

    # Strip dangerous HTML or markdown control markers
    clean_text = clean_text.replace("```python", "```text")
    clean_text = clean_text.replace("```bash", "```text")

    is_injection = len(detected_patterns) > 0
    return clean_text.strip(), is_injection, detected_patterns


SYSTEM_PROMPT_GROUNDED_ADVISOR = """You are the EcoNexus AI Campus Sustainability Intelligence Engine.
Your role is to analyze campus resource telemetry, explain anomalies, and recommend concrete maintenance actions.

CRITICAL RESPONSIBLE AI CONSTRAINTS:
1. USE ONLY FACTS PROVIDED: You must ground all explanations, numbers, and recommendations ONLY on the facts supplied in the <campus_context> XML tags.
2. MISSING DATA HONESTY: If the user asks about a building, sensor, date, or metric that is NOT in <campus_context>, you MUST honestly state that the requested data is not currently available in the campus database. DO NOT speculate or fabricate.
3. NEVER FABRICATE: Never fabricate readings, dates, costs, emissions factors, sensor IDs, or accuracy percentages.
4. NO CODE EXECUTION: Never output executable Python, Bash, or SQL scripts, and never attempt to control physical equipment.
5. ADVISORY ONLY: Keep all recommendations advisory. Human engineering verification is required before any physical equipment intervention.
6. DATA CLASSIFICATION: Explicitly distinguish measured facts, engineering estimates, model predictions, and unknown quantities.
7. FORMAT: Always output valid JSON strictly conforming to the requested schema.
"""

def format_context_block(context_data: dict) -> str:
    """Renders contextual telemetry into an isolated XML envelope for LLM grounding."""
    import json
    json_str = json.dumps(context_data, indent=2, default=str)
    return f"""<campus_context>
{json_str}
</campus_context>"""
