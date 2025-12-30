#!/usr/bin/env python3
"""
Generate SplitDumb app icons at all required resolutions.

Design concept: A stylized split/divide symbol using the app's color palette.
- Two overlapping circles that appear to be splitting apart
- Teal (#00d9c0) and purple (#a855f7) circles on deep navy (#0a0e27) background
- Creates a visual metaphor for expense splitting
"""

import os
from pathlib import Path
from PIL import Image, ImageDraw

# App color palette
DEEP_NAVY = (10, 14, 39)  # #0a0e27
TEAL = (0, 217, 192)  # #00d9c0
PURPLE = (168, 85, 247)  # #a855f7


def create_foreground(size: int) -> Image.Image:
    """
    Create the foreground layer for adaptive icon.

    Design: Two overlapping semi-circles splitting apart, representing
    expense splitting. Uses teal and purple from the app palette.

    For adaptive icons, the foreground should be 108dp with the icon
    content in the center 66dp (safe zone).
    """
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Calculate dimensions relative to size
    # For adaptive icons, safe zone is center 66/108 = ~61%
    center = size // 2

    # Main circle radius (fits in safe zone with padding)
    safe_zone_radius = int(size * 0.28)

    # Split offset - how far apart the two halves are
    split_offset = int(size * 0.04)

    # Draw left half (teal) - a semi-circle pointing right
    left_center_x = center - split_offset

    # Draw right half (purple) - a semi-circle pointing left
    right_center_x = center + split_offset

    # Create the split circle effect
    # Left circle (teal)
    left_bbox = [
        left_center_x - safe_zone_radius,
        center - safe_zone_radius,
        left_center_x + safe_zone_radius,
        center + safe_zone_radius
    ]

    # Right circle (purple)
    right_bbox = [
        right_center_x - safe_zone_radius,
        center - safe_zone_radius,
        right_center_x + safe_zone_radius,
        center + safe_zone_radius
    ]

    # Draw the circles with a slight overlap creating the split effect
    # Use pie slices to create the split look

    # Draw left semi-circle (teal) - facing right
    draw.pieslice(left_bbox, start=90, end=270, fill=TEAL)

    # Draw right semi-circle (purple) - facing left
    draw.pieslice(right_bbox, start=270, end=90, fill=PURPLE)

    # Add a thin dividing line in the center for emphasis
    line_width = max(2, int(size * 0.015))
    draw.rectangle([
        center - line_width // 2,
        center - safe_zone_radius + int(size * 0.02),
        center + line_width // 2,
        center + safe_zone_radius - int(size * 0.02)
    ], fill=DEEP_NAVY)

    return img


def create_background(size: int) -> Image.Image:
    """Create the background layer for adaptive icon - solid deep navy."""
    img = Image.new("RGBA", (size, size), DEEP_NAVY + (255,))
    return img


def create_legacy_icon(size: int) -> Image.Image:
    """
    Create a legacy (non-adaptive) icon with rounded corners.
    Combines foreground and background into single image.
    """
    # Create background
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw rounded rectangle background
    corner_radius = int(size * 0.18)  # Standard Android icon corner radius
    draw.rounded_rectangle(
        [0, 0, size - 1, size - 1],
        radius=corner_radius,
        fill=DEEP_NAVY
    )

    # Create and paste foreground
    foreground = create_foreground(size)
    img = Image.alpha_composite(img, foreground)

    # Re-apply rounded corner mask
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(
        [0, 0, size - 1, size - 1],
        radius=corner_radius,
        fill=255
    )

    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    result.paste(img, mask=mask)

    return result


def create_round_icon(size: int) -> Image.Image:
    """Create a round icon variant."""
    # Create background circle
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([0, 0, size - 1, size - 1], fill=DEEP_NAVY)

    # Create and paste foreground
    foreground = create_foreground(size)
    img = Image.alpha_composite(img, foreground)

    # Apply circular mask
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse([0, 0, size - 1, size - 1], fill=255)

    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    result.paste(img, mask=mask)

    return result


def main():
    # Get the project root directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    res_dir = project_root / "android" / "app" / "src" / "main" / "res"

    # Mipmap sizes for different densities
    # Adaptive icon foreground/background should be 108dp
    # Legacy icons use the standard dp sizes
    mipmap_sizes = {
        "mdpi": {"legacy": 48, "adaptive": 108},
        "hdpi": {"legacy": 72, "adaptive": 162},
        "xhdpi": {"legacy": 96, "adaptive": 216},
        "xxhdpi": {"legacy": 144, "adaptive": 324},
        "xxxhdpi": {"legacy": 192, "adaptive": 432},
    }

    print("Generating SplitDumb app icons...")

    for density, sizes in mipmap_sizes.items():
        mipmap_dir = res_dir / f"mipmap-{density}"
        mipmap_dir.mkdir(parents=True, exist_ok=True)

        legacy_size = sizes["legacy"]
        adaptive_size = sizes["adaptive"]

        # Generate legacy icon
        legacy_icon = create_legacy_icon(legacy_size)
        legacy_path = mipmap_dir / "ic_launcher.png"
        legacy_icon.save(legacy_path, "PNG")
        print(f"  Created {legacy_path} ({legacy_size}x{legacy_size})")

        # Generate round icon
        round_icon = create_round_icon(legacy_size)
        round_path = mipmap_dir / "ic_launcher_round.png"
        round_icon.save(round_path, "PNG")
        print(f"  Created {round_path} ({legacy_size}x{legacy_size})")

        # Generate adaptive foreground
        foreground = create_foreground(adaptive_size)
        foreground_path = mipmap_dir / "ic_launcher_foreground.png"
        foreground.save(foreground_path, "PNG")
        print(f"  Created {foreground_path} ({adaptive_size}x{adaptive_size})")

    # Generate Play Store icon (512x512)
    playstore_icon = create_legacy_icon(512)
    playstore_path = res_dir / "playstore-icon.png"
    playstore_icon.save(playstore_path, "PNG")
    print(f"  Created {playstore_path} (512x512)")

    # Update background color
    values_dir = res_dir / "values"
    values_dir.mkdir(parents=True, exist_ok=True)
    bg_color_xml = values_dir / "ic_launcher_background.xml"
    bg_color_xml.write_text('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0a0e27</color>
</resources>
''')
    print(f"  Updated {bg_color_xml}")

    print("\nDone! All icons generated successfully.")


if __name__ == "__main__":
    main()
