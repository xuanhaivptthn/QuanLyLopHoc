/**
 * Zero-dependency pure TypeScript QR Code SVG Generator (Model 2, Byte mode)
 * Generates crisp, scalable vector SVG for dynamic roll-call QR codes.
 */

// Galois Field GF(256) tables with primitive polynomial 0x11d (285)
const EXP: number[] = new Array(512);
const LOG: number[] = new Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    EXP[i] = EXP[i - 255];
  }
})();

function gMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function polyMul(p1: number[], p2: number[]): number[] {
  const result = new Array(p1.length + p2.length - 1).fill(0);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] ^= gMul(p1[i], p2[j]);
    }
  }
  return result;
}

function getGeneratorPoly(degree: number): number[] {
  let g = [1];
  for (let i = 0; i < degree; i++) {
    g = polyMul(g, [1, EXP[i]]);
  }
  return g;
}

function calculateEcc(data: number[], eccLength: number): number[] {
  const gen = getGeneratorPoly(eccLength);
  const msg = [...data, ...new Array(eccLength).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

// Version table capacities for Level M (Medium Error Correction)
interface VersionSpec {
  version: number;
  totalCodewords: number;
  dataCodewords: number;
  eccCodewords: number;
  blocks: { count: number; dataLen: number }[];
  alignments: number[];
}

const VERSION_SPECS: VersionSpec[] = [
  // Version 1 (21x21)
  { version: 1, totalCodewords: 26, dataCodewords: 16, eccCodewords: 10, blocks: [{ count: 1, dataLen: 16 }], alignments: [] },
  // Version 2 (25x25)
  { version: 2, totalCodewords: 44, dataCodewords: 28, eccCodewords: 16, blocks: [{ count: 1, dataLen: 28 }], alignments: [6, 18] },
  // Version 3 (29x29)
  { version: 3, totalCodewords: 70, dataCodewords: 44, eccCodewords: 26, blocks: [{ count: 1, dataLen: 44 }], alignments: [6, 22] },
  // Version 4 (33x33)
  { version: 4, totalCodewords: 100, dataCodewords: 64, eccCodewords: 36, blocks: [{ count: 2, dataLen: 32 }], alignments: [6, 26] },
  // Version 5 (37x37)
  { version: 5, totalCodewords: 134, dataCodewords: 86, eccCodewords: 48, blocks: [{ count: 2, dataLen: 43 }], alignments: [6, 30] },
  // Version 6 (41x41)
  { version: 6, totalCodewords: 172, dataCodewords: 108, eccCodewords: 64, blocks: [{ count: 4, dataLen: 27 }], alignments: [6, 34] },
];

export function generateQrMatrix(text: string): boolean[][] {
  const encoder = new TextEncoder();
  const utf8Bytes = encoder.encode(text);
  const dataLen = utf8Bytes.length;

  // Find lowest version that fits byte mode with Level M
  let spec = VERSION_SPECS[0];
  for (const s of VERSION_SPECS) {
    // 4 bits mode + 8 bits length for ver 1-9
    const capacityBytes = s.dataCodewords - 2;
    if (dataLen <= capacityBytes) {
      spec = s;
      break;
    }
  }

  // Bit buffer
  const bits: number[] = [];
  const pushBits = (val: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  // 1. Mode indicator: 0100 for Byte mode
  pushBits(0b0100, 4);

  // 2. Character count indicator: 8 bits for versions 1-9
  pushBits(dataLen, 8);

  // 3. Data bytes
  for (const b of utf8Bytes) {
    pushBits(b, 8);
  }

  // 4. Terminator bits: up to 4 zero bits
  const totalDataBits = spec.dataCodewords * 8;
  const termBits = Math.min(4, totalDataBits - bits.length);
  for (let i = 0; i < termBits; i++) bits.push(0);

  // 5. Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // 6. Pad codewords (0xEC, 0x11)
  const dataBytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byteVal = 0;
    for (let j = 0; j < 8; j++) {
      byteVal = (byteVal << 1) | bits[i + j];
    }
    dataBytes.push(byteVal);
  }

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (dataBytes.length < spec.dataCodewords) {
    dataBytes.push(padBytes[padIdx % 2]);
    padIdx++;
  }

  // 7. Error Correction Coding per block
  const eccPerBlock = Math.floor(spec.eccCodewords / spec.blocks.reduce((acc, b) => acc + b.count, 0));
  const dataBlocks: number[][] = [];
  const eccBlocks: number[][] = [];

  let offset = 0;
  for (const block of spec.blocks) {
    for (let c = 0; c < block.count; c++) {
      const slice = dataBytes.slice(offset, offset + block.dataLen);
      offset += block.dataLen;
      dataBlocks.push(slice);
      eccBlocks.push(calculateEcc(slice, eccPerBlock));
    }
  }

  // Interleave data and ECC
  const finalCodewords: number[] = [];
  const maxDataBlockLen = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxDataBlockLen; i++) {
    for (const b of dataBlocks) {
      if (i < b.length) finalCodewords.push(b[i]);
    }
  }
  for (let i = 0; i < eccPerBlock; i++) {
    for (const eb of eccBlocks) {
      if (i < eb.length) finalCodewords.push(eb[i]);
    }
  }

  // Convert codewords to final bitstream
  const finalBits: number[] = [];
  for (const cw of finalCodewords) {
    for (let i = 7; i >= 0; i--) {
      finalBits.push((cw >> i) & 1);
    }
  }

  // Build Matrix
  const size = 17 + spec.version * 4;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const isReserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setFixed = (r: number, c: number, val: boolean) => {
    matrix[r][c] = val;
    isReserved[r][c] = true;
  };

  // Finder Patterns
  const addFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBlack = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
            setFixed(nr, nc, isBlack);
          } else {
            setFixed(nr, nc, false); // Separator
          }
        }
      }
    }
  };

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // Alignment Patterns for Version >= 2
  const alignments = spec.alignments;
  for (let i = 0; i < alignments.length; i++) {
    for (let j = 0; j < alignments.length; j++) {
      const ar = alignments[i];
      const ac = alignments[j];
      // Skip finders
      if (isReserved[ar][ac]) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const isBlack = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
          setFixed(ar + r, ac + c, isBlack);
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const val = i % 2 === 0;
    if (matrix[6][i] === null) setFixed(6, i, val);
    if (matrix[i][6] === null) setFixed(i, 6, val);
  }

  // Dark module
  setFixed(4 * spec.version + 9, 8, true);

  // Reserve format information areas
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) isReserved[8][i] = true;
    if (matrix[i][8] === null) isReserved[i][8] = true;
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[8][i] === null) isReserved[8][i] = true;
    if (matrix[i][8] === null) isReserved[i][8] = true;
  }

  // Place data bits in zigzag upward/downward pattern
  let bitIdx = 0;
  let upwards = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing column
    const cols = [right, right - 1];
    const rows = upwards
      ? Array.from({ length: size }, (_, k) => size - 1 - k)
      : Array.from({ length: size }, (_, k) => k);

    for (const r of rows) {
      for (const c of cols) {
        if (!isReserved[r][c]) {
          const bit = bitIdx < finalBits.length ? finalBits[bitIdx++] : 0;
          // Apply standard Mask 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = (bit ^ (mask ? 1 : 0)) === 1;
        }
      }
    }
    upwards = !upwards;
  }

  // Format info for Level M + Mask 0: 00 (Level M) + 000 (Mask 0) = 00000 with BCH code -> 101010000010010
  const formatInfo = [true, false, true, false, true, false, false, false, false, false, true, false, false, true, false];

  // Write format info to matrix
  // Horizontal top-left
  matrix[8][0] = formatInfo[0];
  matrix[8][1] = formatInfo[1];
  matrix[8][2] = formatInfo[2];
  matrix[8][3] = formatInfo[3];
  matrix[8][4] = formatInfo[4];
  matrix[8][5] = formatInfo[5];
  matrix[8][7] = formatInfo[6];
  matrix[8][8] = formatInfo[7];
  matrix[7][8] = formatInfo[8];
  matrix[5][8] = formatInfo[9];
  matrix[4][8] = formatInfo[10];
  matrix[3][8] = formatInfo[11];
  matrix[2][8] = formatInfo[12];
  matrix[1][8] = formatInfo[13];
  matrix[0][8] = formatInfo[14];

  // Vertical bottom-left & horizontal top-right
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = formatInfo[i];
  }
  for (let i = 0; i < 8; i++) {
    matrix[8][size - 8 + i] = formatInfo[7 + i];
  }

  return matrix.map((row) => row.map((cell) => !!cell));
}
