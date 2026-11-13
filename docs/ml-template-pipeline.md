# How BizCard turns a card design into a template

A company admin uploads a finished business-card design (exported from Photoshop, Canva, Illustrator, etc.). BizCard reads it, works out where each person's details go, and from then on prints a card for every employee in that same design. No designer has to rebuild the card, and nobody types positions by hand.

This page explains what happens, step by step, in plain terms.

## The short version

1. **Upload.** The admin uploads the front of the card, with sample text still on it (for example "John Doe", "Marketing Manager", "+880 1711 …").
2. **The machine reads the card.** A deep-learning text-recognition model finds every line of text and reads it.
3. **The machine understands the card.** Each line is labelled: name, job title, phone, email, website, address, company. The photo frame and a free spot for the QR code are found too.
4. **The machine cleans the card.** The sample text is erased from the image, leaving an empty background, as if the designer had hidden the text layers.
5. **A person checks it.** The admin sees coloured boxes on the card and can move or resize any of them, then previews it with a real employee.
6. **Cards are printed.** For every employee, BizCard puts their name, title, phone, photo and a verification QR code into those boxes and produces a print-ready PDF (3.5 × 2 in, vector text).

## What each step uses

| Step | Technology | What it does |
| --- | --- | --- |
| Read the text | **PP-OCR** deep-learning model (run with ONNX Runtime, through RapidOCR) | One neural network finds where text is on the image; a second one reads the letters. Works on any font, colour and background. |
| Group lines | Layout rules | Lines with the same size and colour stacked together become one field (a two-line name, a two-line address). |
| Label each field | Pattern recognition + layout cues | Email, phone, website and address are recognised from their pattern (an "@", a run of digits, "www.", "Road / House / Dhaka"). The **largest** remaining words are the person's name; the smaller line right above or below it is the job title. |
| Copy the style | Computer vision (OpenCV) | For each field it measures the text colour (colour clustering), size, whether it is bold (stroke thickness) and the alignment (left, centre or right, from the column edges). New names are printed in the same style. |
| Find the photo | Face detection (OpenCV YuNet, when installed) or a photo detector (round/square shapes with skin tones and texture) | Marks the frame where each employee's photo goes, round or square. |
| Find a spot for the QR code | Image analysis | Looks for the calmest empty area of the card. |
| Clean the background | Image inpainting (OpenCV Telea) | Erases the sample text and fills the gap from the surrounding pixels. If the admin also uploads the design with the text hidden, that clean version is used instead. |

All of this runs on our own server. The design is never sent to an outside AI service.

Positions are stored as fractions of the card (for example "the name starts 52% across and 17% down"). Because of this, the template works whatever resolution the upload was.

## Why there is a review step

The detection is good but not perfect, as with any machine-learning system. A slogan can look like a job title, or an icon can look like a photo. So the admin always sees the result before saving it. Every box can be moved, resized, relabelled, added or removed. Fixing one template takes a minute and is done once. Every card printed from it afterwards is automatic.

## The back of the card

The front works as described above and has not changed. The back is an **extra, optional** choice made when the template is created:

- **Front only.** The card is printed on one side.
- **Simple back.** No upload needed. BizCard prints the company logo, company name, website and the verification QR code on a colour the admin picks.
- **Upload the back.** The admin uploads a back design and the same machine-learning pipeline reads it. On a back, the biggest text is treated as the **company name** (not a person's name), and a line under it, like a slogan, is kept as part of the design. The admin can add a "Company logo" box, and the logo from the company profile is printed there.

When a back is chosen, the PDF has two pages, front and back, ready for double-sided printing.

## Security and privacy

- Uploads are checked for type, size (10 MB) and pixel count before any processing.
- Designs are stored per company. Only that company, its approved employees and platform admins can see them.
- At most two designs are analysed at a time, so heavy uploads cannot slow down the rest of the platform.
- Designs that were uploaded but never saved are deleted after 24 hours.

## Where it lives in the code

- `backend/app/services/template_ml.py`: the machine-learning analysis (read, label, style, photo, QR spot, clean).
- `backend/app/api/routes/image_templates.py`: upload, analyse, save and update endpoints.
- `backend/app/services/image_template_render.py`: fills a template with one employee and writes the PDF (front and optional back).
- `frontend/components/company/DesignUploader.tsx`: the upload page and the box editor.
- `backend/tests/test_image_templates.py`: automated tests with sample card layouts.
