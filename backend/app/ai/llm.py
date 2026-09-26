"""Single LLM entry point. Every model call goes through OpenRouter."""

import logging

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from app.config import Settings
from app.errors import ConfigurationError, ExternalServiceError

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self, chat: ChatOpenAI, model_name: str):
        self.model_name = model_name
        self._chat = chat

    @classmethod
    def from_settings(cls, settings: Settings) -> "LLMService":
        api_key, model = settings.require_openrouter()
        chat = ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=settings.openrouter_base_url,
            timeout=settings.llm_timeout_seconds,
            max_retries=2,
        )
        return cls(chat, model)

    def complete(self, system: str, user: str) -> str:
        try:
            result = self._chat.invoke(
                [SystemMessage(content=system), HumanMessage(content=user)]
            )
        except Exception as exc:
            logger.exception("OpenRouter chat call failed")
            raise ExternalServiceError("The language model request failed.") from exc
        content = result.content
        if isinstance(content, str):
            return content.strip()
        if isinstance(content, list):
            text = "".join(
                part.get("text", "") if isinstance(part, dict) else str(part) for part in content
            )
            return text.strip()
        raise ExternalServiceError("The language model returned an empty response.")

    def complete_structured(self, system: str, user: str, schema: type[BaseModel]) -> BaseModel:
        try:
            structured = self._chat.with_structured_output(schema)
            result = structured.invoke(
                [SystemMessage(content=system), HumanMessage(content=user)]
            )
        except Exception as exc:
            logger.exception("Structured OpenRouter call failed")
            raise ExternalServiceError(
                "The language model did not return valid structured output."
            ) from exc
        if isinstance(result, schema):
            return result
        if isinstance(result, BaseModel):
            return schema.model_validate(result.model_dump())
        if isinstance(result, dict):
            return schema.model_validate(result)
        raise ExternalServiceError("The language model returned an unexpected structure.")


def require_llm(settings: Settings) -> LLMService:
    if not settings.openrouter_api_key or not settings.openrouter_model:
        raise ConfigurationError(
            "OPENROUTER_API_KEY and OPENROUTER_MODEL must be set before calling the language model."
        )
    return LLMService.from_settings(settings)
