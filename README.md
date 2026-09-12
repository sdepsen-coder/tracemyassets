```python
import os
from PIL import Image

def add_watermark(input_image_path, output_image_path, watermark_text):
    """
    Adds a watermark to an image.

    :param input_image_path: Path to the input image file
    :param output_image_path: Path to save the watermarked image
    :param watermark_text: Text to use as the watermark
    """
    original_image = Image.open(input_image_path)
    width, height = original_image.size

    # Create a new image for the watermark with an alpha layer (RGBA)
    watermark_image = Image.new('RGBA', original_image.size, (255, 255, 255, 0))

    # Get a font
    font_size = int(height / 20)
    font = ImageFont.truetype("arial.ttf", font_size)

    # Get a drawing context
    draw = ImageDraw.Draw(watermark_image)

    # Calculate the position for the watermark
    text_width, text_height = draw.textsize(watermark_text, font)
    x = width - text_width - 10
    y = height - text_height - 10

    # Draw the watermark in the bottom right corner
    draw.text((x, y), watermark_text, font=font, fill=(255, 255, 255, 128))

    # Combine the original image with the watermark
    watermarked_image = Image.alpha_composite(original_image.convert('RGBA'), watermark_image)

    # Save the result
    watermarked_image.convert('RGB').save(output_image_path, 'JPEG')

def process_images_in_directory(directory_path, watermark_text):
    """
    Processes all images in a directory, adding a watermark to each.

    :param directory_path: Path to the directory containing images
    :param watermark_text: Text to use as the watermark
    """
    for filename in os.listdir(directory_path):
        if filename.endswith(".jpg") or filename.endswith(".jpeg"):
            input_image_path = os.path.join(directory_path, filename)
            output_image_path = os.path.join(directory_path, f"watermarked_{filename}")
            add_watermark(input_image_path, output_image_path, watermark_text)
            print(f"Watermark added to {filename}")

# Example usage
process_images_in_directory('/path/to/images', 'Sample Watermark')
```