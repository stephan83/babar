export type Point = [number, number];

export type Color =
  | 'ascii'
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white'
  | 'grey'
  | 'gray';

export interface Options {
  caption?: string;
  color?: Color;
  grid?: Color;
  width?: number;
  height?: number;
  xFractions?: number;
  yFractions?: number;
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}
