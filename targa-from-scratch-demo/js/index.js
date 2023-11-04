// src/types.ts
var ImageType = /* @__PURE__ */ ((ImageType2) => {
  ImageType2[ImageType2["NO_IMAGE_DATA"] = 0] = "NO_IMAGE_DATA";
  ImageType2[ImageType2["COLOR_MAPPED"] = 1] = "COLOR_MAPPED";
  ImageType2[ImageType2["TRUE_COLOR"] = 2] = "TRUE_COLOR";
  ImageType2[ImageType2["GRAY_SCALE"] = 3] = "GRAY_SCALE";
  ImageType2[ImageType2["RUN_LENGTH_ENCODED_COLOR_MAPPED"] = 9] = "RUN_LENGTH_ENCODED_COLOR_MAPPED";
  ImageType2[ImageType2["RUN_LENGTH_ENCODED_TRUE_COLOR"] = 10] = "RUN_LENGTH_ENCODED_TRUE_COLOR";
  ImageType2[ImageType2["RUN_LENGTH_ENCODED_GRAY_SCALE"] = 11] = "RUN_LENGTH_ENCODED_GRAY_SCALE";
  return ImageType2;
})(ImageType || {});

// src/utils.ts
function readFile(file) {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.addEventListener("load", () => {
      const result = fileReader.result;
      resolve(result);
    });
    fileReader.addEventListener("error", reject);
    fileReader.readAsArrayBuffer(file);
  });
}
function capitalize(str) {
  return str.replace(/\b(\w)/g, (_, group1) => {
    return group1.toUpperCase();
  });
}
function generateImageInformationTable(tga) {
  const stats = {
    version: tga.stats.version,
    imageType: capitalize(ImageType[tga.stats.imageType].toLowerCase().replace(/_/g, " ")),
    xOrigin: tga.stats.xOrigin,
    yOrigin: tga.stats.yOrigin,
    imageWidth: tga.stats.imageWidth,
    imageHeight: tga.stats.imageHeight,
    pixelSize: tga.stats.pixelSize,
    imageDescriptor: tga.stats.imageDescriptor.toString(2).padStart(8, "0"),
    imageIdentificationFieldLength: tga.stats.imageIdentificationFieldLength,
    topToBottom: tga.stats.isTopToBottom(),
    colorMapOrigin: tga.stats.colorMapOrigin,
    colorMapLength: tga.stats.colorMapLength,
    colorMapPixelSize: tga.stats.colorMapPixelSize,
    processingTook: `${tga.stats.duration} ms`
  };
  const rows = {};
  for (const [key, value] of Object.entries(stats)) {
    const firsCharacter = key[0];
    const field = `${firsCharacter.toUpperCase()}${key.replace(/(?!\b[A-Z])([A-Z])/g, " $1").substring(1)}`;
    if (typeof value === "boolean") {
      rows[field] = value ? "Yes" : "No";
      continue;
    }
    rows[field] = value;
  }
  return rows;
}

