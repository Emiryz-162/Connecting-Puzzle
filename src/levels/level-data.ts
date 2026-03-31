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
  // 1-5: compact onboarding (smaller boards)
  {
    id: 1,
    width: 4,
    height: 4,
    gravity: "none",
    timerSeconds: 125,
    tileTypeCount: 3,
    tutorialText: "Tap two matching tiles to connect them!",
  },
  {
    id: 2,
    width: 4,
    height: 5,
    gravity: "none",
    timerSeconds: 122,
    tileTypeCount: 3,
    tutorialText: "Look for straight and corner paths.",
  },
  {
    id: 3,
    width: 5,
    height: 4,
    gravity: "none",
    timerSeconds: 118,
    tileTypeCount: 4,
  },
  {
    id: 4,
    width: 4,
    height: 6,
    gravity: "none",
    timerSeconds: 114,
    tileTypeCount: 4,
  },
  {
    id: 5,
    width: 5,
    height: 6,
    gravity: "none",
    timerSeconds: 110,
    tileTypeCount: 5,
  },

  // 6-10: no gravity, introduce tighter pathing + solid blockers
  {
    id: 6,
    gravity: "none",
    timerSeconds: 112,
    tileTypeCount: 4,
    ...patternToLevel([
      "TTTTT",
      "TTTTT",
      "TT#TT",
      "TT#TT",
      "TT..T",
      "TTTTT",
    ]),
  },
  {
    id: 7,
    gravity: "none",
    timerSeconds: 110,
    tileTypeCount: 5,
    ...patternToLevel([
      "TTTTT",
      "T..TT",
      "TT#TT",
      "TTTTT",
      "TT#TT",
      "TT.TT",
      "TTTTT",
    ]),
  },
  {
    id: 8,
    gravity: "none",
    timerSeconds: 108,
    tileTypeCount: 5,
    ...patternToLevel([
      "TTTTTT",
      "TT##TT",
      "TT..TT",
      "T####T",
      "TTTTTT",
      "TT..TT",
      "TTTTTT",
    ]),
  },
  {
    id: 9,
    gravity: "none",
    timerSeconds: 106,
    tileTypeCount: 5,
    ...patternToLevel([
      "TTTTTT",
      "T##..T",
      "TTTTTT",
      "TT##TT",
      "TT..TT",
      "TT##TT",
      "T..##T",
      "TTTTTT",
    ]),
  },
  {
    id: 10,
    gravity: "none",
    timerSeconds: 104,
    tileTypeCount: 6,
    ...patternToLevel([
      "TTTTTT",
      "TT##TT",
      "T....T",
      "TT##TT",
      "TTTTTT",
      "TT##TT",
      "T....T",
      "TTTTTT",
    ]),
  },

  // 11-15: gravity introduction, ramp board size up to max height 8
  {
    id: 11,
    width: 5,
    height: 6,
    gravity: "down",
    timerSeconds: 108,
    tileTypeCount: 4,
    tutorialText: "Tiles settle with gravity after each match.",
  },
  {
    id: 12,
    width: 6,
    height: 6,
    gravity: "down",
    timerSeconds: 104,
    tileTypeCount: 5,
  },
  {
    id: 13,
    width: 6,
    height: 7,
    gravity: "down",
    timerSeconds: 100,
    tileTypeCount: 5,
  },
  {
    id: 14,
    width: 6,
    height: 8,
    gravity: "left",
    timerSeconds: 96,
    tileTypeCount: 6,
  },
  {
    id: 15,
    width: 6,
    height: 8,
    gravity: "up",
    timerSeconds: 92,
    tileTypeCount: 6,
  },

  // 16-20: frozen introduction and mixed routing
  {
    id: 16,
    gravity: "down",
    timerSeconds: 98,
    tileTypeCount: 5,
    tutorialText: "Frozen tiles unlock when a neighbor pops.",
    ...patternToLevel([
      "TTTTTT",
      "TT**TT",
      "TT**TT",
      "TTTTTT",
      "TT..TT",
      "TTTTTT",
      "TT..TT",
      "TTTTTT",
    ]),
  },
  {
    id: 17,
    gravity: "none",
    timerSeconds: 96,
    tileTypeCount: 5,
    ...patternToLevel([
      "TTTTTT",
      "TT..TT",
      "TT**TT",
      "TTTTTT",
      "TTTTTT",
      "TT**TT",
      "TT..TT",
      "TTTTTT",
    ]),
  },
  {
    id: 18,
    gravity: "down",
    timerSeconds: 92,
    tileTypeCount: 6,
    ...patternToLevel([
      "TTTTTT",
      "TT##TT",
      "TT**TT",
      "TT..TT",
      "TTTTTT",
      "TT..TT",
      "TT**TT",
      "TT##TT",
    ]),
  },
  {
    id: 19,
    gravity: "right",
    timerSeconds: 90,
    tileTypeCount: 6,
    ...patternToLevel([
      "TTTTTT",
      "TT##TT",
      "T**..T",
      "TT..TT",
      "TTTTTT",
      "TT..TT",
      "T..**T",
      "TT##TT",
    ]),
  },
  {
    id: 20,
    gravity: "down",
    timerSeconds: 88,
    tileTypeCount: 6,
    ...patternToLevel([
      "TTTTTT",
      "TT**TT",
      "TT##TT",
      "TT..TT",
      "TTTTTT",
      "TT..TT",
      "TT##TT",
      "TT**TT",
    ]),
  },

  // 21-25: blocker-heavy boards near max size
  {
    id: 21,
    gravity: "none",
    timerSeconds: 92,
    tileTypeCount: 6,
    ...patternToLevel([
      "TTTTTT",
      "T####T",
      "TT##TT",
      "TT##TT",
      "TT##TT",
      "TTTTTT",
      "T####T",
      "TTTTTT",
    ]),
  },
  {
    id: 22,
    gravity: "none",
    timerSeconds: 90,
    tileTypeCount: 7,
    ...patternToLevel([
      "TTTTTT",
      "T##..T",
      "TT##TT",
      "T..##T",
      "TTTTTT",
      "TT##TT",
      "T##..T",
      "TTTTTT",
    ]),
  },
  {
    id: 23,
    gravity: "down",
    timerSeconds: 88,
    tileTypeCount: 7,
    ...patternToLevel([
      "TTTTTT",
      "TT##TT",
      "TT..TT",
      "T####T",
      "TT##TT",
      "TT..TT",
      "T####T",
      "TTTTTT",
    ]),
  },
  {
    id: 24,
    gravity: "left",
    timerSeconds: 86,
    tileTypeCount: 7,
    ...patternToLevel([
      "TTTTTT",
      "T##TTT",
      "T##TTT",
      "TT..TT",
      "TT##TT",
      "TT##TT",
      "TT..TT",
      "TTT##T",
    ]),
  },
  {
    id: 25,
    gravity: "none",
    timerSeconds: 84,
    tileTypeCount: 7,
    ...patternToLevel([
      "TTTTTT",
      "T####T",
      "TT..TT",
      "TT##TT",
      "T####T",
      "TT..TT",
      "TT##TT",
      "TTTTTT",
    ]),
  },

  // 26-30: hardest combo set (gravity + frozen + solid + jumpers)
  {
    id: 26,
    gravity: "down",
    timerSeconds: 86,
    tileTypeCount: 7,
    jumpingBlockerCount: 1,
    ...patternToLevel([
      "TTTTTT",
      "TT##TT",
      "TT**TT",
      "TT..TT",
      "TTJ.TT",
      "TT..TT",
      "TT**TT",
      "TT##TT",
    ]),
  },
  {
    id: 27,
    gravity: "left",
    timerSeconds: 84,
    tileTypeCount: 7,
    jumpingBlockerCount: 2,
    ...patternToLevel([
      "TTTTTT",
      "T##TTT",
      "T**TTT",
      "TT..TT",
      "TTJ.TT",
      "TT..TT",
      "T**TTT",
      "T##TTT",
    ]),
  },
  {
    id: 28,
    gravity: "up",
    timerSeconds: 82,
    tileTypeCount: 8,
    jumpingBlockerCount: 3,
    ...patternToLevel([
      "TTTTTT",
      "TT###T",
      "TT**TT",
      "TT.J.T",
      "TT##TT",
      "TT##TT",
      "T..J.T",
      "TT**TT",
    ]),
  },
  {
    id: 29,
    gravity: "right",
    timerSeconds: 80,
    tileTypeCount: 8,
    jumpingBlockerCount: 4,
    ...patternToLevel([
      "TTTTTT",
      "TT##TT",
      "TT**TT",
      "TT..TT",
      "TTJ#TT",
      "TTJ#TT",
      "TT..TT",
      "TT**TT",
    ]),
  },
  {
    id: 30,
    gravity: "down",
    timerSeconds: 84,
    tileTypeCount: 8,
    jumpingBlockerCount: 3,
    ...patternToLevel([
      "TTTTTT",
      "T#TT#T",
      "TT*JTT",
      "TT..TT",
      "TT##TT",
      "TT##TT",
      "TT..TT",
      "TTJ*TT",
    ]),
  },
];

if (LEVELS.length !== 30) {
  throw new Error(`Expected 30 levels, got ${LEVELS.length}.`);
}
