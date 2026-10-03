from typing import Literal

from pydantic import BaseModel, Field, field_validator

MatchVerdict = Literal["useful", "false_positive", "not_my_work"]

# The only questions the beta survey asks. Anything else is rejected, so
# the table cannot be used as a general-purpose storage endpoint.
SURVEY_QUESTION_KEYS = ("check_today", "would_pay", "if_found")

MAX_ANSWER_LENGTH = 1000
MAX_MESSAGE_LENGTH = 2000


class MatchFeedbackUpdate(BaseModel):
    verdict: MatchVerdict


class MatchFeedbackRead(BaseModel):
    match_id: int
    verdict: MatchVerdict


class FeedbackCreate(BaseModel):
    kind: Literal["beta_survey", "general"]
    message: str | None = Field(default=None, max_length=MAX_MESSAGE_LENGTH)
    answers: dict[str, str] | None = None

    @field_validator("message")
    @classmethod
    def _trim_message(cls, value: str | None) -> str | None:
        if value is None:
            return None

        return value.strip() or None

    @field_validator("answers")
    @classmethod
    def _check_answers(
        cls, value: dict[str, str] | None
    ) -> dict[str, str] | None:
        if value is None:
            return None

        cleaned: dict[str, str] = {}

        for key, answer in value.items():
            if key not in SURVEY_QUESTION_KEYS:
                raise ValueError(f"Unknown question: {key}")

            if len(answer) > MAX_ANSWER_LENGTH:
                raise ValueError(
                    f"Answers are limited to {MAX_ANSWER_LENGTH} characters."
                )

            text = answer.strip()

            if text:
                cleaned[key] = text

        return cleaned or None


class FeedbackRead(BaseModel):
    id: int
