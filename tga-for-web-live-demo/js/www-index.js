// src/lib/types.ts
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
var AttributesType = /* @__PURE__ */ ((AttributesType2) => {
  AttributesType2[AttributesType2["NO_ALPHA_DATA"] = 0] = "NO_ALPHA_DATA";
  AttributesType2[AttributesType2["UNDEFINED_IGNORED"] = 1] = "UNDEFINED_IGNORED";
  AttributesType2[AttributesType2["UNDEFINED_RETAINED"] = 2] = "UNDEFINED_RETAINED";
  AttributesType2[AttributesType2["USEFUL_ALPHA_CHANNEL"] = 3] = "USEFUL_ALPHA_CHANNEL";
  AttributesType2[AttributesType2["PREMULTIPLIED_ALPHA"] = 4] = "PREMULTIPLIED_ALPHA";
  return AttributesType2;
})(AttributesType || {});

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
function getAttributesType(fileInfo) {
  switch (fileInfo.attributesType) {
    case 0 /* NO_ALPHA_DATA */:
      return "No alpha";
    case 1 /* UNDEFINED_IGNORED */:
      return "Undefined; ignored";
    case 2 /* UNDEFINED_RETAINED */:
      return "Undefined; retained";
    case 3 /* USEFUL_ALPHA_CHANNEL */:
      return "Useful alpha channel";
    case 4 /* PREMULTIPLIED_ALPHA */:
      return "Premultiplied alpha";
    default:
      return void 0;
  }
}
function generateImageInformationTable(fileInfo, duration) {
  const attributesType = getAttributesType(fileInfo);
  const stats = {
    version: fileInfo.version,
    imageType: capitalize(ImageType[fileInfo.imageType].toLowerCase().replace(/_/g, " ")),
    xOrigin: fileInfo.xOrigin,
    yOrigin: fileInfo.yOrigin,
    imageWidth: fileInfo.imageWidth,
    imageHeight: fileInfo.imageHeight,
    pixelSize: fileInfo.pixelSize,
    imageDescriptor: fileInfo.imageDescriptor.toString(2).padStart(8, "0"),
    attributesType,
    imageIdentificationFieldLength: fileInfo.imageIdentificationFieldLength,
    topToBottom: fileInfo.isTopToBottom(),
    colorMapOrigin: fileInfo.colorMapOrigin,
    colorMapLength: fileInfo.colorMapLength,
    colorMapPixelSize: fileInfo.colorMapPixelSize,
    extensionOffset: fileInfo.extensionOffset,
    authorName: fileInfo.authorName,
    authorComments: fileInfo.authorComments,
    dateTimeStamp: fileInfo.dateTimeStamp?.toString(),
    jobId: fileInfo.jobId,
    jobTime: fileInfo.jobTime,
    softwareId: fileInfo.softwareId,
    softwareVersion: fileInfo.softwareVersion,
    keyColor: fileInfo.keyColor,
    aspectRatio: fileInfo.aspectRatio,
    gammaValue: fileInfo.gammaValue,
    colorCorrectionOffset: fileInfo.colorCorrectionOffset,
    postageStampOffset: fileInfo.postageStampOffset,
    scanLineOffset: fileInfo.scanLineOffset,
    processingTook: `${duration} ms`
  };
  const rows = {};
  for (const [key, value] of Object.entries(stats)) {
    if (value === void 0) {
      continue;
    }
    const firsCharacter = key[0];
    const field = `${firsCharacter.toUpperCase()}${key.replace(/(?!\b[A-Z])([A-Z])/g, " $1").substring(1)}`;
    if (typeof value === "boolean") {
      rows[field] = value ? "Yes" : "No";
      continue;
    }
    if (key === "keyColor" && fileInfo.keyColor) {
      const { red, green, blue, alpha } = fileInfo.keyColor;
      rows[field] = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
      continue;
    }
    rows[field] = value;
  }
  return rows;
}

