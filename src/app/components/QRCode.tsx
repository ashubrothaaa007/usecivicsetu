import React, { useMemo } from 'react';

// GF(2^8) math for Reed-Solomon Error Correction
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
let cur = 1;
for (let i = 0; i < 255; i++) {
  EXP[i] = cur;
  EXP[i + 255] = cur;
  LOG[cur] = i;
  cur = (cur << 1) ^ (cur >= 128 ? 0x11d : 0);
}

function gmul(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
}

function rsPoly(n: number): number[] {
  let p = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array(p.length + 1).fill(0);
    for (let j = 0; j < p.length; j++) {
      next[j] ^= gmul(p[j], EXP[i]);
      next[j + 1] ^= p[j];
    }
    p = next;
  }
  return p;
}

function rsRemainder(data: number[], poly: number[]): number[] {
  const ecCount = poly.length - 1;
  const rem = new Array(ecCount).fill(0);
  for (const byte of data) {
    const factor = byte ^ rem.shift()!;
    rem.push(0);
    for (let i = 0; i < ecCount; i++) {
      rem[i] ^= gmul(poly[i], factor);
    }
  }
  return rem;
}

// Version table for EC Level M (versions 1-10)
// [totalCodewords, ecCodewordsPerBlock, numBlocksGroup1, dataPerBlockG1, numBlocksG2, dataPerBlockG2]
const EC_M_TABLE = [
  null,
  [26, 10, 1, 16, 0, 0],   // v1: 16 data, 10 ec
  [44, 16, 1, 28, 0, 0],   // v2: 28 data, 16 ec
  [70, 26, 1, 44, 0, 0],   // v3: 44 data, 26 ec
  [100, 18, 2, 32, 0, 0],  // v4: 2 blocks of 32 data, 18 ec = 64 data
  [134, 24, 2, 43, 0, 0],  // v5: 86 data
  [172, 16, 4, 27, 0, 0],  // v6: 108 data
  [196, 18, 4, 31, 0, 0],  // v7: 124 data
  [242, 22, 2, 38, 2, 39], // v8: 154 data
  [292, 22, 3, 36, 2, 37], // v9: 182 data
  [346, 26, 4, 43, 1, 44]  // v10: 216 data
];

const ALIGN_TABLE = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50]
];

