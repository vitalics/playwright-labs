declare module "bezier-js" {
  interface Point {
    x: number;
    y: number;
    t?: number;
  }

  export class Bezier {
    constructor(...points: Point[]);
    /** Returns `n+1` equidistant points along the curve (look-up table). */
    getLUT(steps?: number): Point[];
    /** Approximate arc length of the curve. */
    length(): number;
  }
}
