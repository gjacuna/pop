type Matrix = Color[][];
type Color = [number, number, number];

function getColor(seed: string, x: number, y: number): Color {
  const pos = (x * 16 + y) % 132;
  const charCode = seed.charCodeAt(pos);

  return [(charCode * 17) % 256, (charCode * 31) % 256, (charCode * 71) % 256];
}

function generateMatrix(s: string): Matrix {
  const matrix: Matrix = [];

  for (let x = 0; x < 16; x++) {
    matrix[x] = [];

    for (let y = 0; y < 16; y++) {
      matrix[x][y] = getColor(s, x, y);
    }
  }

  return matrix;
}

function matrixToSVG(matrix: Matrix): string {
  let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">';

  for (let x = 0; x < 16; x++) {
    for (let y = 0; y < 16; y++) {
      const color = matrix[x][y];
      svg += `<rect x="${x * 16}" y="${
        y * 16
      }" width="16" height="16" fill="${`rgb(${color[0]}, ${color[1]}, ${color[2]})`}" />`;
    }
  }

  svg += "</svg>";
  return svg;
}

export function generateSquareSVG(s: string): string {
  console.log(s);
  const matrix = generateMatrix(s);
  return matrixToSVG(matrix);
}