// src/lib/ImageFileInfo.ts
var ImageFileInfo = class {
  #arrayBuffer = new ArrayBuffer(0);
  #dataView = new DataView(this.#arrayBuffer);
  #bytes = new Uint8Array(this.#arrayBuffer);
  rleEncoded = false;
  hasTransparency = false;
  colorMapType;
  imageType;
  xOrigin;
  yOrigin;
  imageWidth;
  imageHeight;
  pixelSize;
  pixelSizeRaw;
  imageDescriptor;
  imageIdentificationFieldLength;
  imageDataFieldOffset;
  colorMapOrigin;
  colorMapLength;
  colorMapPixelSize;
  extensionOffset = 0;
  version = 1;
  topToBottom;
  authorName;
  authorComments;
  dateTimeStamp;
  jobId;
  jobTime;
  softwareId;
  softwareVersion;
  keyColor;
  aspectRatio;
  gammaValue;
  colorCorrectionOffset;
  postageStampOffset;
  scanLineOffset;
  attributesType;
  get bytes() {
    return this.#bytes;
  }
  get dataView() {
    return this.#dataView;
  }
  get arrayBuffer() {
    return this.#arrayBuffer;
  }
  set arrayBuffer(arrayBuffer) {
    this.#arrayBuffer = arrayBuffer;
    this.#dataView = new DataView(arrayBuffer);
    this.#bytes = new Uint8Array(arrayBuffer);
  }
  constructor(arrayBuffer) {
    this.arrayBuffer = arrayBuffer;
    this.imageIdentificationFieldLength = this.#bytes[0];
    this.colorMapType = this.#bytes[1];
    this.imageType = this.#bytes[2];
    this.colorMapOrigin = this.#dataView.getUint16(3, true);
    this.colorMapLength = this.#dataView.getUint16(5, true);
    this.colorMapPixelSize = this.#bytes[7] / 8;
    this.xOrigin = this.#bytes[8];
    this.yOrigin = this.#bytes[10];
    this.imageWidth = this.#dataView.getUint16(12, true);
    this.imageHeight = this.#dataView.getUint16(14, true);
    this.pixelSize = this.#bytes[16] / 8;
    this.pixelSizeRaw = this.#bytes[16];
    this.imageDescriptor = this.#bytes[17];
    this.imageDataFieldOffset = this.getImageDataFieldOffset();
    this.detectVersion();
    if (this.version === 2) {
      this.extensionOffset = this.#dataView.getUint32(this.#dataView.byteLength - 26, true);
      if (this.extensionOffset !== 0) {
        this.readExtension();
      }
    }
    this.topToBottom = this.isTopToBottom();
    if (this.imageType === 9 /* RUN_LENGTH_ENCODED_COLOR_MAPPED */ || this.imageType === 11 /* RUN_LENGTH_ENCODED_GRAY_SCALE */ || this.imageType === 10 /* RUN_LENGTH_ENCODED_TRUE_COLOR */) {
      this.rleEncoded = true;
    }
    this.hasTransparency = this.pixelSize === 4 || this.colorMapPixelSize === 4 || this.pixelSize === 2 && (this.imageType === 3 /* GRAY_SCALE */ || this.imageType === 11 /* RUN_LENGTH_ENCODED_GRAY_SCALE */);
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
    return (this.imageDescriptor & 32 /* TOP_TO_BOTTOM */) === 32 /* TOP_TO_BOTTOM */;
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
  readExtension() {
    const extensionSize = this.#dataView.getUint16(this.extensionOffset, true);
    if (extensionSize !== 495) {
      console.warn("Not a valid TGA extension");
      return;
    }
    const EO = this.extensionOffset;
    const textDecoder = new TextDecoder();
    const readString = (startOffset, endOffset) => {
      const buffer = this.#bytes.subarray(startOffset, endOffset);
      return textDecoder.decode(buffer);
    };
    const readShorts = (startOffset, numberOfShortsToRead) => {
      const shorts = [];
      const endOffset = startOffset + numberOfShortsToRead * 2;
      for (let offset = startOffset; offset < endOffset; offset += 2) {
        shorts.push(this.#dataView.getUint16(offset, true));
      }
      return shorts;
    };
    this.authorName = readString(EO + 1, EO + 42);
    this.authorComments = readString(EO + 42, EO + 366);
    this.jobId = readString(EO + 379, EO + 419);
    this.softwareId = readString(EO + 426, EO + 466);
    const softwareVersion = this.#dataView.getUint16(EO + 467, true);
    const softwareVersionLetter = String.fromCharCode(this.#dataView.getUint8(EO + 469));
    const softwareVersionUnused = softwareVersion === 0 && softwareVersionLetter === " ";
    if (!softwareVersionUnused) {
      this.softwareVersion = `${(softwareVersion / 100).toFixed(2)}${softwareVersionLetter}`;
    }
    const [month, day, year, hour, minute, second] = readShorts(EO + 367, 6);
    if (year !== 0) {
      this.dateTimeStamp = new Date(year, month - 1, day, hour, minute, second);
    }
    this.jobTime = "0";
    const jobTimeStrParts = [];
    const jobTimeObject = {
      hour: this.#dataView.getUint16(EO + 420, true),
      minute: this.#dataView.getUint16(EO + 422, true),
      second: this.#dataView.getUint16(EO + 424, true)
    };
    for (const [key, value] of Object.entries(jobTimeObject)) {
      if (value > 1) {
        jobTimeStrParts.push(`${value} ${key}s`);
      } else if (value > 0) {
        jobTimeStrParts.push(`${value} ${key}`);
      }
    }
    this.jobTime = jobTimeStrParts.join(" ");
    const blue = this.#bytes[EO + 470];
    const green = this.#bytes[EO + 471];
    const red = this.#bytes[EO + 472];
    const alpha = this.#bytes[EO + 473];
    this.keyColor = { red, green, blue, alpha };
    const [aspectRatioNumerator, aspectRatioDenominator] = readShorts(EO + 474, 2);
    if (aspectRatioDenominator !== 0) {
      this.aspectRatio = `${aspectRatioNumerator}/${aspectRatioDenominator}`;
    }
    const [gammaNumerator, gammaDenominator] = readShorts(EO + 478, 2);
    if (gammaDenominator !== 0) {
      this.gammaValue = `${gammaNumerator}/${gammaDenominator}`;
    }
    this.colorCorrectionOffset = this.#dataView.getUint32(EO + 482, true);
    this.postageStampOffset = this.#dataView.getUint32(EO + 486, true);
    this.scanLineOffset = this.#dataView.getUint32(EO + 490, true);
    const attr = this.#dataView.getUint8(EO + 494);
    if (AttributesType[attr]) {
      this.attributesType = attr;
    }
  }
};

// src/lib/TGAFile.ts
var TGAFile = class {
  imageDataBytes;
  fileInfo;
  bytes;
  dataView;
  constructor(arrayBuffer) {
    this.fileInfo = new ImageFileInfo(arrayBuffer);
    this.bytes = this.fileInfo.bytes;
    this.dataView = this.fileInfo.dataView;
    if (this.fileInfo.rleEncoded) {
      this.imageDataBytes = this.fileInfo.bytes.subarray(
        this.fileInfo.imageDataFieldOffset,
        this.fileInfo.getFooterOffset()
      );
    } else {
      this.imageDataBytes = this.fileInfo.bytes.subarray(this.fileInfo.imageDataFieldOffset);
    }
  }
};

// src/lib/draw-methods/drawColorMapped.ts
function drawColorMapped(imageData, tgaFile) {
  const {
    imageHeight,
    imageWidth,
    pixelSize,
    colorMapPixelSize,
    colorMapOrigin,
    imageIdentificationFieldLength,
    imageDataFieldOffset,
    imageType
  } = tgaFile.fileInfo;
  const { data } = imageData;
  const { imageDataBytes, bytes, dataView } = tgaFile;
  const padding = 18 + imageIdentificationFieldLength + colorMapOrigin;
  let canvasOffset = 0;
  let byteOffset = 0;
  for (let y = 0; y < imageHeight; ++y) {
    for (let x = 0; x < imageWidth; ++x) {
      const colorMapEntryOffset = padding + colorMapPixelSize * (pixelSize === 1 ? imageDataBytes[byteOffset] : dataView.getUint16(imageDataFieldOffset + byteOffset, true));
      switch (colorMapPixelSize) {
        case 1: {
          data[canvasOffset] = bytes[colorMapEntryOffset];
          data[canvasOffset + 1] = bytes[colorMapEntryOffset];
          data[canvasOffset + 2] = bytes[colorMapEntryOffset];
          break;
        }
        case 2: {
          if (imageType === 3 /* GRAY_SCALE */) {
            data[canvasOffset + 3] = imageDataBytes[colorMapEntryOffset + 1];
          } else {
            const byteValue = dataView.getUint16(colorMapEntryOffset, true);
            data[canvasOffset] = Math.round(((byteValue & 31744) >> 10) / 31 * 255);
            data[canvasOffset + 1] = Math.round(((byteValue & 992) >> 5) / 31 * 255);
            data[canvasOffset + 2] = Math.round((byteValue & 31) / 31 * 255);
          }
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
      canvasOffset += 4;
      byteOffset += pixelSize;
    }
  }
}

// src/lib/draw-methods/drawRunLengthEncoded.ts
function drawRunLengthEncoded(imageData, tgaFile) {
  const { pixelSize, attributesType, imageType } = tgaFile.fileInfo;
  const { data } = imageData;
  const { imageDataBytes } = tgaFile;
  const readArrayLength = imageDataBytes.length;
  const ab = new ArrayBuffer(2);
  const ua = new Uint8Array(ab);
  const dv = new DataView(ab);
  let canvasOffset = 0;
  let hasAlpha = true;
  let readCursor = 0;
  let byte1;
  let byte2;
  let byte3;
  let byte4;
  if (attributesType && attributesType !== 3 /* USEFUL_ALPHA_CHANNEL */ && attributesType !== 4 /* PREMULTIPLIED_ALPHA */) {
    hasAlpha = false;
  }
  for (let i = 0; i < readArrayLength; ++i) {
    const packet = imageDataBytes[readCursor++];
    const isRLEPacket = packet >= 128;
    const repetition = isRLEPacket ? packet - 128 : packet;
    if (isRLEPacket) {
      switch (pixelSize) {
        case 1:
          byte1 = imageDataBytes[readCursor++];
          break;
        case 2:
          byte1 = imageDataBytes[readCursor++];
          byte2 = imageDataBytes[readCursor++];
          if (imageType !== 11 /* RUN_LENGTH_ENCODED_GRAY_SCALE */) {
            ua[0] = byte1;
            ua[1] = byte2;
            const byteValue = dv.getUint16(0, true);
            byte3 = Math.round(((byteValue & 31744) >> 10) / 31 * 255);
            byte2 = Math.round(((byteValue & 992) >> 5) / 31 * 255);
            byte1 = Math.round((byteValue & 31) / 31 * 255);
          }
          break;
        case 3:
          byte1 = imageDataBytes[readCursor++];
          byte2 = imageDataBytes[readCursor++];
          byte3 = imageDataBytes[readCursor++];
          break;
        case 4:
          byte1 = imageDataBytes[readCursor++];
          byte2 = imageDataBytes[readCursor++];
          byte3 = imageDataBytes[readCursor++];
          byte4 = imageDataBytes[readCursor++];
          break;
      }
      for (let j = 0; j <= repetition; ++j) {
        switch (pixelSize) {
          case 1:
            data[canvasOffset] = byte1;
            data[canvasOffset + 1] = byte1;
            data[canvasOffset + 1] = byte1;
            break;
          case 2:
            if (imageType === 11 /* RUN_LENGTH_ENCODED_GRAY_SCALE */) {
              data[canvasOffset] = 0;
              data[canvasOffset + 1] = 0;
              data[canvasOffset + 2] = 0;
              data[canvasOffset + 1] = byte1;
            } else {
              data[canvasOffset + 1] = byte1;
              data[canvasOffset + 1] = byte2;
              data[canvasOffset + 2] = byte1;
            }
            break;
          case 3:
            data[canvasOffset] = byte3;
            data[canvasOffset + 1] = byte2;
            data[canvasOffset + 2] = byte1;
            break;
          case 4:
            data[canvasOffset] = byte3;
            data[canvasOffset + 1] = byte2;
            data[canvasOffset + 2] = byte1;
            if (hasAlpha) {
              data[canvasOffset + 3] = byte4;
            }
            break;
        }
        canvasOffset += 4;
      }
      continue;
    }
    for (let j = 0; j <= repetition; ++j) {
      switch (pixelSize) {
        case 1: {
          data[canvasOffset] = imageDataBytes[readCursor];
          data[canvasOffset + 1] = imageDataBytes[readCursor];
          data[canvasOffset + 2] = imageDataBytes[readCursor];
          readCursor += 1;
          break;
        }
        case 2: {
          if (imageType === 11 /* RUN_LENGTH_ENCODED_GRAY_SCALE */) {
            readCursor += 1;
            data[canvasOffset] = 0;
            data[canvasOffset + 1] = 0;
            data[canvasOffset + 2] = 0;
            data[canvasOffset + 3] = imageDataBytes[readCursor++];
          } else {
            ua[0] = imageDataBytes[readCursor++];
            ua[1] = imageDataBytes[readCursor++];
            const byteValue = dv.getUint16(0, true);
            data[canvasOffset] = Math.round(((byteValue & 31744) >> 10) / 31 * 255);
            data[canvasOffset + 1] = Math.round(((byteValue & 992) >> 5) / 31 * 255);
            data[canvasOffset + 2] = Math.round((byteValue & 31) / 31 * 255);
          }
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
          if (hasAlpha) {
            data[canvasOffset + 3] = imageDataBytes[readCursor + 3];
          }
          readCursor += 4;
          break;
        }
      }
      canvasOffset += 4;
    }
  }
}

// src/lib/draw-methods/drawRunLengthEncodedColorMapped.ts
function drawRunLengthEncodedColorMapped(imageData, tgaFile) {
  const { pixelSize, imageIdentificationFieldLength, colorMapOrigin, imageDataFieldOffset, colorMapPixelSize, imageType } = tgaFile.fileInfo;
  const { data } = imageData;
  const { imageDataBytes, bytes, dataView } = tgaFile;
  const readArrayLength = imageDataBytes.length;
  const padding = 18 + imageIdentificationFieldLength + colorMapOrigin;
  let canvasOffset = 0;
  let readCursor = 0;
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
      if (colorMapPixelSize === 2) {
        if (imageType === 3 /* GRAY_SCALE */) {
          byte4 = imageDataBytes[colorMapEntryOffset + 1];
        } else {
          const byteValue = dataView.getUint16(colorMapEntryOffset, true);
          byte3 = Math.round(((byteValue & 31744) >> 10) / 31 * 255);
          byte2 = Math.round(((byteValue & 992) >> 5) / 31 * 255);
          byte1 = Math.round((byteValue & 31) / 31 * 255);
        }
      }
      for (let i2 = 0; i2 <= repetition; ++i2) {
        switch (colorMapPixelSize) {
          case 1: {
            data[canvasOffset] = byte1;
            data[canvasOffset + 1] = byte1;
            data[canvasOffset + 2] = byte1;
            break;
          }
          case 2: {
            if (imageType === 3 /* GRAY_SCALE */) {
              data[canvasOffset + 3] = byte4;
            } else {
              data[canvasOffset] = byte3;
              data[canvasOffset + 1] = byte2;
              data[canvasOffset + 2] = byte1;
            }
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
        canvasOffset += 4;
      }
    } else {
      const repetition = packet;
      for (let i2 = 0; i2 <= repetition; ++i2) {
        if (pixelSize === 1) {
          colorMapEntryOffset = padding + colorMapPixelSize * imageDataBytes[readCursor++];
        } else {
          colorMapEntryOffset = padding + colorMapPixelSize * dataView.getUint16(imageDataFieldOffset + readCursor, true);
          readCursor += 2;
        }
        switch (colorMapPixelSize) {
          case 1: {
            data[canvasOffset] = bytes[colorMapEntryOffset];
            data[canvasOffset + 1] = bytes[colorMapEntryOffset];
            data[canvasOffset + 2] = bytes[colorMapEntryOffset];
            break;
          }
          case 2: {
            const byteValue = dataView.getUint16(colorMapEntryOffset, true);
            data[canvasOffset] = Math.round(((byteValue & 31744) >> 10) / 31 * 255);
            data[canvasOffset + 1] = Math.round(((byteValue & 992) >> 5) / 31 * 255);
            data[canvasOffset + 2] = Math.round((byteValue & 31) / 31 * 255);
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
        canvasOffset += 4;
      }
    }
  }
}

// src/lib/draw-methods/drawUncompressed.ts
function drawUncompressed(imageData, tgaFile) {
  const { imageHeight, imageWidth, pixelSize, attributesType, imageType, imageDataFieldOffset } = tgaFile.fileInfo;
  const { data } = imageData;
  const { imageDataBytes, dataView } = tgaFile;
  let byteOffset = 0;
  let canvasOffset = 0;
  let hasAlpha = true;
  if (attributesType && attributesType !== 3 /* USEFUL_ALPHA_CHANNEL */ && attributesType !== 4 /* PREMULTIPLIED_ALPHA */) {
    hasAlpha = false;
  }
  for (let y = 0; y < imageHeight; ++y) {
    for (let x = 0; x < imageWidth; ++x) {
      switch (pixelSize) {
        case 2: {
          if (imageType === 3 /* GRAY_SCALE */) {
            data[canvasOffset] = 0;
            data[canvasOffset + 1] = 0;
            data[canvasOffset + 2] = 0;
            data[canvasOffset + 3] = imageDataBytes[byteOffset + 1];
          } else {
            const byteValue = dataView.getUint16(imageDataFieldOffset + byteOffset, true);
            data[canvasOffset] = Math.round(((byteValue & 31744) >> 10) / 31 * 255);
            data[canvasOffset + 1] = Math.round(((byteValue & 992) >> 5) / 31 * 255);
            data[canvasOffset + 2] = Math.round((byteValue & 31) / 31 * 255);
          }
          break;
        }
        case 3: {
          data[canvasOffset] = imageDataBytes[byteOffset + 2];
          data[canvasOffset + 1] = imageDataBytes[byteOffset + 1];
          data[canvasOffset + 2] = imageDataBytes[byteOffset];
          break;
        }
        case 4: {
          data[canvasOffset] = imageDataBytes[byteOffset + 2];
          data[canvasOffset + 1] = imageDataBytes[byteOffset + 1];
          data[canvasOffset + 2] = imageDataBytes[byteOffset];
          if (hasAlpha) {
            data[canvasOffset + 3] = imageDataBytes[byteOffset + 3];
          }
          break;
        }
      }
      byteOffset += pixelSize;
      canvasOffset += 4;
    }
  }
}

// src/lib/draw-methods/drawUncompressedGrayscale.ts
function drawUncompressedGrayscale(imageData, tgaFile) {
  const { imageHeight, imageWidth, pixelSize } = tgaFile.fileInfo;
  const { data } = imageData;
  const { imageDataBytes } = tgaFile;
  let canvasOffset = 0;
  let byteOffset = 0;
  for (let y = 0; y < imageHeight; ++y) {
    for (let x = 0; x < imageWidth; ++x) {
      switch (pixelSize) {
        case 1: {
          data[canvasOffset] = imageDataBytes[byteOffset];
          data[canvasOffset + 1] = imageDataBytes[byteOffset];
          data[canvasOffset + 2] = imageDataBytes[byteOffset];
          break;
        }
        case 4: {
          data[canvasOffset] = imageDataBytes[byteOffset];
          data[canvasOffset + 1] = imageDataBytes[byteOffset];
          data[canvasOffset + 2] = imageDataBytes[byteOffset];
          break;
        }
        default: {
          alert("Unsupported pixel size");
          return;
        }
      }
      canvasOffset += 4;
      byteOffset += 1;
    }
  }
}

// src/index.ts
function drawTransparencyGrid(params) {
  const { context, imageWidth, imageHeight, gridSize } = params;
  let evenRow = 0;
  for (let y = 0; y < imageHeight; y += gridSize) {
    let evenColumn = 0;
    for (let x = 0; x < imageWidth; x += gridSize) {
      context.fillStyle = evenRow ^ evenColumn ? "rgba(180, 180, 180, 1)" : "rgba(100, 100, 100, 1)";
      context.fillRect(x, y, gridSize, gridSize);
      evenColumn = evenColumn === 1 ? 0 : 1;
    }
    evenRow = evenRow === 1 ? 0 : 1;
  }
}
function resetCanvas(context, imageWidth, imageHeight) {
  context.resetTransform();
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.canvas.width = imageWidth;
  context.canvas.height = imageHeight;
  context.fillStyle = "rgba(40, 40, 40, 255)";
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);
}
function decodeTGA(tgaFile, context) {
  const imageData = context.createImageData(tgaFile.fileInfo.imageWidth, tgaFile.fileInfo.imageHeight);
  imageData.data.fill(255);
  if (tgaFile.fileInfo.rleEncoded) {
    if (tgaFile.fileInfo.imageType === 9 /* RUN_LENGTH_ENCODED_COLOR_MAPPED */) {
      drawRunLengthEncodedColorMapped(imageData, tgaFile);
    } else {
      drawRunLengthEncoded(imageData, tgaFile);
    }
  } else {
    if (tgaFile.fileInfo.imageType === 1 /* COLOR_MAPPED */) {
      drawColorMapped(imageData, tgaFile);
    } else {
      if (tgaFile.fileInfo.pixelSize === 1) {
        drawUncompressedGrayscale(imageData, tgaFile);
      } else {
        drawUncompressed(imageData, tgaFile);
      }
    }
  }
  return imageData;
}
function flipCanvasVertically(context) {
  context.translate(0, context.canvas.height);
  context.scale(1, -1);
}
function drawToCanvas(canvas2, arrayBuffer) {
  const context = canvas2.getContext("2d");
  if (!context) {
    alert("Failed to get canvas context");
    return Promise.reject(new Error("Failed to get canvas context"));
  }
  const start = performance.now();
  const tgaFile = new TGAFile(arrayBuffer);
  resetCanvas(context, tgaFile.fileInfo.imageWidth, tgaFile.fileInfo.imageHeight);
  const imageData = decodeTGA(tgaFile, context);
  if (tgaFile.fileInfo.hasTransparency) {
    const gridSize = Math.floor(Math.min(tgaFile.fileInfo.imageWidth / 5, 30));
    drawTransparencyGrid({
      context,
      gridSize,
      imageWidth: tgaFile.fileInfo.imageWidth,
      imageHeight: tgaFile.fileInfo.imageHeight
    });
  }
  return createImageBitmap(imageData, { premultiplyAlpha: tgaFile.fileInfo.hasTransparency ? "premultiply" : "none" }).then((bitmap) => {
    if (!tgaFile.fileInfo.topToBottom) {
      flipCanvasVertically(context);
    }
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const end = performance.now();
    return { duration: end - start, fileInfo: tgaFile.fileInfo };
  });
}

// src/www-index.ts
new EventSource("/esbuild").addEventListener("change", () => location.reload());
var fileInput = document.querySelector("input[type=file]");
var canvas = document.querySelector("canvas");
var table = document.querySelector("table");
var template = document.querySelector("#row");
function populateStatsTable(fileInfo, duration) {
  table.innerHTML = "";
  const rows = generateImageInformationTable(fileInfo, duration);
  for (const [key, value] of Object.entries(rows)) {
    const clone = template.content.cloneNode(true);
    const tds = clone.querySelectorAll("td");
    tds[0].innerText = key;
    tds[1].innerText = value;
    table.appendChild(clone);
  }
  console.table(rows);
}
async function readFileAndDrawToCanvas() {
  try {
    const { files } = fileInput;
    if (!files?.length) {
      return;
    }
    const file = files.item(0);
    if (!file)
      return;
    const arrayBuffer = await readFile(file);
    const { duration, fileInfo } = await drawToCanvas(canvas, arrayBuffer);
    populateStatsTable(fileInfo, duration);
  } catch (ex) {
    alert(ex.message);
  }
}
fileInput.addEventListener("change", () => {
  readFileAndDrawToCanvas();
});
/** 
 * @license
 * Copyright 2024 Mehmet Baker
 *
 * This file is part of tga-for-web.
 *
 * tga-for-web is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * tga-for-web is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with tga-for-web. If not, see <https://www.gnu.org/licenses/>.
 */
