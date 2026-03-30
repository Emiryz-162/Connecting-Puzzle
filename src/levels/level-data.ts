import { LevelDef } from "../types";

type PatternPayload = Pick<LevelDef, "width" | "height" | "layout">;

function patternToLevel(rows: string[], _tileTypeCount: number): PatternPayload {
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
  // 1-5: basic matching, no gravity, no blockers
  {
    id: 1,
    width: 6,
    height: 4,
    gravity: "none",
    timerSeconds: 120,
    tileTypeCount: 3,
    tutorialText: "Tap two matching tiles to connect them!",
  },
  {
    id: 2,
    width: 6,
    height: 5,
    gravity: "none",
    timerSeconds: 118,
    tileTypeCount: 4,
    tutorialText: "Look for straight and corner paths.",
  },
  {
    id: 3,
    width: 6,
    height: 6,
    gravity: "none",
    timerSeconds: 112,
    tileTypeCount: 4,
  },
  {
    id: 4,
    width: 6,
    height: 7,
    gravity: "none",
    timerSeconds: 108,
    tileTypeCount: 5,
  },
  {
    id: 5,
    width: 6,
    height: 8,
    gravity: "none",
    timerSeconds: 104,
    tileTypeCount: 5,
  },

  // 6-10: tighter pathing with light solid usage
  {
    id: 6,
    gravity: "none",
    timerSeconds: 110,
    tileTypeCount: 4,
    ...patternToLevel(
      [
        "TTTTTT",
        "TTTTTT",
        "TT##TT",
        "TT##TT",
        "TTTTTT",
        "TTTTTT",
        "TT..TT",
        "TTTTTT",
      ],
      4
    ),
  },
  {
    id: 7,
    gravity: "none",
    timerSeconds: 108,
    tileTypeCount: 5,
    ...patternToLevel(
      [
        "TTTTTT",
        "T..TTT",
        "T##TTT",
        "TT##TT",
        "TTT..T",
        "TTTTTT",
        "TT##TT",
        "TTTTTT",
      ],
      5
    ),
  },
  {
    id: 8,
    gravity: "none",
    timerSeconds: 106,
    tileTypeCount: 5,
    ...patternToLevel(
      [
        "TTTTTT",
        "TT##TT",
        "TT..TT",
        "T####T",
        "TTTTTT",
        "TT..TT",
        "TT##TT",
        "TTTTTT",
        "TTTTTT",
      ],
      5
    ),
  },
  {
    id: 9,
    gravity: "none",
    timerSeconds: 104,
    tileTypeCount: 5,
    ...patternToLevel(
      [
        "TTTTTT",
        "T##..T",
        "TTTTTT",
        "TT##TT",
        "TT..TT",
        "TT##TT",
        "TTTTTT",
        "T..##T",
        "TTTTTT",
      ],
      5
    ),
  },
  {
    id: 10,
    gravity: "none",
    timerSeconds: 102,
    tileTypeCount: 6,
    ...patternToLevel(
      [
        "TTTTTT",
        "TT##TT",
        "T....T",
        "TT##TT",
        "TTTTTT",
        "TTTTTT",
        "TT##TT",
        "T....T",
        "TT##TT",
        "TTTTTT",
      ],
      6
    ),
  },

  // 11-15: gravity introduction (portrait-friendly)
  {
    id: 11,
    width: 6,
    height: 7,
    gravity: "down",
    timerSeconds: 106,
    tileTypeCount: 4,
    tutorialText: "Tiles settle with gravity after each match.",
  },
  {
    id: 12,
    width: 6,
    height: 8,
    gravity: "down",
    timerSeconds: 102,
    tileTypeCount: 5,
  },
  {
    id: 13,
    width: 6,
    height: 8,
    gravity: "down",
    timerSeconds: 98,
    tileTypeCount: 5,
  },
  {
    id: 14,
    width: 6,
    height: 9,
    gravity: "left",
    timerSeconds: 94,
    tileTypeCount: 6,
  },
  {
    id: 15,
    width: 6,
    height: 10,
    gravity: "up",
    timerSeconds: 92,
    tileTypeCount: 6,
  },

  // 16-20: frozen introduction and combos
  {
    id: 16,
    gravity: "down",
    timerSeconds: 96,
    tileTypeCount: 5,
    tutorialText: "Frozen tiles unlock when a neighbor pops.",
    ...patternToLevel(
      [
        "TTTTTT",
        "TTTTTT",
        "TT**TT",
        "TT**TT",
        "TTTTTT",
        "TTTTTT",
        "TT..TT",
        "TT..TT",
        "TTTTTT",
      ],
      5
    ),
  },
  {
    id: 17,
    gravity: "none",
    timerSeconds: 94,
    tileTypeCount: 5,
    ...patternToLevel(
      [
        "TTTTTT",
        "TT..TT",
        "TT**TT",
        "TTTTTT",
        "TTTTTT",
        "TT**TT",
        "TT..TT",
        "TTTTTT",
        "TTTTTT",
      ],
      5
    ),
  },
  {
    id: 18,
    gravity: "down",
    timerSeconds: 92,
    tileTypeCount: 6,
    ...patternToLevel(
      [
        "TTTTTT",
        "TT##TT",
        "TT**TT",
        "TT..TT",
        "TTTTTT",
        "TTTTTT",
        "TT..TT",
        "TT**TT",
        "TT##TT",
        "TTTTTT",
      ],
      6
    ),
  },
  {
    id: 19,
    gravity: "right",
    timerSeconds: 90,
    tileTypeCount: 6,
    ...patternToLevel(
      [
        "TTTTTT",
        "TT##TT",
        "T**..T",
        "TT..TT",
        "TTTTTT",
        "TTTTTT",
        "TT..TT",
        "T..**T",
        "TT##TT",
        "TTTTTT",
      ],
      6
    ),
  },
  {
    id: 20,
    gravity: "down",
    timerSeconds: 88,
    tileTypeCount: 6,
    ...patternToLevel(
      [
        "TTTTTT",
        "TT**TT",
        "TT##TT",
        "TT..TT",
        "TTTTTT",
        "TTTTTT",
        "TT..TT",
        "TT##TT",
        "TT**TT",
        "TTTTTT",
      ],
      6
    ),
  },

  // 21-25: solid blocker focused boards
  {
    id: 21,
    gravity: "none",
    timerSeconds: 92,
    tileTypeCount: 6,
    ...patternToLevel(
      [
        "TTTTTT",
        "T####T",
        "TT##TT",
        "TTTTTT",
        "TT##TT",
        "TT##TT",
        "TTTTTT",
        "TT##TT",
        "T####T",
        "TTTTTT",
      ],
      6
    ),
  },
  {
    id: 22,
    gravity: "none",
    timerSeconds: 90,
    tileTypeCount: 7,
    ...patternToLevel(
      [
        "TTTTTT",
        "T##..T",
        "TT##TT",
        "TTTTTT",
        "T..##T",
        "TTTTTT",
        "TT##TT",
        "T##..T",
        "TT##TT",
        "TTTTTT",
      ],
      7
    ),
  },
  {
    id: 23,
    gravity: "down",
    timerSeconds: 88,
    tileTypeCount: 7,
    ...patternToLevel(
      [
        "TTTTTT",
        "TT##TT",
        "TT..TT",
        "T####T",
        "TTTTTT",
        "TT##TT",
        "TT..TT",
        "T####T",
        "TTTTTT",
        "TT##TT",
        "TTTTTT",
      ],
      7
    ),
  },
  {
    id: 24,
    gravity: "left",
    timerSeconds: 86,
    tileTypeCount: 7,
    ...patternToLevel(
      [
        "TTTTTT",
        "T##TTT",
        "T##TTT",
        "TT..TT",
        "TT##TT",
        "TTTTTT",
        "TT##TT",
        "TT..TT",
        "TTT##T",
        "TTT##T",
        "TTTTTT",
      ],
      7
    ),
  },
  {
    id: 25,
    gravity: "none",
    timerSeconds: 84,
    tileTypeCount: 7,
    ...patternToLevel(
      [
        "TTTTTT",
        "T####T",
        "TT..TT",
        "TT##TT",
        "TTTTTT",
        "T####T",
        "TT..TT",
        "TT##TT",
        "TTTTTT",
        "T####T",
        "TT..TT",
        "TTTTTT",
      ],
      7
    ),
  },

  // 26-30: gravity + frozen + solid + jumper combos
  {
    id: 26,
    gravity: "down",
    timerSeconds: 86,
    tileTypeCount: 7,
    jumpingBlockerCount: 1,
    ...patternToLevel(
      [
        "TTTTTT",
        "TT##TT",
        "TT**TT",
        "TT..TT",
        "TTTTTT",
        "TTJ.TT",
        "TTTTTT",
        "TT..TT",
        "TT**TT",
        "TT##TT",
        "TTTTTT",
        "TTTTTT",
      ],
      7
    ),
  },
  {
    id: 27,
    gravity: "left",
    timerSeconds: 84,
    tileTypeCount: 7,
    jumpingBlockerCount: 2,
    ...patternToLevel(
      [
        "TTTTTT",
        "T##TTT",
        "T**TTT",
        "TT..TT",
        "TTJ.TT",
        "TTTTTT",
        "TT..TT",
        "T**TTT",
        "T##TTT",
        "TT..TT",
        "TTTTTT",
        "TTTTTT",
      ],
      7
    ),
  },
  {
    id: 28,
    gravity: "up",
    timerSeconds: 82,
    tileTypeCount: 8,
    jumpingBlockerCount: 3,
    ...patternToLevel(
      [
        "TTTTTT",
        "TT###T",
        "TT**TT",
        "T..J.T",
        "TT##TT",
        "TTTTTT",
        "TT##TT",
        "T..J.T",
        "TT**TT",
        "TT###T",
        "TTTTTT",
        "TTTTTT",
      ],
      8
    ),
  },
  {
    id: 29,
    gravity: "right",
    timerSeconds: 80,
    tileTypeCount: 8,
    jumpingBlockerCount: 4,
    ...patternToLevel(
      [
        "TTTTTT",
        "T###TT",
        "TT**TT",
        "TT..TT",
        "TTJ#TT",
        "TTTTTT",
        "TTJ#TT",
        "TT..TT",
        "TT**TT",
        "T###TT",
        "TTTTTT",
        "TTTTTT",
      ],
      8
    ),
  },
  {
    id: 30,
    gravity: "down",
    timerSeconds: 86,
    tileTypeCount: 8,
    jumpingBlockerCount: 3,
    ...patternToLevel(
      [
        "TTTTTT",
        "T#TT#T",
        "TT*JTT",
        "TT..TT",
        "TT##TT",
        "TTTTTT",
        "TT##TT",
        "TT..TT",
        "TTJ*TT",
        "T#TT#T",
        "TTTTTT",
        "TTTTTT",
      ],
      8
    ),
  },
];

if (LEVELS.length !== 30) {
  throw new Error(`Expected 30 levels, got ${LEVELS.length}.`);
}
