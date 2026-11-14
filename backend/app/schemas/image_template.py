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


class AiSource(BaseModel):
    """The Illustrator file a template was made from, kept so cards can also be produced as .ai files."""
    model_config = ConfigDict(extra='forbid')
    file: str = Field(pattern=r'^tpl_[0-9a-f]{32}\.ai$')
    front: int = Field(ge=0)
    back: int | None = Field(default=None, ge=0)


class AiSourceCreate(BaseModel):
    """Sent when saving: which uploaded .ai and which artboards were the front and the back."""
    model_config = ConfigDict(extra='forbid')
    upload_id: str = Field(pattern=r'^[0-9a-f]{32}$')
    front: int = Field(ge=0)
    back: int | None = Field(default=None, ge=0)


class ImageTemplateDesign(BaseModel):
    """Design stored on CardTemplate.design for templates made from an uploaded image."""
    model_config = ConfigDict(extra='forbid')
    kind: Literal['image']
    background: str = Field(min_length=1, max_length=120)
    source: str = Field(min_length=1, max_length=120)
    company_id: int | None = None
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    width_pt: float | None = Field(default=None, gt=0, le=2000)
    height_pt: float | None = Field(default=None, gt=0, le=2000)
    fields: list[TemplateField] = Field(max_length=30)
    back: BackSide | None = None
    ai: AiSource | None = None


class TemplateAnalysis(BaseModel):
    """What the ML pipeline found in an uploaded design, before the admin saves it."""
    source: str
    background: str
    width: int
    height: int
    # Real size of the card in points, when the design came from an Illustrator artboard.
    width_pt: float | None = None
    height_pt: float | None = None
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
    width_pt: float | None = Field(default=None, gt=0, le=2000)
    height_pt: float | None = Field(default=None, gt=0, le=2000)
    fields: list[TemplateField] = Field(min_length=1, max_length=30)
    back: BackSide | None = None
    ai: AiSourceCreate | None = None


class ImageTemplateUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: str | None = Field(default=None, min_length=1, max_length=60)
    description: str | None = Field(default=None, max_length=255)
    fields: list[TemplateField] | None = Field(default=None, min_length=1, max_length=30)
    back_fields: list[TemplateField] | None = Field(default=None, max_length=30)
    back: BackSide | None = None


class ArtboardInfo(BaseModel):
    """One artboard of an uploaded Illustrator file, with a preview image to choose from."""
    index: int
    name: str
    width_mm: float
    height_mm: float
    card_like: bool
    preview: str  # file name of the preview, served by /templates/image/assets/{company_id}/{preview}


class ArtboardList(BaseModel):
    upload_id: str
    file_name: str
    artboards: list[ArtboardInfo]


class IllustratorAnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    upload_id: str = Field(pattern=r'^[0-9a-f]{32}$')
    front: int = Field(ge=0)
    back: int | None = Field(default=None, ge=0)


class IllustratorAnalysis(BaseModel):
    upload_id: str
    front_artboard: int
    back_artboard: int | None = None
    front: TemplateAnalysis
    back: TemplateAnalysis | None = None


class LayerSummary(BaseModel):
    name: str
    text: int
    image: int
    shape: int


class LayerObject(BaseModel):
    """Where an object sits on the artboard: fractions (0..1) from the top-left."""
    id: int
    layer: str
    x: float
    y: float
    w: float
    h: float


class LayerText(LayerObject):
    text: str
    size_pt: float
    color: str
    bold: bool


class LayerImage(LayerObject):
    width_px: int | None = None
    height_px: int | None = None
    thumbnail: str | None = None  # file name, served by /templates/image/assets/{company_id}/{thumbnail}


class LayerShape(LayerObject):
    kind: str  # rectangle, polygon, ellipse, curve, line, path, gradient
    fill: str | None = None
    stroke: str | None = None
    stroke_width: float = 0


class LayerNode(BaseModel):
    """One row of the layers tree, like Illustrator's Layers panel. Boxes are fractions of the artboard."""
    id: int
    kind: str  # layer, group, clip, text, image, shape
    name: str
    x: float | None = None
    y: float | None = None
    w: float | None = None
    h: float | None = None
    count: int | None = None  # objects inside a layer
    shape_kind: str | None = None
    clip_shape: bool = False  # the clipping shape of a clip group
    fill: str | None = None
    stroke: str | None = None
    stroke_width: float = 0
    color: str | None = None
    size_pt: float | None = None
    bold: bool = False
    width_px: int | None = None
    height_px: int | None = None
    thumbnail: str | None = None
    children: list['LayerNode'] = []


class ArtboardLayers(BaseModel):
    artboard: dict
    layers: list[LayerSummary]
    tree: list[LayerNode] = []
    images: list[LayerImage]
    texts: list[LayerText]
    shapes: list[LayerShape]
    truncated: bool = False


class IllustratorLayersRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    upload_id: str = Field(pattern=r'^[0-9a-f]{32}$')
    artboard: int = Field(ge=0)
