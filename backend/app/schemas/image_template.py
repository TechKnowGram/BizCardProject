from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

FieldRole = Literal['name', 'title', 'department', 'phone', 'email', 'website', 'address', 'company', 'logo', 'photo', 'qr', 'other']


class TemplateField(BaseModel):
    """One place on an uploaded design. Boxes are fractions (0..1) of the card size."""
    model_config = ConfigDict(extra='ignore')
    role: FieldRole
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    w: float = Field(gt=0, le=1)
    h: float = Field(gt=0, le=1)
    text: str = Field(default='', max_length=200)
    size: float = Field(default=0.05, ge=0, le=0.5)
    color: str = Field(default='#111111', pattern=r'^#[0-9a-fA-F]{6}$')
    align: Literal['left', 'center', 'right'] = 'left'
    bold: bool = False
    shape: Literal['rect', 'circle'] = 'rect'
    lines: int = Field(default=1, ge=1, le=4)
    confidence: float = Field(default=0, ge=0, le=1)
    ink: tuple[float, float, float, float] | None = None


class ImageSide(BaseModel):
    """The back of a two-sided card: its own uploaded design, read by the same ML pipeline."""
    model_config = ConfigDict(extra='forbid')
    style: Literal['image'] = 'image'
    source: str = Field(min_length=1, max_length=120)
    background: str = Field(min_length=1, max_length=120)
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    fields: list[TemplateField] = Field(default_factory=list, max_length=30)


class AutoBack(BaseModel):
    """A simple back built from the company profile: logo, name, website and QR on one colour."""
    model_config = ConfigDict(extra='forbid')
    style: Literal['auto']
    color: str = Field(default='#101845', pattern=r'^#[0-9a-fA-F]{6}$')
    text_color: str = Field(default='#FFFFFF', pattern=r'^#[0-9a-fA-F]{6}$')
    show_qr: bool = True


# No "style" means an uploaded back (older saved designs); 'auto' means the generated one.
BackSide = ImageSide | AutoBack


class ImageTemplateDesign(BaseModel):
    """Design stored on CardTemplate.design for templates made from an uploaded image."""
    model_config = ConfigDict(extra='forbid')
    kind: Literal['image']
    background: str = Field(min_length=1, max_length=120)
    source: str = Field(min_length=1, max_length=120)
    company_id: int | None = None
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    fields: list[TemplateField] = Field(max_length=30)
    back: BackSide | None = None


class TemplateAnalysis(BaseModel):
    """What the ML pipeline found in an uploaded design, before the admin saves it."""
    source: str
    background: str
    width: int
    height: int
    fields: list[TemplateField]
    warnings: list[str] = []


class ImageTemplateCreate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: str = Field(min_length=1, max_length=60)
    description: str = Field(default='', max_length=255)
    source: str = Field(min_length=1, max_length=120)
    background: str = Field(min_length=1, max_length=120)
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    fields: list[TemplateField] = Field(min_length=1, max_length=30)
    back: BackSide | None = None


class ImageTemplateUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: str | None = Field(default=None, min_length=1, max_length=60)
    description: str | None = Field(default=None, max_length=255)
    fields: list[TemplateField] | None = Field(default=None, min_length=1, max_length=30)
    back_fields: list[TemplateField] | None = Field(default=None, max_length=30)
    back: BackSide | None = None
