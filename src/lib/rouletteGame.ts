export type RouletteChoice = {
  type: 'odd-even' | 'number';
  value: number; // 1=odd, 2=even pour odd-even, 0-35 pour number
};

export function generateRouletteNumber(): number {
  return Math.floor(Math.random() * 36);
}

export function isEven(number: number): boolean {
  return number % 2 === 0;
}

export function isOdd(number: number): boolean {
  return number % 2 === 1;
}

export function calculateRouletteWinnings(
  bet: number,
  choice: RouletteChoice,
  winningNumber: number
): number {
  if (choice.type === 'odd-even') {
    // Parie sur impair/pair (x2)
    const betOnEven = choice.value === 2;
    const isWinningEven = isEven(winningNumber);
    
    if ((betOnEven && isWinningEven) || (!betOnEven && !isWinningEven)) {
      return bet * 2;
    }
    return 0;
  } else {
    // Parie sur un numéro (x36)
    if (choice.value === winningNumber) {
      return bet * 36;
    }
    return 0;
  }
}

export function getRouletteColor(number: number): 'red' | 'black' | 'green' {
  if (number === 0) return 'green';
  // Les numéros pairs sont noirs, impairs sont rouges (simplifié)
  return isEven(number) ? 'black' : 'red';
}

export const ROULETTE_NUMBERS = Array.from({ length: 36 }, (_, i) => i);