// src/ImageStats.ts
var ImageStats = class {
  #arrayBuffer;
  dataView;
  bytes;
  rleEncoded = false;
  colorMapType;
  imageType;
  xOrigin;
  yOrigin;
  imageWidth;
  imageHeight;
  pixelSize;
  imageDescriptor;
  imageIdentificationFieldLength;
  imageDataFieldOffset;
  colorMapOrigin;
  colorMapLength;
  colorMapPixelSize;
  extensionOffset;
  version;
  topToBottom;
  duration = 0;
  get arrayBuffer() {
    return this.#arrayBuffer;
  }
  set arrayBuffer(arrayBuffer) {
    this.#arrayBuffer = arrayBuffer;
    this.dataView = new DataView(arrayBuffer);
    this.bytes = new Uint8Array(arrayBuffer);
  }
  constructor(arrayBuffer) {
    this.arrayBuffer = arrayBuffer;
    this.imageIdentificationFieldLength = this.bytes[0];
    this.colorMapType = this.bytes[1];
    this.imageType = this.bytes[2];
    this.colorMapOrigin = this.dataView.getUint16(3, true);
    this.colorMapLength = this.dataView.getUint16(5, true);
    this.colorMapPixelSize = this.bytes[7] / 8;
    this.xOrigin = this.bytes[8];
    this.yOrigin = this.bytes[10];
    this.imageWidth = this.dataView.getUint16(12, true);
    this.imageHeight = this.dataView.getUint16(14, true);
    this.pixelSize = this.bytes[16] / 8;
    this.imageDescriptor = this.bytes[17];
    this.imageDataFieldOffset = this.getImageDataFieldOffset();
    this.detectVersion();
    if (this.version === 2) {
      this.extensionOffset = this.dataView.getUint32(this.dataView.byteLength - 26, true);
    }
    this.topToBottom = this.isTopToBottom();
    if (this.imageType === 9 /* RUN_LENGTH_ENCODED_COLOR_MAPPED */ || this.imageType === 11 /* RUN_LENGTH_ENCODED_GRAY_SCALE */ || this.imageType === 10 /* RUN_LENGTH_ENCODED_TRUE_COLOR */) {
      this.rleEncoded = true;
    }
  }
  getImageDataFieldOffset() {
    switch (this.colorMapType) {
      case 0:
        return 18 + this.imageIdentificationFieldLength;
      case 1:
        return 18 + this.imageIdentificationFieldLength + this.colorMapLength * this.colorMapPixelSize;
      default:
        throw new Error(`Color Map Type "${this.colorMapType}" is not supported!`);
    }
  }
  detectVersion() {
    const v2Footer = "TRUEVISION-XFILE.\0";
    const footer = this.arrayBuffer.slice(-18);
    const textDecoder = new TextDecoder();
    const footerStr = textDecoder.decode(footer);
    this.version = footerStr === v2Footer ? 2 : 1;
  }
  isTopToBottom() {
    return (this.imageDescriptor & 16 /* TOP_TO_BOTTOM */) === 16 /* TOP_TO_BOTTOM */;
  }
  getFooterOffset() {
    if (this.version === 2) {
      if (this.extensionOffset !== 0) {
        return this.extensionOffset;
      }
      return this.arrayBuffer.byteLength - 26;
    }
    return this.arrayBuffer.byteLength;
  }
};

