"""Small JSON-only LLM adapter shared by assessment generation and grading."""

import json

from decouple import config
from langchain_openai import ChatOpenAI


class AssessmentLLM:
    """Use the project's OpenRouter-compatible model with structured output."""

    def __init__(self):
        api_key = config("OPEN_ROUTER", default=None)
        if not api_key:
            raise RuntimeError("OPEN_ROUTER must be configured to generate or grade assessments.")

        self.client = ChatOpenAI(
            model=config("ASSESSMENT_MODEL", default="openai/gpt-4o-mini"),
            openai_api_key=api_key,
            openai_api_base="https://openrouter.ai/api/v1",
            temperature=0,
        )

    def invoke_json(self, prompt):
        response = self.client.invoke(prompt)
        content = response.content
        if isinstance(content, list):
            content = "".join(
                item.get("text", "") if isinstance(item, dict) else str(item)
                for item in content
            )

        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()

        try:
            return json.loads(content)
        except json.JSONDecodeError as error:
            raise ValueError("Assessment model returned invalid JSON.") from error
