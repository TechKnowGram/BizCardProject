"""Declarative card styles: no generated code, URLs, or employee data."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class CardDesign(BaseModel):
    model_config = ConfigDict(extra='forbid')
    two_sided: bool = False
    name: str = Field(min_length=1, max_length=60)
    description: str = Field(min_length=1, max_length=255)
    background: str = Field(pattern=r'^#[0-9A-Fa-f]{6}$')
    text: str = Field(pattern=r'^#[0-9A-Fa-f]{6}$')
    accent: str = Field(pattern=r'^#[0-9A-Fa-f]{6}$')
    layout: Literal['left', 'center']
    decoration: Literal['stripe', 'corner', 'frame', 'minimal']
    font: Literal['Helvetica', 'Times-Roman', 'Courier']

    @model_validator(mode='after')
    def readable_contrast(self):
        def luminance(color):
            rgb = [int(color[i:i+2], 16) / 255 for i in (1, 3, 5)]
            linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb]
            return sum(a*b for a, b in zip(linear, (.2126, .7152, .0722)))
        a, b = sorted((luminance(self.background), luminance(self.text)))
        if (b + .05) / (a + .05) < 4.5:
            raise ValueError('Text and background need at least 4.5:1 contrast')
        return self


class DesignPrompt(BaseModel):
    model_config = ConfigDict(extra='forbid')
    prompt: str = Field(min_length=10, max_length=2000)
    previous_design: CardDesign | None = None


class BrandKit(BaseModel):
    model_config = ConfigDict(extra='forbid')
    background: str = Field(default='#FFFFFF', pattern=r'^#[0-9A-Fa-f]{6}$')
    text: str = Field(default='#18233F', pattern=r'^#[0-9A-Fa-f]{6}$')
    accent: str = Field(default='#7755CC', pattern=r'^#[0-9A-Fa-f]{6}$')
    font: Literal['Helvetica', 'Times-Roman', 'Courier'] = 'Helvetica'

    @model_validator(mode='after')
    def validate_contrast(self):
        CardDesign(name='Brand', description='Brand defaults', layout='left', decoration='minimal', **self.model_dump())
        return self


class DesignVariants(BaseModel):
    model_config = ConfigDict(extra='forbid')
    designs: list[CardDesign] = Field(min_length=3, max_length=3)


class CardPreviewRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    design: CardDesign | None = None
    template_id: int | None = Field(default=None, gt=0)
    employee_id: int | None = Field(default=None, gt=0)

    @model_validator(mode='after')
    def exactly_one_design(self):
        if (self.design is None) == (self.template_id is None):
            raise ValueError('Provide either a design or template_id')
        return self
