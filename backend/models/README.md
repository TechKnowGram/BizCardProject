# Models

`face_detection_yunet.onnx` is OpenCV's YuNet face detector (2023mar), from
https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet (MIT licence).
SHA-256: `8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4`

It is used to:
- find the photo frame on an uploaded card design (`app/services/template_ml.py`), and
- centre each employee's photo on their face in the preview and the PDF (`app/services/photo_crop.py`).

Without this file both fall back to simpler image heuristics.