export function generateQRMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  const dataLen = bytes.length;

  let version = 1;
  while (version <= 10) {
    const table = EC_M_TABLE[version]!;
    const totalDataCapacity = table[2] * table[3] + table[4] * table[5];
    const headerBits = 4 + (version < 10 ? 8 : 16);
    const neededBits = headerBits + dataLen * 8;
    if (neededBits <= totalDataCapacity * 8) break;
    version++;
  }
  if (version > 10) version = 10;

  const table = EC_M_TABLE[version]!;
  const totalDataBytes = table[2] * table[3] + table[4] * table[5];
  const ecPerBlock = table[1];

  const bits: number[] = [];
  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  }

  // 1. Mode: Byte (0100)
  pushBits(4, 4);
  // 2. Count
  pushBits(dataLen, version < 10 ? 8 : 16);
  // 3. Data
  for (const b of bytes) pushBits(b, 8);

  // 4. Terminator
  const remBits = totalDataBytes * 8 - bits.length;
  pushBits(0, Math.min(4, Math.max(0, remBits)));

  // 5. Pad to multiple of 8
  while (bits.length % 8 !== 0) bits.push(0);

  // 6. Pad bytes
  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    dataCodewords.push(b);
  }
  let padToggle = 0xec;
  while (dataCodewords.length < totalDataBytes) {
    dataCodewords.push(padToggle);
    padToggle = padToggle === 0xec ? 0x11 : 0xec;
  }

  // 7. Error correction
  const blocks: number[][] = [];
  const ecBlocks: number[][] = [];
  const poly = rsPoly(ecPerBlock);
  let offset = 0;

  const b1Count = table[2];
  const b1Len = table[3];
  for (let i = 0; i < b1Count; i++) {
    const block = dataCodewords.slice(offset, offset + b1Len);
    blocks.push(block);
    ecBlocks.push(rsRemainder(block, poly));
    offset += b1Len;
  }

  const b2Count = table[4];
  const b2Len = table[5];
  for (let i = 0; i < b2Count; i++) {
    const block = dataCodewords.slice(offset, offset + b2Len);
    blocks.push(block);
    ecBlocks.push(rsRemainder(block, poly));
    offset += b2Len;
  }

  // 8. Interleave
  const finalCodewords: number[] = [];
  const maxBlockLen = Math.max(b1Len, b2Len || 0);
  for (let i = 0; i < maxBlockLen; i++) {
    for (let b = 0; b < blocks.length; b++) {
      if (i < blocks[b].length) finalCodewords.push(blocks[b][i]);
    }
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (let b = 0; b < ecBlocks.length; b++) {
      finalCodewords.push(ecBlocks[b][i]);
    }
  }

  // 9. Matrix construction
  const size = 21 + 4 * (version - 1);
  const matrix: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  function setModule(r: number, c: number, val: boolean) {
    matrix[r][c] = val;
    isFunction[r][c] = true;
  }

  function placeFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        if (
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          setModule(nr, nc, true);
        } else {
          setModule(nr, nc, false);
        }
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setModule(6, i, i % 2 === 0);
    setModule(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  const aligns = ALIGN_TABLE[version];
  for (const r of aligns) {
    for (const c of aligns) {
      if (isFunction[r][c]) continue;
      for (let y = -2; y <= 2; y++) {
        for (let x = -2; x <= 2; x++) {
          const isEdge = Math.abs(x) === 2 || Math.abs(y) === 2;
          const isCenter = x === 0 && y === 0;
          setModule(r + y, c + x, isEdge || isCenter);
        }
      }
    }
  }

  // Dark module
  setModule(4 * version + 9, 8, true);

  // Reserve format areas
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      isFunction[8][i] = true;
      isFunction[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    isFunction[8][size - 1 - i] = true;
    isFunction[size - 1 - i][8] = true;
  }

  // Place data bits in zigzag
  const allBits: number[] = [];
  for (const b of finalCodewords) {
    for (let i = 7; i >= 0; i--) allBits.push((b >>> i) & 1);
  }

  let bitIdx = 0;
  let upwards = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--;
    const rows: number[] = [];
    for (let r = 0; r < size; r++) rows.push(upwards ? size - 1 - r : r);
    for (const r of rows) {
      for (const c of [right, right - 1]) {
        if (!isFunction[r][c]) {
          matrix[r][c] = bitIdx < allBits.length ? allBits[bitIdx] === 1 : false;
          bitIdx++;
        }
      }
    }
    upwards = !upwards;
  }

  // Apply Mask 0: (row + col) % 2 === 0
  const FORMAT_M_MASK0 = 0b101010000010010;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunction[r][c]) {
        if ((r + c) % 2 === 0) {
          matrix[r][c] = !matrix[r][c];
        }
      }
    }
  }

  // Write format info
  for (let i = 0; i < 15; i++) {
    const bit = ((FORMAT_M_MASK0 >>> (14 - i)) & 1) === 1;
    if (i < 6) matrix[8][i] = bit;
    else if (i === 6) matrix[8][7] = bit;
    else if (i === 7) matrix[8][8] = bit;
    else if (i === 8) matrix[7][8] = bit;
    else matrix[14 - i][8] = bit;

    if (i < 8) matrix[size - 1 - i][8] = bit;
    else matrix[8][size - 15 + i] = bit;
  }

  return matrix;
}

interface QRCodeSVGProps {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
  className?: string;
}

export function QRCodeSVG({
  value,
  size = 200,
  bgColor = '#FFFFFF',
  fgColor = '#000000',
  className = '',
}: QRCodeSVGProps) {
  const matrix = useMemo(() => {
    try {
      return generateQRMatrix(value);
    } catch {
      return [];
    }
  }, [value]);

  if (!matrix.length) {
    return <div style={{ width: size, height: size, background: bgColor }} />;
  }

  const moduleCount = matrix.length;
  const margin = 2;
  const viewBoxSize = moduleCount + margin * 2;

  // Build path string for all dark modules
  let path = '';
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        path += `M${c + margin},${r + margin}h1v1h-1z `;
      }
    }
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', shapeRendering: 'crispEdges' }}
    >
      <rect width={viewBoxSize} height={viewBoxSize} fill={bgColor} />
      <path d={path} fill={fgColor} />
    </svg>
  );
}
