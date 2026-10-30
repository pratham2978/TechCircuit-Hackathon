"""
Image Palette Analyzer (Python Helper)
Implements:
- 64x64 thumbnail resizing
- Pixel bucketing (RGB rounded to nearest 16 for robust clustering)
- Top 5 dominant colors with coverage percentages
- Exact RGB to CIE-L*a*b* conversion (D65 illuminant)
- Delta E (Euclidean Lab distance) comparison against brand palette colors
- Off-palette threshold: coverage >= 10% and Lab distance > 25 to all palette colors
"""

import sys
import json
import os
import math
from PIL import Image

def rgb_to_lab(r, g, b):
    # sRGB [0, 255] to normalized linear RGB
    r_lin = r / 255.0
    g_lin = g / 255.0
    b_lin = b / 255.0

    r_lin = ((r_lin + 0.055) / 1.055) ** 2.4 if r_lin > 0.04045 else r_lin / 12.92
    g_lin = ((g_lin + 0.055) / 1.055) ** 2.4 if g_lin > 0.04045 else g_lin / 12.92
    b_lin = ((b_lin + 0.055) / 1.055) ** 2.4 if b_lin > 0.04045 else b_lin / 12.92

    # Linear RGB to XYZ (D65 standard illuminant)
    x = (r_lin * 0.4124 + g_lin * 0.3576 + b_lin * 0.1805) / 0.95047
    y = (r_lin * 0.2126 + g_lin * 0.7152 + b_lin * 0.0722) / 1.00000
    z = (r_lin * 0.0193 + g_lin * 0.1192 + b_lin * 0.9505) / 1.08883

    def f(t):
        return t ** (1.0 / 3.0) if t > 0.008856 else (7.787 * t) + (16.0 / 116.0)

    fx, fy, fz = f(x), f(y), f(z)
    L = (116.0 * fy) - 16.0
    a = 500.0 * (fx - fy)
    b_val = 200.0 * (fy - fz)
    return L, a, b_val

def hex_to_rgb(hex_code):
    h = hex_code.strip().lstrip('#')
    if len(h) == 3:
        h = ''.join([c + c for c in h])
    if len(h) != 6:
        return 0, 0, 0
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)

def delta_e_lab(lab1, lab2):
    return math.sqrt((lab1[0] - lab2[0])**2 + (lab1[1] - lab2[1])**2 + (lab1[2] - lab2[2])**2)

def analyze_image(image_path, brand_palette_hex_list):
    if not os.path.exists(image_path):
        return {"error": f"Image file not found: {image_path}"}

    try:
        img = Image.open(image_path).convert('RGB')
    except Exception as e:
        return {"error": f"Cannot decode image: {str(e)}"}

    # Resize to 64x64 as specified in Round 3 plan
    img_thumb = img.resize((64, 64), Image.Resampling.LANCZOS)
    pixels = list(img_thumb.getdata())
    total_pixels = len(pixels)  # 4096

    # Bucket pixels (step size 16 to cluster close shades)
    step = 16
    bucket_counts = {}
    bucket_samples = {}

    for r, g, b in pixels:
        br = min(255, (r // step) * step + (step // 2))
        bg = min(255, (g // step) * step + (step // 2))
        bb = min(255, (b // step) * step + (step // 2))
        key = (br, bg, bb)
        bucket_counts[key] = bucket_counts.get(key, 0) + 1
        bucket_samples[key] = (r, g, b)

    # Top 5 dominant colors
    sorted_buckets = sorted(bucket_counts.items(), key=lambda x: x[1], reverse=True)[:5]

    # Convert brand palette to Lab
    palette_labs = []
    for phex in brand_palette_hex_list:
        pr, pg, pb = hex_to_rgb(phex)
        palette_labs.append({
            "hex": phex,
            "rgb": (pr, pg, pb),
            "lab": rgb_to_lab(pr, pg, pb)
        })

    top_colors = []
    off_palette_colors = []

    for bucket, count in sorted_buckets:
        r, g, b = bucket_samples[bucket]
        hex_val = f"#{r:02x}{g:02x}{b:02x}"
        coverage_pct = round((count / total_pixels) * 100.0, 1)
        col_lab = rgb_to_lab(r, g, b)

        # Compute minimum Lab distance to brand palette
        min_dist = float('inf')
        closest_palette_color = None
        for p in palette_labs:
            d = delta_e_lab(col_lab, p["lab"])
            if d < min_dist:
                min_dist = d
                closest_palette_color = p["hex"]

        is_off_palette = (coverage_pct >= 10.0 and min_dist > 25.0)

        color_info = {
            "hex": hex_val,
            "rgb": [r, g, b],
            "coverage_pct": coverage_pct,
            "min_lab_distance": round(min_dist, 1),
            "closest_palette_color": closest_palette_color,
            "is_off_palette": is_off_palette
        }
        top_colors.append(color_info)

        if is_off_palette:
            off_palette_colors.append(color_info)

    return {
        "success": True,
        "width": img.width,
        "height": img.height,
        "top_colors": top_colors,
        "off_palette_colors": off_palette_colors,
        "palette_evaluated": brand_palette_hex_list
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: analyze_palette.py <image_path> [palette_hex_comma_separated]"}))
        sys.exit(1)

    img_path = sys.argv[1]
    palette_raw = sys.argv[2] if len(sys.argv) > 2 else "#27231e,#f7f4ee,#c6f432,#22d3ee"
    palette = [c.strip() for c in palette_raw.split(',') if c.strip()]

    result = analyze_image(img_path, palette)
    print(json.dumps(result))
