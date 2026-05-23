export type Point = [number, number];
export type CategoricalPoint = [string, number];
export type AnyPoint = Point | CategoricalPoint;

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

export type Aggregation = 'avg' | 'sum' | 'min' | 'max' | 'last' | 'count';
export type YScale = 'linear' | 'log';
export type Direction = 'vertical' | 'horizontal';

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
  // new options
  aggregation?: Aggregation;
  yScale?: YScale;
  refY?: number;
  direction?: Direction;
}
