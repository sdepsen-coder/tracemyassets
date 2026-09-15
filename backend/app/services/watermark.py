from __future__ import annotations

import hmac
import math
import secrets
import struct
import time
from dataclasses import dataclass

import imagehash
import numpy as np
from numpy.typing import NDArray
from PIL import Image, ImageOps
from scipy.fft import dctn, idctn


# Experimental version-one format.
# Changing these constants can make existing watermarks unreadable.
_MAGIC = b"TMA1"
_BODY = struct.Struct(">4sQQQ16s")
_TAG_BYTES = 32
_REPETITIONS = 3
_BLOCK_SIZE = 8
_STRENGTH = 24.0

_PACKET_BYTES = _BODY.size + _TAG_BYTES
_REQUIRED_BLOCKS = _PACKET_BYTES * 8 * _REPETITIONS

MAX_IMAGE_PIXELS = 25_000_000
MIN_PSNR_DB = 40.0

_LUMA_WEIGHTS = np.array(
    [0.299, 0.587, 0.114],
    dtype=np.float32,
)

UInt8Array = NDArray[np.uint8]
IndexArray = NDArray[np.int64]


class WatermarkError(ValueError):
    """The image or watermark request is not supported."""


class WatermarkCapacityError(WatermarkError):
    """The image has insufficient fully opaque blocks."""


class WatermarkQualityError(WatermarkError):
    """Embedding exceeds the configured distortion limit."""


class WatermarkVerificationError(WatermarkError):
    """The generated watermark failed its own extraction check."""


@dataclass(frozen=True)
class WatermarkPayload:
    asset_id: int
    user_id: int
    timestamp: int
    nonce: str


@dataclass(frozen=True)
class WatermarkResult:
    image: Image.Image
    payload: WatermarkPayload
    psnr_db: float


def _validate_secret(secret: bytes) -> None:
    if not isinstance(secret, bytes) or len(secret) < 32:
        raise WatermarkError(
            "The watermark secret must contain at least 32 bytes."
        )


def _validate_integer(name: str, value: int) -> None:
    if type(value) is not int or not 0 < value < 2**64:
        raise WatermarkError(
            f"{name} must be a positive unsigned 64-bit integer."
        )


def _read_image(image: Image.Image) -> tuple[UInt8Array, bool]:
    width, height = image.size

    if width <= 0 or height <= 0:
        raise WatermarkError("Image dimensions must be positive.")

    if width * height > MAX_IMAGE_PIXELS:
        raise WatermarkError(
            "Image resolution must not exceed 25 megapixels."
        )

    if getattr(image, "is_animated", False):
        raise WatermarkError("Animated images are not supported.")

    if image.mode not in {"RGB", "RGBA", "L", "LA", "P"}:
        raise WatermarkError(
            "Convert the image to 8-bit RGB or RGBA before watermarking."
        )

    with ImageOps.exif_transpose(image) as oriented:
        has_alpha = (
            "A" in oriented.getbands()
            or "transparency" in oriented.info
        )

        with oriented.convert("RGBA") as rgba:
            pixels = np.array(rgba, dtype=np.uint8)

    return pixels, has_alpha


