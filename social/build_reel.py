"""Build a silent vertical reel from the captured Gebeta screens."""

from pathlib import Path
import subprocess

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / "frames"
OUT = ROOT / "gebeta-features.mp4"

W, H = 1080, 1920
PHOTO_H = 1460
FPS = 24
CREAM = (243, 235, 221)
INK = (28, 20, 15)
GOLD = (231, 201, 138)
WHITE = (251, 246, 238)

SERIF = "/System/Library/Fonts/Supplemental/Georgia.ttf"
SERIF_BOLD = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"

SCENES = [
    {
        "kind": "title",
        "seconds": 3.2,
        "eyebrow": "ETHIOPIAN CATERING AND MEAL PREP",
        "title": "Order the week.\nOr the whole table.",
        "body": "Complete packages. You add only the extras.",
    },
    {
        "kind": "shot",
        "file": "social-02-meals.png",
        "top": 0,
        "seconds": 3.6,
        "eyebrow": "WEEKLY MEALS",
        "title": "One week or two.",
        "body": "The standard meals are already in the container.",
    },
    {
        "kind": "shot",
        "file": "social-03-package.png",
        "top": 70,
        "seconds": 3.6,
        "eyebrow": "THE PACKAGE",
        "title": "Fasting or non-fasting.",
        "body": "$21 a person. Add-ons only if you want them.",
    },
    {
        "kind": "shot",
        "file": "social-04-mixed.png",
        "top": 160,
        "seconds": 3.4,
        "eyebrow": "MIXED ORDER",
        "title": "Or mix both.",
        "body": "Same standard price. You choose the dishes.",
    },
    {
        "kind": "shot",
        "file": "social-05-catering.png",
        "top": 820,
        "seconds": 3.6,
        "eyebrow": "CATERING",
        "title": "Count the guests.",
        "body": "From 10 people. $21 each, before add-ons.",
    },
    {
        "kind": "shot",
        "file": "social-06-fulfillment.png",
        "top": 700,
        "seconds": 3.8,
        "eyebrow": "PICKUP OR DELIVERY",
        "title": "Pickup is free.",
        "body": "Delivery is $2 a mile. Nothing is cooked until you pay.",
    },
    {
        "kind": "end",
        "seconds": 4.2,
        "eyebrow": "STONE MOUNTAIN",
        "title": "Gebeta",
        "body": "Have the order ID ready at pickup.",
        "tag": "Coming soon ATL",
    },
]


def font(path, size):
    return ImageFont.truetype(path, size)


def wrap(draw, text, face, max_width):
    lines = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        current = ""
        for word in words:
            trial = word if not current else f"{current} {word}"
            if draw.textlength(trial, font=face) <= max_width:
                current = trial
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
    return lines


def screen(path, top):
    image = Image.open(FRAMES / path).convert("RGB")
    scale = W / image.width
    resized = image.resize((W, int(image.height * scale)), Image.Resampling.LANCZOS)
    start = int(top * scale)
    start = max(0, min(start, resized.height - PHOTO_H))
    return resized.crop((0, start, W, start + PHOTO_H))


def zoom(image, amount):
    if amount <= 0:
        return image
    grow = 1 + amount
    width, height = image.size
    bigger = image.resize((int(width * grow), int(height * grow)), Image.Resampling.LANCZOS)
    left = (bigger.width - width) // 2
    top = int((bigger.height - height) * 0.22)
    return bigger.crop((left, top, left + width, top + height))


def panel(photo, eyebrow, title, body):
    image = Image.new("RGB", (W, H), INK)
    image.paste(photo, (0, 0))
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, PHOTO_H, W, PHOTO_H + 8), fill=GOLD)
    eyebrow_font = font(SERIF, 28)
    title_font = font(SERIF_BOLD, 68)
    body_font = font(SERIF, 36)
    y = PHOTO_H + 36
    draw.text((72, y), eyebrow, font=eyebrow_font, fill=GOLD)
    y += 52
    for line in wrap(draw, title, title_font, W - 144):
        draw.text((72, y), line, font=title_font, fill=WHITE)
        y += 80
    y += 6
    for line in wrap(draw, body, body_font, W - 144):
        draw.text((72, y), line, font=body_font, fill=CREAM)
        y += 48
    return image


