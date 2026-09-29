from pydantic import AliasChoices, Field, SecretStr
from typing import Literal
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = 'BizCardProject'
    app_version: str = '0.1.0'
    debug: bool = Field(default=False, validation_alias='APP_DEBUG')
    database_url: str
    secret_key: str = Field(min_length=32)
    algorithm: Literal['HS256'] = 'HS256'
    access_token_expire_minutes: int = Field(default=30, ge=1)
    system_admin_username: str = Field(
        default='', validation_alias=AliasChoices('SYSTEM_ADMIN_USERNAME', 'SUPER_ADMIN_USERNAME')
    )
    system_admin_email: str = Field(
        default='', validation_alias=AliasChoices('SYSTEM_ADMIN_EMAIL', 'SUPER_ADMIN_EMAIL')
    )
    system_admin_password: SecretStr = Field(
        default=SecretStr(''), validation_alias=AliasChoices('SYSTEM_ADMIN_PASSWORD', 'SUPER_ADMIN_PASSWORD')
    )
    generated_card_storage: str = 'generated_cards'
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / '.env',
        env_file_encoding='utf-8',
        case_sensitive=False,
    )


settings = Settings()