// src/TGAImage.ts
var TGAImage = class _TGAImage {
  static GRID_SIZE = 30;
  #arrayBuffer;
  dataView;
  bytes;
  imageDataBytes;
  stats;
  get arrayBuffer() {
    return this.#arrayBuffer;
  }
  set arrayBuffer(arrayBuffer) {
    this.#arrayBuffer = arrayBuffer;
    this.dataView = new DataView(arrayBuffer);
    this.bytes = new Uint8Array(arrayBuffer);
  }
  constructor(arrayBuffer) {
    this.arrayBuffer = arrayBuffer;
    this.stats = new ImageStats(arrayBuffer);
    if (this.stats.rleEncoded) {
      this.imageDataBytes = this.bytes.subarray(
        this.stats.imageDataFieldOffset,
        this.stats.getFooterOffset()
      );
    } else {
      this.imageDataBytes = this.bytes.subarray(this.stats.imageDataFieldOffset);
    }
  }
  drawUncompressedGrayscale(imageData) {
    console.time("uncompressed loop");
    const { imageHeight, imageWidth, topToBottom } = this.stats;
    const { data } = imageData;
    const { imageDataBytes } = this;
    data.fill(255);
    for (let y = 0; y < imageHeight; ++y) {
      for (let x = 0; x < imageWidth; ++x) {
        const canvasOffset = topToBottom ? y * imageWidth * 4 + x * 4 : (imageHeight - y - 1) * imageWidth * 4 + x * 4;
        const byteOffset = x + y * imageWidth;
        data[canvasOffset] = imageDataBytes[byteOffset];
        data[canvasOffset + 1] = imageDataBytes[byteOffset];
        data[canvasOffset + 2] = imageDataBytes[byteOffset];
      }
    }
    console.timeEnd("uncompressed loop");
  }
  drawUncompressed(imageData) {
    console.time("uncompressed loop");
    const { imageHeight, imageWidth, pixelSize, topToBottom } = this.stats;
    const { data } = imageData;
    const { imageDataBytes } = this;
    for (let y = 0; y < imageHeight; ++y) {
      for (let x = 0; x < imageWidth; ++x) {
        const canvasOffset = topToBottom ? y * imageWidth * 4 + x * 4 : (imageHeight - y - 1) * imageWidth * 4 + x * 4;
        data[canvasOffset + 3] = 255;
        switch (pixelSize) {
          case 3: {
            const byteOffset = y * imageWidth * 3 + x * 3;
            data[canvasOffset] = imageDataBytes[byteOffset + 2];
            data[canvasOffset + 1] = imageDataBytes[byteOffset + 1];
            data[canvasOffset + 2] = imageDataBytes[byteOffset];
            break;
          }
          case 4: {
            const byteOffset = y * imageWidth * 4 + x * 4;
            data[canvasOffset] = imageDataBytes[byteOffset + 3];
            data[canvasOffset + 1] = imageDataBytes[byteOffset + 2];
            data[canvasOffset + 2] = imageDataBytes[byteOffset + 1];
            data[canvasOffset + 3] = imageDataBytes[byteOffset];
            break;
          }
        }
      }
    }
    console.timeEnd("uncompressed loop");
  }
  drawRunLengthEncoded(imageData) {
    console.time("run length encoded loop");
    const { imageHeight, imageWidth, pixelSize, topToBottom } = this.stats;
    const { data } = imageData;
    const { imageDataBytes, dataView } = this;
    const readArrayLength = imageDataBytes.length;
    let readCursor = 0;
    let x = 0;
    let y = 0;
    let byte1;
    let byte2;
    let byte3;
    let byte4;
    for (let i = 0; i < readArrayLength; ++i) {
      const packet = imageDataBytes[readCursor++];
      if (packet >= 128) {
        const repetition = packet - 128;
        byte1 = imageDataBytes[readCursor++];
        if (pixelSize > 2) {
          byte2 = imageDataBytes[readCursor++];
          byte3 = imageDataBytes[readCursor++];
        }
        if (pixelSize > 3) {
          byte4 = imageDataBytes[readCursor++];
        }
        for (let i2 = 0; i2 <= repetition; ++i2) {
          const canvasOffset = topToBottom ? y * imageWidth * 4 + x * 4 : (imageHeight - y - 1) * imageWidth * 4 + x * 4;
          data[canvasOffset + 3] = 255;
          switch (pixelSize) {
            case 1: {
              data[canvasOffset] = byte1;
              data[canvasOffset + 1] = byte1;
              data[canvasOffset + 2] = byte1;
              break;
            }
            case 3: {
              data[canvasOffset] = byte3;
              data[canvasOffset + 1] = byte2;
              data[canvasOffset + 2] = byte1;
              break;
            }
            case 4: {
              data[canvasOffset] = byte3;
              data[canvasOffset + 1] = byte2;
              data[canvasOffset + 2] = byte1;
              data[canvasOffset + 3] = byte4;
              break;
            }
          }
          if (x === imageWidth - 1) {
            x = 0;
            y += 1;
          } else {
            x += 1;
          }
        }
      } else {
        const repetition = packet;
        for (let i2 = 0; i2 <= repetition; ++i2) {
          const canvasOffset = topToBottom ? y * imageWidth * 4 + x * 4 : (imageHeight - y - 1) * imageWidth * 4 + x * 4;
          data[canvasOffset + 3] = 255;
          switch (pixelSize) {
            case 1: {
              data[canvasOffset] = imageDataBytes[readCursor];
              data[canvasOffset + 1] = imageDataBytes[readCursor];
              data[canvasOffset + 2] = imageDataBytes[readCursor];
              readCursor += 1;
              break;
            }
            case 3: {
              data[canvasOffset] = imageDataBytes[readCursor + 2];
              data[canvasOffset + 1] = imageDataBytes[readCursor + 1];
              data[canvasOffset + 2] = imageDataBytes[readCursor];
              readCursor += 3;
              break;
            }
            case 4: {
              data[canvasOffset] = imageDataBytes[readCursor + 2];
              data[canvasOffset + 1] = imageDataBytes[readCursor + 1];
              data[canvasOffset + 2] = imageDataBytes[readCursor];
              data[canvasOffset + 3] = imageDataBytes[readCursor + 3];
              readCursor += 4;
              break;
            }
          }
          if (x === imageWidth - 1) {
            x = 0;
            y += 1;
          } else {
            x += 1;
          }
        }
      }
    }
    console.timeEnd("run length encoded loop");
  }
  drawColorMapped(imageData) {
    console.time("color mapped loop");
    const {
      imageHeight,
      imageWidth,
      pixelSize,
      topToBottom,
      colorMapPixelSize,
      colorMapOrigin,
      imageIdentificationFieldLength,
      imageDataFieldOffset
    } = this.stats;
    const { data } = imageData;
    const { imageDataBytes, bytes, dataView } = this;
    const padding = 18 + imageIdentificationFieldLength + colorMapOrigin;
    for (let y = 0; y < imageHeight; ++y) {
      for (let x = 0; x < imageWidth; ++x) {
        const canvasOffset = topToBottom ? y * imageWidth * 4 + x * 4 : (imageHeight - y - 1) * imageWidth * 4 + x * 4;
        data[canvasOffset + 3] = 255;
        const byteOffset = y * imageWidth * pixelSize + x * pixelSize;
        const colorMapEntryOffset = padding + colorMapPixelSize * (pixelSize === 1 ? imageDataBytes[byteOffset] : dataView.getUint16(imageDataFieldOffset + byteOffset, true));
        switch (colorMapPixelSize) {
          case 1: {
            data[canvasOffset] = bytes[colorMapEntryOffset];
            data[canvasOffset + 1] = bytes[colorMapEntryOffset];
            data[canvasOffset + 2] = bytes[colorMapEntryOffset];
            break;
          }
          case 3: {
            data[canvasOffset] = bytes[colorMapEntryOffset + 2];
            data[canvasOffset + 1] = bytes[colorMapEntryOffset + 1];
            data[canvasOffset + 2] = bytes[colorMapEntryOffset];
            break;
          }
          case 4: {
            data[canvasOffset] = bytes[colorMapEntryOffset + 2];
            data[canvasOffset + 1] = bytes[colorMapEntryOffset + 1];
            data[canvasOffset + 2] = bytes[colorMapEntryOffset];
            data[canvasOffset + 3] = bytes[colorMapEntryOffset + 3];
            break;
          }
        }
      }
    }
    console.timeEnd("color mapped loop");
  }
  drawRunLengthEncodedColorMapped(imageData) {
    console.time("run length encoded color mapped loop");
    const { imageHeight, imageWidth, pixelSize, topToBottom, imageIdentificationFieldLength, colorMapOrigin, imageDataFieldOffset, colorMapPixelSize } = this.stats;
    const { data } = imageData;
    const { imageDataBytes, bytes, dataView } = this;
    const readArrayLength = imageDataBytes.length;
    const padding = 18 + imageIdentificationFieldLength + colorMapOrigin;
    let readCursor = 0;
    let x = 0;
    let y = 0;
    let byte1 = 0;
    let byte2 = 0;
    let byte3 = 0;
    let byte4 = 0;
    let colorMapEntryOffset = 0;
    for (let i = 0; i < readArrayLength; ++i) {
      const packet = imageDataBytes[readCursor++];
      if (packet >= 128) {
        if (pixelSize === 1) {
          colorMapEntryOffset = padding + colorMapPixelSize * imageDataBytes[readCursor++];
        } else {
          colorMapEntryOffset = padding + colorMapPixelSize * dataView.getUint16(imageDataFieldOffset + readCursor, true);
          readCursor += 2;
        }
        const repetition = packet - 128;
        byte1 = bytes[colorMapEntryOffset];
        if (colorMapPixelSize > 2) {
          byte2 = bytes[colorMapEntryOffset + 1];
          byte3 = bytes[colorMapEntryOffset + 2];
        }
        if (colorMapPixelSize > 3) {
          byte4 = bytes[colorMapEntryOffset + 3];
        }
        for (let i2 = 0; i2 <= repetition; ++i2) {
          const canvasOffset = topToBottom ? y * imageWidth * 4 + x * 4 : (imageHeight - y - 1) * imageWidth * 4 + x * 4;
          data[canvasOffset + 3] = 255;
          switch (colorMapPixelSize) {
            case 1: {
              data[canvasOffset] = byte1;
              data[canvasOffset + 1] = byte1;
              data[canvasOffset + 2] = byte1;
              break;
            }
            case 3: {
              data[canvasOffset] = byte3;
              data[canvasOffset + 1] = byte2;
              data[canvasOffset + 2] = byte1;
              break;
            }
            case 4: {
              data[canvasOffset] = byte3;
              data[canvasOffset + 1] = byte2;
              data[canvasOffset + 2] = byte1;
              data[canvasOffset + 3] = byte4;
              break;
            }
          }
          if (x === imageWidth - 1) {
            x = 0;
            y += 1;
          } else {
            x += 1;
          }
        }
      } else {
        const repetition = packet;
        for (let i2 = 0; i2 <= repetition; ++i2) {
          const canvasOffset = topToBottom ? y * imageWidth * 4 + x * 4 : (imageHeight - y - 1) * imageWidth * 4 + x * 4;
          if (pixelSize === 1) {
            colorMapEntryOffset = padding + colorMapPixelSize * imageDataBytes[readCursor++];
          } else {
            colorMapEntryOffset = padding + colorMapPixelSize * dataView.getUint16(imageDataFieldOffset + readCursor, true);
            readCursor += 2;
          }
          data[canvasOffset + 3] = 255;
          switch (colorMapPixelSize) {
            case 1: {
              data[canvasOffset] = bytes[colorMapEntryOffset];
              data[canvasOffset + 1] = bytes[colorMapEntryOffset];
              data[canvasOffset + 2] = bytes[colorMapEntryOffset];
              break;
            }
            case 3: {
              data[canvasOffset] = bytes[colorMapEntryOffset + 2];
              data[canvasOffset + 1] = bytes[colorMapEntryOffset + 1];
              data[canvasOffset + 2] = bytes[colorMapEntryOffset];
              break;
            }
            case 4: {
              data[canvasOffset] = bytes[colorMapEntryOffset + 2];
              data[canvasOffset + 1] = bytes[colorMapEntryOffset + 1];
              data[canvasOffset + 2] = bytes[colorMapEntryOffset];
              data[canvasOffset + 3] = bytes[colorMapEntryOffset + 3];
              break;
            }
          }
          if (x === imageWidth - 1) {
            x = 0;
            y += 1;
          } else {
            x += 1;
          }
        }
      }
    }
    console.timeEnd("run length encoded color mapped loop");
  }
  async draw(canvas2) {
    console.time("draw");
    const context = canvas2.getContext("2d");
    if (!context) {
      alert("Failed to get canvas context");
      return;
    }
    context.clearRect(0, 0, canvas2.width, canvas2.height);
    canvas2.width = this.stats.imageWidth;
    canvas2.height = this.stats.imageHeight;
    context.fillStyle = "rgba(40, 40, 40, 255)";
    context.fillRect(0, 0, canvas2.width, canvas2.height);
    const imageData = context.createImageData(this.stats.imageWidth, this.stats.imageHeight);
    const begin = performance.now();
    if (this.stats.rleEncoded) {
      if (this.stats.imageType === 9 /* RUN_LENGTH_ENCODED_COLOR_MAPPED */) {
        this.drawRunLengthEncodedColorMapped(imageData);
      } else {
        this.drawRunLengthEncoded(imageData);
      }
    } else {
      if (this.stats.imageType === 1 /* COLOR_MAPPED */) {
        this.drawColorMapped(imageData);
      } else {
        if (this.stats.pixelSize === 1) {
          this.drawUncompressedGrayscale(imageData);
        } else {
          this.drawUncompressed(imageData);
        }
      }
    }
    if (this.stats.pixelSize === 4) {
      const { GRID_SIZE } = _TGAImage;
      const { imageWidth, imageHeight } = this.stats;
      let evenRow = 0;
      for (let y = 0; y < imageHeight; y += GRID_SIZE) {
        let evenColumn = 0;
        for (let x = 0; x < imageWidth; x += GRID_SIZE) {
          context.fillStyle = evenRow ^ evenColumn ? "rgba(180, 180, 180, 1)" : "rgba(100, 100, 100, 1)";
          context.fillRect(x, y, GRID_SIZE, GRID_SIZE);
          evenColumn = evenColumn === 1 ? 0 : 1;
        }
        evenRow = evenRow === 1 ? 0 : 1;
      }
      const bitmap = await createImageBitmap(imageData, { premultiplyAlpha: "premultiply" });
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
    } else {
      context.putImageData(imageData, 0, 0);
    }
    this.stats.duration = performance.now() - begin;
    console.info(this.stats.duration);
    console.timeEnd("draw");
  }
};

// src/index.ts
new EventSource("/esbuild").addEventListener("change", () => location.reload());
var fileInput = document.querySelector("input[type=file]");
var canvas = document.querySelector("canvas");
var table = document.querySelector("table");
var template = document.querySelector("#row");
function populateStatsTable(tga) {
  table.innerHTML = "";
  const rows = generateImageInformationTable(tga);
  for (const [key, value] of Object.entries(rows)) {
    const clone = template.content.cloneNode(true);
    const tds = clone.querySelectorAll("td");
    tds[0].innerText = key;
    tds[1].innerText = value;
    table.appendChild(clone);
  }
  console.table(rows);
}
async function drawToCanvas() {
  try {
    const { files } = fileInput;
    if (!files?.length) {
      return;
    }
    const file = files.item(0);
    if (!file)
      return;
    const arrayBuffer = await readFile(file);
    const tga = new TGAImage(arrayBuffer);
    tga.draw(canvas).then(() => {
      populateStatsTable(tga);
    }).catch(console.trace);
  } catch (ex) {
    alert(ex.message);
  }
}
fileInput.addEventListener("change", () => {
  drawToCanvas();
});
