// Slot Machine game logic

// Multipliers matrix: [rarity][nb_sim-3]
// rarity 0: even numbers (0,2,4,6), rarity 1: odd numbers (1,3,5), rarity 2: 8,9, rarity 3: 7
const MULTIPLIERS: number[][] = [
  [0.5, 2, 5],    // Even numbers (0,2,4,6)
  [1, 5, 10],     // Odd numbers (1,3,5)
  [5, 20, 50],    // 8, 9
  [10, 100, 500], // 7 (jackpot)
];

export interface SlotResult {
  numbers: number[];
  reward: number;
  winType: 'similar' | 'sequence' | 'none';
  message: string;
}

export function spin(): number[] {
  return Array(5).fill(0).map(() => Math.floor(Math.random() * 10));
}

export function calculateReward(numbers: number[], bet: number, machinePoints: number): SlotResult {
  // Find the value that appears most frequently
  const counts = new Map<number, number>();
  for (const n of numbers) {
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  
  let val = numbers[0];
  let maxCount = 0;
  for (const [key, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      val = key;
    }
  }
  
  const nbSim = maxCount;
  let reward = 0;
  let winType: SlotResult['winType'] = 'none';
  let message = "Perdu...";

  // Check for similar numbers (3, 4, or 5)
  if (nbSim >= 3) {
    winType = 'similar';
    let multIndex: number;
    
    if (val === 7) {
      multIndex = 3; // Jackpot
    } else if (val === 8 || val === 9) {
      multIndex = 2;
    } else if (val % 2 === 1) {
      multIndex = 1; // Odd
    } else {
      multIndex = 0; // Even
    }
    
    reward = Math.round(bet * MULTIPLIERS[multIndex][nbSim - 3]);
    
    if (nbSim === 5) {
      message = `JACKPOT ! ${val}-${val}-${val}-${val}-${val} ! Vous gagnez ${reward} points !`;
    } else if (nbSim === 4) {
      message = `Super ! ${nbSim} fois ${val} ! Vous gagnez ${reward} points !`;
    } else {
      message = `Bravo ! ${nbSim} fois ${val} ! Vous gagnez ${reward} points !`;
    }
  } else if (
    numbers[4] === numbers[3] + 1 &&
    numbers[3] === numbers[2] + 1 &&
    numbers[2] === numbers[1] + 1 &&
    numbers[1] === numbers[0] + 1
  ) {
    // Sequence: 0-1-2-3-4, 1-2-3-4-5, etc.
    winType = 'sequence';
    reward = machinePoints; // Win all machine points
    message = `SÉQUENCE MAGIQUE ! ${numbers[0]}-${numbers[1]}-${numbers[2]}-${numbers[3]}-${numbers[4]} ! Vous remportez ${reward} points de la machine !`;
  }

  return {
    numbers,
    reward,
    winType,
    message,
  };
}

export function formatNumbers(numbers: number[]): string {
  return numbers.join('-');
}