def title_card(eyebrow, title, body, mark):
    image = Image.new("RGB", (W, H), INK)
    logo = Image.open(ROOT.parent / "public" / "gebeta-logo.png").convert("RGBA")
    logo.thumbnail((820, 280), Image.Resampling.LANCZOS)
    image.paste(logo, ((W - logo.width) // 2, 520), logo)
    draw = ImageDraw.Draw(image)
    eyebrow_font = font(SERIF, 28)
    title_font = font(SERIF_BOLD, 78)
    body_font = font(SERIF, 40)
    eyebrow_w = draw.textlength(eyebrow, font=eyebrow_font)
    draw.text(((W - eyebrow_w) / 2, 900), eyebrow, font=eyebrow_font, fill=GOLD)
    y = 980
    for line in wrap(draw, title, title_font, W - 160):
        width = draw.textlength(line, font=title_font)
        draw.text(((W - width) / 2, y), line, font=title_font, fill=WHITE)
        y += 92
    y += 16
    for line in wrap(draw, body, body_font, W - 180):
        width = draw.textlength(line, font=body_font)
        draw.text(((W - width) / 2, y), line, font=body_font, fill=CREAM)
        y += 52
    return image


def end_card(eyebrow, title, body, tag):
    image = Image.new("RGB", (W, H), INK)
    mark = Image.open(ROOT.parent / "public" / "gebeta-mark.png").convert("RGBA")
    mark.thumbnail((360, 360), Image.Resampling.LANCZOS)
    image.paste(mark, ((W - mark.width) // 2, 480), mark)
    draw = ImageDraw.Draw(image)
    eyebrow_font = font(SERIF, 28)
    title_font = font(SERIF_BOLD, 92)
    body_font = font(SERIF, 40)
    tag_font = font(SERIF_BOLD, 54)
    title_w = draw.textlength(title, font=title_font)
    draw.text(((W - title_w) / 2, 900), title, font=title_font, fill=WHITE)
    eyebrow_w = draw.textlength(eyebrow, font=eyebrow_font)
    draw.text(((W - eyebrow_w) / 2, 1020), eyebrow, font=eyebrow_font, fill=GOLD)
    y = 1120
    for line in wrap(draw, body, body_font, W - 180):
        width = draw.textlength(line, font=body_font)
        draw.text(((W - width) / 2, y), line, font=body_font, fill=CREAM)
        y += 52
    y += 36
    tag_w = draw.textlength(tag, font=tag_font)
    draw.text(((W - tag_w) / 2, y), tag, font=tag_font, fill=GOLD)
    return image


def blend(a, b, t):
    return Image.blend(a, b, t)


def scene_frames(scene):
    count = 1 if __import__("os").environ.get("PREVIEW") else int(round(scene["seconds"] * FPS))
    if scene["kind"] == "title":
        card = title_card(scene["eyebrow"], scene["title"], scene["body"], None)
        return [card] * count
    if scene["kind"] == "end":
        card = end_card(scene["eyebrow"], scene["title"], scene["body"], scene["tag"])
        return [card] * count
    shot = screen(scene["file"], scene["top"])
    frames = []
    for index in range(count):
        moved = zoom(shot, 0.05 * index / max(count - 1, 1))
        frames.append(panel(moved, scene["eyebrow"], scene["title"], scene["body"]))
    return frames


def main():
    groups = [scene_frames(scene) for scene in SCENES]
    preview = ROOT / "preview"
    preview.mkdir(exist_ok=True)
    for index, group in enumerate(groups):
        group[0].save(preview / f"{index}.jpg", quality=86)
    if __import__("os").environ.get("PREVIEW"):
        print("previews only")
        return

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    process = subprocess.Popen(
        [
            ffmpeg,
            "-y",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgb24",
            "-s",
            f"{W}x{H}",
            "-r",
            str(FPS),
            "-i",
            "-",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(OUT),
        ],
        stdin=subprocess.PIPE,
    )

    fade = 8
    frames = groups

    for index, group in enumerate(frames):
        start = fade if index else 0
        for frame in group[start:]:
            process.stdin.write(frame.convert("RGB").tobytes())
        if index < len(frames) - 1:
            for step in range(fade):
                mixed = blend(group[-1], frames[index + 1][0], (step + 1) / fade)
                process.stdin.write(mixed.convert("RGB").tobytes())

    process.stdin.close()
    code = process.wait()
    if code != 0:
        raise SystemExit(code)
    print(OUT, OUT.stat().st_size)


if __name__ == "__main__":
    main()
