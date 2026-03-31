import { LevelDef } from "../types";

type PatternPayload = Pick<LevelDef, "width" | "height" | "layout">;

function patternToLevel(rows: string[]): PatternPayload {
  if (rows.length === 0) {
    throw new Error("Pattern rows cannot be empty.");
  }

  const width = rows[0].length;
  const height = rows.length;
  const layout: number[][] = [];

  for (let row = 0; row < height; row++) {
    const line = rows[row];
    if (line.length !== width) {
      throw new Error(`Pattern width mismatch at row ${row}.`);
    }

    const outRow: number[] = [];
    for (let col = 0; col < width; col++) {
      const ch = line[col];
      switch (ch) {
        case "T":
          outRow.push(1);
          break;
        case ".":
          outRow.push(0);
          break;
        case "#":
          outRow.push(-1);
          break;
        case "*":
          outRow.push(-2);
          break;
        case "J":
          outRow.push(-3);
          break;
        default:
          throw new Error(`Unknown pattern token '${ch}' at (${row},${col}).`);
      }
    }

    layout.push(outRow);
  }

  return {
    width,
    height,
    layout,
  };
}

export const LEVELS: LevelDef[] = [
  // 1-7: 3x5 onboarding
  {
    id: 1,
    gravity: "none",
    timerSeconds: 130,
    tileTypeCount: 3,
    tutorialText: "Tap two matching tiles to connect them!",
    ...patternToLevel([
      "TTT",
      "TTT",
      "T.T",
      "TTT",
      "TTT",
    ]),
  },
  {
    id: 2,
    gravity: "none",
    timerSeconds: 126,
    tileTypeCount: 3,
    tutorialText: "Find clear routes with up to two turns.",
    ...patternToLevel([
      "TTT",
      "TTT",
      "T#T",
      "TTT",
      "TTT",
    ]),
  },
  {
    id: 3,
    gravity: "none",
    timerSeconds: 122,
    tileTypeCount: 4,
    ...patternToLevel([
      "TTT",
      "T#T",
      "T.T",
      "T#T",
      "TTT",
    ]),
  },
  {
    id: 4,
    gravity: "none",
    timerSeconds: 118,
    tileTypeCount: 4,
    ...patternToLevel([
      "TTT",
      "T*T",
      "T.T",
      "T*T",
      "TTT",
    ]),
  },
  {
    id: 5,
    gravity: "none",
    timerSeconds: 114,
    tileTypeCount: 4,
    ...patternToLevel([
      "TTT",
      "T#T",
      "*.*",
      "T#T",
      "TTT",
    ]),
  },
  {
    id: 6,
    gravity: "none",
    timerSeconds: 110,
    tileTypeCount: 5,
    ...patternToLevel([
      "TTT",
      "TJT",
      "T.T",
      "TJT",
      "TTT",
    ]),
  },
  {
    id: 7,
    gravity: "none",
    timerSeconds: 106,
    tileTypeCount: 5,
    ...patternToLevel([
      "T#T",
      "T*J",
      "TT.",
      "J*T",
      "T#T",
    ]),
  },

  // 8-15: 4x6 mid game + gravity intro
  {
    id: 8,
    width: 4,
    height: 6,
    gravity: "none",
    timerSeconds: 104,
    tileTypeCount: 5,
  },
  {
    id: 9,
    width: 4,
    height: 6,
    gravity: "none",
    timerSeconds: 102,
    tileTypeCount: 5,
  },
  {
    id: 10,
    gravity: "none",
    timerSeconds: 100,
    tileTypeCount: 5,
    ...patternToLevel([
      "TTTT",
      "T##T",
      "TTTT",
      "TTTT",
      "T##T",
      "TTTT",
    ]),
  },
  {
    id: 11,
    gravity: "none",
    timerSeconds: 98,
    tileTypeCount: 6,
    ...patternToLevel([
      "TTTT",
      "T..T",
      "T##T",
      "TTTT",
      "T..T",
      "TTTT",
    ]),
  },
  {
    id: 12,
    width: 4,
    height: 6,
    gravity: "down",
    timerSeconds: 96,
    tileTypeCount: 6,
    tutorialText: "Tiles now settle with gravity.",
  },
  {
    id: 13,
    width: 4,
    height: 6,
    gravity: "left",
    timerSeconds: 94,
    tileTypeCount: 6,
  },
  {
    id: 14,
    gravity: "up",
    timerSeconds: 92,
    tileTypeCount: 6,
    ...patternToLevel([
      "TTTT",
      "T**T",
      "TTTT",
      "T..T",
      "T##T",
      "TTTT",
    ]),
  },
  {
    id: 15,
    gravity: "down",
    timerSeconds: 90,
    tileTypeCount: 6,
    ...patternToLevel([
      "TTTT",
      "T#*T",
      "T..T",
      "TTTT",
      "T*#T",
      "TTTT",
    ]),
  },

  // 16-23: 5x7 advanced flow
  {
    id: 16,
    gravity: "down",
    timerSeconds: 94,
    tileTypeCount: 6,
    tutorialText: "Frozen tiles unlock when a neighbor pops.",
    ...patternToLevel([
      "TTTTT",
      "TT*TT",
      "TT.TT",
      "TT*TT",
      "TTTTT",
      "TTTTT",
      "TTTTT",
    ]),
  },
  {
    id: 17,
    gravity: "none",
    timerSeconds: 92,
    tileTypeCount: 6,
    ...patternToLevel([
      "TTTTT",
      "T###T",
      "TT.TT",
      "T***T",
      "TTTTT",
      "T...T",
      "TTTTT",
    ]),
  },
  {
    id: 18,
    gravity: "right",
    timerSeconds: 90,
    tileTypeCount: 6,
    ...patternToLevel([
      "TTTTT",
      "TT#TT",
      "TT.TT",
      "TT#TT",
      "TTTTT",
      "T..TT",
      "TTTTT",
    ]),
  },
  {
    id: 19,
    gravity: "down",
    timerSeconds: 88,
    tileTypeCount: 6,
    ...patternToLevel([
      "TT.TT",
      "T**#T",
      "TT.TT",
      "T#**T",
      "TTTTT",
      "TT#TT",
      "TTTTT",
    ]),
  },
  {
    id: 20,
    gravity: "left",
    timerSeconds: 86,
    tileTypeCount: 6,
    ...patternToLevel([
      "TTTTT",
      "T#.#T",
      "TTTTT",
      "T***T",
      "TT.TT",
      "T#.#T",
      "TTTTT",
    ]),
  },
  {
    id: 21,
    gravity: "down",
    timerSeconds: 84,
    tileTypeCount: 7,
    ...patternToLevel([
      "TTTTT",
      "TJ#JT",
      "TT.TT",
      "TTTTT",
      "T#.#T",
      "T...T",
      "TTTTT",
    ]),
  },
  {
    id: 22,
    gravity: "up",
    timerSeconds: 82,
    tileTypeCount: 7,
    ...patternToLevel([
      "TT.TT",
      "TJJJT",
      "TT.TT",
      "T***T",
      "TTTTT",
      "T#.#T",
      "TTTTT",
    ]),
  },
  {
    id: 23,
    gravity: "right",
    timerSeconds: 80,
    tileTypeCount: 7,
    ...patternToLevel([
      "TT.TT",
      "TJ#JT",
      "TT.TT",
      "T***T",
      "TT#TT",
      "TJ.JT",
      "TTTTT",
    ]),
  },

  // 24-30: 6x8 endgame
  {
    id: 24,
    width: 6,
    height: 8,
    gravity: "none",
    timerSeconds: 82,
    tileTypeCount: 7,
  },
  {
    id: 25,
    gravity: "none",
    timerSeconds: 80,
    tileTypeCount: 7,
    ...patternToLevel([
      "TTTTTT",
      "T####T",
      "TT##TT",
      "TTTTTT",
      "TTTTTT",
      "TT##TT",
      "T####T",
      "TTTTTT",
    ]),
  },
  {
    id: 26,
    gravity: "down",
    timerSeconds: 78,
    tileTypeCount: 8,
    ...patternToLevel([
      "TTTTTT",
      "TT**TT",
      "TT##TT",
      "TT..TT",
      "TTTTTT",
      "TT##TT",
      "TT**TT",
      "TTTTTT",
    ]),
  },
  {
    id: 27,
    gravity: "left",
    timerSeconds: 76,
    tileTypeCount: 8,
    ...patternToLevel([
      "TTTTTT",
      "T##JTT",
      "TT**TT",
      "TT..TT",
      "TTTTTT",
      "TT..TT",
      "TT**TT",
      "TTJ##T",
    ]),
  },
  {
    id: 28,
    gravity: "up",
    timerSeconds: 74,
    tileTypeCount: 8,
    ...patternToLevel([
      "TTTTTT",
      "T#J#TT",
      "TT**TT",
      "TJ..JT",
      "TT##TT",
      "TJ..JT",
      "TT**TT",
      "TT#J#T",
    ]),
  },
  {
    id: 29,
    gravity: "right",
    timerSeconds: 72,
    tileTypeCount: 8,
    ...patternToLevel([
      "TTTTTT",
      "T###TT",
      "TT**TT",
      "TTJ#TT",
      "TTTTTT",
      "TT#JTT",
      "TT**TT",
      "TT###T",
    ]),
  },
  {
    id: 30,
    gravity: "down",
    timerSeconds: 74,
    tileTypeCount: 8,
    ...patternToLevel([
      "TTTTTT",
      "T#TT#T",
      "TT*JTT",
      "TT..TT",
      "TT##TT",
      "TT..TT",
      "TTJ*TT",
      "T#TT#T",
    ]),
  },
];

if (LEVELS.length !== 30) {
  throw new Error(`Expected 30 levels, got ${LEVELS.length}.`);
}
