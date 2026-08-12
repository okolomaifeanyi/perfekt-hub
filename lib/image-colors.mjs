function clampByte(value) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function rgbToHex(red, green, blue) {
  return `#${[red, green, blue]
    .map(value => clampByte(value).toString(16).padStart(2, "0"))
    .join("")}`;
}

function hashString(value) {
  let hash = 0;
  for (const character of String(value ?? "")) {
    hash = (hash << 5) - hash + character.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

function hslToHex(hue, saturation, lightness) {
  const normalizedSaturation = saturation / 100;
  const normalizedLightness = lightness / 100;
  const chroma =
    (1 - Math.abs(2 * normalizedLightness - 1)) * normalizedSaturation;
  const segment = hue / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));

  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment >= 0 && segment < 1) {
    red = chroma;
    green = secondary;
  } else if (segment < 2) {
    red = secondary;
    green = chroma;
  } else if (segment < 3) {
    green = chroma;
    blue = secondary;
  } else if (segment < 4) {
    green = secondary;
    blue = chroma;
  } else if (segment < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  const match = normalizedLightness - chroma / 2;
  return rgbToHex(
    (red + match) * 255,
    (green + match) * 255,
    (blue + match) * 255
  );
}

export function averageColorFromPixels(pixelData) {
  let redTotal = 0;
  let greenTotal = 0;
  let blueTotal = 0;
  let alphaTotal = 0;

  for (let index = 0; index < pixelData.length; index += 4) {
    const alpha = pixelData[index + 3] / 255;
    if (alpha === 0) continue;

    redTotal += pixelData[index] * alpha;
    greenTotal += pixelData[index + 1] * alpha;
    blueTotal += pixelData[index + 2] * alpha;
    alphaTotal += alpha;
  }

  if (!alphaTotal) {
    return "#d1d5db";
  }

  return rgbToHex(
    redTotal / alphaTotal,
    greenTotal / alphaTotal,
    blueTotal / alphaTotal
  );
}

export function fallbackColorFromSrc(src) {
  const normalized = String(src ?? "").trim();
  if (!normalized) {
    return "#d1d5db";
  }

  const hue = hashString(normalized) % 360;
  return hslToHex(hue, 58, 86);
}

export function sampleAverageColorFromImageElement(image) {
  try {
    const canvas = document.createElement("canvas");
    const size = 24;
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return fallbackColorFromSrc(image.currentSrc || image.src);
    }

    context.drawImage(image, 0, 0, size, size);
    const imageData = context.getImageData(0, 0, size, size);
    return averageColorFromPixels(imageData.data);
  } catch {
    return fallbackColorFromSrc(image.currentSrc || image.src);
  }
}

export function sampleAverageColorFromVideoElement(video) {
  try {
    if (!video.videoWidth || !video.videoHeight) {
      return fallbackColorFromSrc(video.currentSrc || video.src);
    }

    const canvas = document.createElement("canvas");
    const size = 24;
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return fallbackColorFromSrc(video.currentSrc || video.src);
    }

    context.drawImage(video, 0, 0, size, size);
    const imageData = context.getImageData(0, 0, size, size);
    return averageColorFromPixels(imageData.data);
  } catch {
    return fallbackColorFromSrc(video.currentSrc || video.src);
  }
}
