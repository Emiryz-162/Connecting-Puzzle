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
        case "*": {
          outRow.push(-2);
          break;
        }
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
  // 1-5: temel eslestirme, gravity yok, ozel engel yok
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
    timerSeconds: 120,
    tileTypeCount: 4,
    tutorialText: "Look for straight and corner paths.",
  },
  {
    id: 3,
    width: 8,
    height: 5,
    gravity: "none",
    timerSeconds: 110,
    tileTypeCount: 5,
  },
  {
    id: 4,
    width: 8,
    height: 6,
    gravity: "none",
    timerSeconds: 105,
    tileTypeCount: 5,
  },
  {
    id: 5,
    width: 9,
    height: 6,
    gravity: "none",
    timerSeconds: 100,
    tileTypeCount: 6,
  },

  // 6-10: daha sıkisik path dusuncesi, hafif solid kullanimi
  {
    id: 6,
    gravity: "none",
    timerSeconds: 110,
    tileTypeCount: 4,
    ...patternToLevel(
      [
        "TTTTTTTT",
        "TTTTTTTT",
        "TTT##TTT",
        "TTT##TTT",
        "TTTTTTTT",
        "TTTTTTTT",
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
        "TTTTTTTT",
        "TT..TTTT",
        "TT##TTTT",
        "TT##TTTT",
        "TTTT..TT",
        "TTTTTTTT",
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
        "TTTTTTTTT",
        "TTT###TTT",
        "TT....TTT",
        "TTT###TTT",
        "TTTTTTTTT",
        "TTTTTTTTT",
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
        "TTTTTTTTT",
        "T##TTTT##",
        "T..TTTT..",
        "T##TTTT##",
        "TTTTTTTTT",
        "TTTTTTTTT",
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
        "TTTTTTTTTT",
        "TT##TT##TT",
        "TT..TT..TT",
        "TT##TT##TT",
        "TTTTTTTTTT",
        "TTTTTTTTTT",
      ],
      6
    ),
  },

  // 11-15: gravity tanitimi
  {
    id: 11,
    width: 6,
    height: 6,
    gravity: "down",
    timerSeconds: 105,
    tileTypeCount: 4,
    tutorialText: "Tiles settle with gravity after each match.",
  },
  {
    id: 12,
    width: 7,
    height: 6,
    gravity: "down",
    timerSeconds: 100,
    tileTypeCount: 5,
  },
  {
    id: 13,
    width: 8,
    height: 6,
    gravity: "down",
    timerSeconds: 95,
    tileTypeCount: 5,
  },
  {
    id: 14,
    width: 8,
    height: 6,
    gravity: "left",
    timerSeconds: 92,
    tileTypeCount: 6,
  },
  {
    id: 15,
    width: 9,
    height: 6,
    gravity: "up",
    timerSeconds: 90,
    tileTypeCount: 6,
  },

  // 16-20: frozen tanitimi ve kombinasyonlari
  {
    id: 16,
    gravity: "down",
    timerSeconds: 95,
    tileTypeCount: 5,
    tutorialText: "Frozen tiles unlock when a neighbor pops.",
    ...patternToLevel(
      [
        "TTTTTTTT",
        "TTTTTTTT",
        "TTT**TTT",
        "TTT**TTT",
        "TTTTTTTT",
        "TTTTTTTT",
      ],
      5
    ),
  },
  {
    id: 17,
    gravity: "none",
    timerSeconds: 92,
    tileTypeCount: 5,
    ...patternToLevel(
      [
        "TTTTTTTT",
        "TT..TTTT",
        "TT**TTTT",
        "TTTT**TT",
        "TTTT..TT",
        "TTTTTTTT",
      ],
      5
    ),
  },
  {
    id: 18,
    gravity: "down",
    timerSeconds: 90,
    tileTypeCount: 6,
    ...patternToLevel(
      [
        "TTTTTTTTT",
        "TTT##TTTT",
        "TTT**TTTT",
        "TTTT**TTT",
        "TTTT##TTT",
        "TTTTTTTTT",
      ],
      6
    ),
  },
  {
    id: 19,
    gravity: "right",
    timerSeconds: 88,
    tileTypeCount: 6,
    ...patternToLevel(
      [
        "TTTTTTTTT",
        "TT##TTTTT",
        "TT**..TTT",
        "TTT..**TT",
        "TTTTT##TT",
        "TTTTTTTTT",
      ],
      6
    ),
  },
  {
    id: 20,
    gravity: "down",
    timerSeconds: 86,
    tileTypeCount: 6,
    ...patternToLevel(
      [
        "TTTTTTTTTT",
        "TTTT**TTTT",
        "TT##TT##TT",
        "TT..TT..TT",
        "TTTT**TTTT",
        "TTTTTTTTTT",
      ],
      6
    ),
  },

  // 21-25: solid blocker odakli
  {
    id: 21,
    gravity: "none",
    timerSeconds: 90,
    tileTypeCount: 6,
    ...patternToLevel(
      [
        "TTTTTTTTTT",
        "T###TT###T",
        "TTTTTTTTTT",
        "TT##TT##TT",
        "TTTTTTTTTT",
        "T###TT###T",
        "TTTTTTTTTT",
      ],
      6
    ),
  },
  {
    id: 22,
    gravity: "none",
    timerSeconds: 88,
    tileTypeCount: 7,
    ...patternToLevel(
      [
        "TTTTTTTTTT",
        "T##..T..##",
        "TTTTTTTTTT",
        "TT##TT##TT",
        "TTTTTTTTTT",
        "T##..T..##",
        "TTTTTTTTTT",
      ],
      7
    ),
  },
  {
    id: 23,
    gravity: "down",
    timerSeconds: 86,
    tileTypeCount: 7,
    ...patternToLevel(
      [
        "TTTTTTTTTT",
        "TT##TT##TT",
        "TT....TTTT",
        "TT##TT##TT",
        "TTTTTTTTTT",
        "TT##TT##TT",
        "TTTTTTTTTT",
      ],
      7
    ),
  },
  {
    id: 24,
    gravity: "left",
    timerSeconds: 84,
    tileTypeCount: 7,
    ...patternToLevel(
      [
        "TTTTTTTTTT",
        "T##TTTT##T",
        "T##TTTT##T",
        "TT..TT..TT",
        "T##TTTT##T",
        "T##TTTT##T",
        "TTTTTTTTTT",
      ],
      7
    ),
  },
  {
    id: 25,
    gravity: "none",
    timerSeconds: 82,
    tileTypeCount: 7,
    ...patternToLevel(
      [
        "TTTTTTTTTT",
        "TT######TT",
        "TTT....TTT",
        "TT######TT",
        "TTTTTTTTTT",
        "TT######TT",
        "TTT....TTT",
        "TTTTTTTTTT",
      ],
      7
    ),
  },

  // 26-30: gravity + frozen + solid + jumper kombinasyonlari
  {
    id: 26,
    gravity: "down",
    timerSeconds: 84,
    tileTypeCount: 7,
    jumpingBlockerCount: 1,
    ...patternToLevel(
      [
        "TTTTTTTTTT",
        "TT##TT##TT",
        "TT**TT**TT",
        "TT..TT..TT",
        "TTTTTTTTTT",
        "TT##TT##TT",
        "TT..TT..TT",
        "TTTTTTTTTT",
      ],
      7
    ),
  },
  {
    id: 27,
    gravity: "left",
    timerSeconds: 82,
    tileTypeCount: 7,
    jumpingBlockerCount: 2,
    ...patternToLevel(
      [
        "TTTTTTTTTT",
        "T##TTTT##T",
        "T**TTTT**T",
        "TT..##..TT",
        "TTTTTTTTTT",
        "TT..##..TT",
        "T**TTTT**T",
        "TTTTTTTTTT",
      ],
      7
    ),
  },
  {
    id: 28,
    gravity: "up",
    timerSeconds: 80,
    tileTypeCount: 8,
    jumpingBlockerCount: 3,
    ...patternToLevel(
      [
        "TTTTTTTTTT",
        "TT###TT###",
        "TT**..**TT",
        "TTTTTTTTTT",
        "TT..####TT",
        "TTTTTTTTTT",
        "TT**..**TT",
        "TTTTTTTTTT",
      ],
      8
    ),
  },
  {
    id: 29,
    gravity: "right",
    timerSeconds: 78,
    tileTypeCount: 8,
    jumpingBlockerCount: 4,
    ...patternToLevel(
      [
        "TTTTTTTTTT",
        "T###TTTT#T",
        "TT**TT**TT",
        "TT..TT..TT",
        "TT##TT##TT",
        "TT..TT..TT",
        "TT**TT**TT",
        "TTTTTTTTTT",
      ],
      8
    ),
  },
  {
    id: 30,
    gravity: "down",
    timerSeconds: 84,
    tileTypeCount: 8,
    jumpingBlockerCount: 3,
    ...patternToLevel(
      [
        "TTTTTTTTTT",
        "T#TTTTTT#T",
        "TT*TTTT*TT",
        "TT..TT..TT",
        "TT#TTTT#TT",
        "TT..TT..TT",
        "TTTTTTTTTT",
        "TTTTTTTTTT",
      ],
      8
    ),
  },
];

if (LEVELS.length !== 30) {
  throw new Error(`Expected 30 levels, got ${LEVELS.length}.`);
}