def _positions(
    pixels: UInt8Array,
    secret: bytes,
) -> tuple[IndexArray, IndexArray]:
    height, width = pixels.shape[:2]
    block_rows = height // _BLOCK_SIZE
    block_columns = width // _BLOCK_SIZE

    if block_rows == 0 or block_columns == 0:
        raise WatermarkCapacityError("The image is too small.")

    # Only completely opaque blocks may carry payload bits.
    opaque = (
        pixels[
            : block_rows * _BLOCK_SIZE,
            : block_columns * _BLOCK_SIZE,
            3,
        ]
        == 255
    )

    usable = opaque.reshape(
        block_rows,
        _BLOCK_SIZE,
        block_columns,
        _BLOCK_SIZE,
    ).all(axis=(1, 3))

    candidates = np.flatnonzero(
        usable.reshape(-1)
    ).astype(np.int64)

    count = len(candidates)

    if count < _REQUIRED_BLOCKS:
        raise WatermarkCapacityError(
            f"Watermark requires {_REQUIRED_BLOCKS} fully opaque "
            f"8x8 blocks; this image provides {count}."
        )

    seed = hmac.digest(
        secret,
        b"TMA1/layout/" + struct.pack(">II", width, height),
        "sha256",
    )

    # Deterministic placement independent of random-library versions.
    # This arrangement is not encryption.
    stride = int.from_bytes(seed[:8], "big") % count
    offset = int.from_bytes(seed[8:16], "big") % count

    while math.gcd(stride, count) != 1:
        stride = (stride + 1) % count

    positions = (
        offset
        + stride * np.arange(_REQUIRED_BLOCKS, dtype=np.int64)
    ) % count

    chosen = candidates[positions]

    top = (chosen // block_columns) * _BLOCK_SIZE
    left = (chosen % block_columns) * _BLOCK_SIZE

    row_indices = (
        top[:, None, None]
        + np.arange(_BLOCK_SIZE, dtype=np.int64)[None, :, None]
    )

    column_indices = (
        left[:, None, None]
        + np.arange(_BLOCK_SIZE, dtype=np.int64)[None, None, :]
    )

    return row_indices, column_indices


def _payload_tag(body: bytes, secret: bytes) -> bytes:
    return hmac.digest(
        secret,
        b"TMA1/payload/" + body,
        "sha256",
    )


def extract_watermark(
    image: Image.Image,
    *,
    secret: bytes,
) -> WatermarkPayload | None:
    """
    Return an authenticated payload, or None if no valid payload is found.

    None does not prove that the image never contained a watermark.
    This function does not establish copyright ownership or infringement.
    """
    _validate_secret(secret)
    pixels, _ = _read_image(image)

    try:
        rows, columns = _positions(pixels, secret)
    except WatermarkCapacityError:
        return None

    blocks = pixels[rows, columns, :3].astype(np.float32)
    luminance = blocks @ _LUMA_WEIGHTS

    coefficients = dctn(
        luminance,
        axes=(-2, -1),
        norm="ortho",
    )

    differences = (
        coefficients[:, 3, 4]
        - coefficients[:, 4, 3]
    )

    repeated_bits = (differences > 0).astype(np.uint8)

    votes = repeated_bits.reshape(
        -1,
        _REPETITIONS,
    ).sum(axis=1)

    bits = (votes >= 2).astype(np.uint8)
    packet = np.packbits(bits, bitorder="big").tobytes()

    body = packet[:-_TAG_BYTES]
    received_tag = packet[-_TAG_BYTES:]

    if not hmac.compare_digest(
        received_tag,
        _payload_tag(body, secret),
    ):
        return None

    magic, asset_id, user_id, timestamp, nonce = _BODY.unpack(body)

    if magic != _MAGIC:
        return None

    if asset_id == 0 or user_id == 0 or timestamp == 0:
        return None

    return WatermarkPayload(
        asset_id=asset_id,
        user_id=user_id,
        timestamp=timestamp,
        nonce=nonce.hex(),
    )


def embed_watermark(
    image: Image.Image,
    *,
    asset_id: int,
    user_id: int,
    secret: bytes,
    timestamp: int | None = None,
    min_psnr_db: float = MIN_PSNR_DB,
) -> WatermarkResult:
    """
    Create a new image containing an authenticated frequency-domain payload.

    The input image is not modified. Save the returned image as PNG.
    The caller owns the returned image and must close it after use.

    Cropping, resizing, rotation, lossy compression and watermark removal
    resistance have not been established for this experimental format.
    """
    _validate_secret(secret)
    _validate_integer("asset_id", asset_id)
    _validate_integer("user_id", user_id)

    if timestamp is None:
        timestamp = int(time.time())

    _validate_integer("timestamp", timestamp)

    if not math.isfinite(min_psnr_db) or min_psnr_db < MIN_PSNR_DB:
        raise WatermarkError(
            f"Minimum PSNR must be finite and at least {MIN_PSNR_DB} dB."
        )

    nonce = secrets.token_bytes(16)

    payload = WatermarkPayload(
        asset_id=asset_id,
        user_id=user_id,
        timestamp=timestamp,
        nonce=nonce.hex(),
    )

    body = _BODY.pack(
        _MAGIC,
        asset_id,
        user_id,
        timestamp,
        nonce,
    )

    packet = body + _payload_tag(body, secret)

    bits = np.unpackbits(
        np.frombuffer(packet, dtype=np.uint8),
        bitorder="big",
    )

    repeated_bits = np.repeat(bits, _REPETITIONS)
    directions = repeated_bits.astype(np.float32) * 2.0 - 1.0

    pixels, has_alpha = _read_image(image)
    rows, columns = _positions(pixels, secret)

    blocks = pixels[rows, columns, :3].astype(np.float32)
    luminance = blocks @ _LUMA_WEIGHTS

    coefficients = dctn(
        luminance,
        axes=(-2, -1),
        norm="ortho",
    )

    differences = (
        coefficients[:, 3, 4]
        - coefficients[:, 4, 3]
    )

    adjustment = (
        directions
        * np.maximum(0.0, _STRENGTH - directions * differences)
        / 2.0
    )

    coefficients[:, 3, 4] += adjustment
    coefficients[:, 4, 3] -= adjustment

    modified_luminance = idctn(
        coefficients,
        axes=(-2, -1),
        norm="ortho",
    )

    delta = modified_luminance - luminance

    modified_blocks = np.clip(
        np.rint(blocks + delta[..., None]),
        0,
        255,
    ).astype(np.uint8)

    # Only selected opaque blocks change. All other error terms are zero.
    errors = modified_blocks.astype(np.float32) - blocks
    squared_error = float(
        np.sum(errors * errors, dtype=np.float64)
    )

    opaque_pixels = int(np.count_nonzero(pixels[..., 3] == 255))
    mse = squared_error / (opaque_pixels * 3)

    psnr_db = (
        math.inf
        if mse == 0
        else 10.0 * math.log10((255.0**2) / mse)
    )

    if psnr_db < min_psnr_db:
        raise WatermarkQualityError(
            f"Watermark quality check failed: {psnr_db:.2f} dB "
            f"is below the required {min_psnr_db:.2f} dB."
        )

    output_pixels = pixels.copy()
    output_pixels[rows, columns, :3] = modified_blocks

    output = Image.fromarray(
        output_pixels if has_alpha else output_pixels[..., :3]
    )

    try:
        decoded = extract_watermark(output, secret=secret)

        if decoded != payload:
            raise WatermarkVerificationError(
                "The generated watermark could not be verified."
            )
    except Exception:
        output.close()
        raise

    return WatermarkResult(
        image=output,
        payload=payload,
        psnr_db=psnr_db,
    )


def generate_phash(image: Image.Image) -> str:
    """Generate the same 64-bit pHash format used by ingestion."""
    pixels, _ = _read_image(image)

    with Image.fromarray(pixels[..., :3]) as rgb:
        return str(imagehash.phash(rgb, hash_size=8))