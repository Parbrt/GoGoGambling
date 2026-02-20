import readline from "readline";

const chicken_stat: string[] = ["Intelligence", "Strenght", "Speed", "Stamina", "Luck"];

function randint(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function create_chicken(): number[] {
  const chicken: number[] = [];
  for (const stat of chicken_stat) {
    chicken.push(randint(0, 100));
  }
  return chicken;
}

function get_scale(stat: number): string {
  return stat > 66 ? "HIGH" : (stat > 33 ? "MID" : "LOW");
}

function display_chicken(chicken: number[], chicken_name: string): void {
  console.log("=====", chicken_name, "======");
  for (let i = 0; i < chicken_stat.length; i++) {
    console.log("    ", chicken_stat[i], " : ", get_scale(chicken[i]));
  }
}

function fight(chicken_A: number[], chicken_B: number[], chicken_A_name: string, chicken_B_name: string): [number[], 1 | 2] {
  let stat_A = randint(0, 4);
  let stat_B = stat_A;
  while (stat_B === stat_A) {
    stat_B = randint(0, 4);
  }
  let stat_C = stat_B;
  while (stat_C === stat_A || stat_C === stat_B) {
    stat_C = randint(0, 4);
  }

  console.log(chicken_stat[stat_A], ",", chicken_stat[stat_B], ",", chicken_stat[stat_C]);

  let ponder_A = randint(10, 80) / 100;
  let ponder_B = 1;
  while ((ponder_A + ponder_B) >= 1) {
    ponder_B = randint(0, 90) / 100;
  }
  let ponder_C = 1 - (ponder_A + ponder_B);

  const score_A = ponder_A * chicken_A[stat_A] + ponder_B * chicken_A[stat_B] + ponder_C * chicken_A[stat_C];
  const score_B = ponder_A * chicken_B[stat_A] + ponder_B * chicken_B[stat_B] + ponder_C * chicken_B[stat_C];

  if (score_A >= score_B) {
    console.log(chicken_A_name, " won !");
    return [chicken_A, 1];
  } else {
    console.log(chicken_B_name, " won !");
    return [chicken_B, 2];
  }
}

function gen_population(): [number, number][] {
  const size_pop = randint(5, 20);
  const population: [number, number][] = [];
  for (let i = 0; i < size_pop; i++) {
    population.push([randint(0, 1), randint(20, 5000)]);
  }
  return population;
}

const chicken_A = create_chicken();
const chicken_B = create_chicken();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function start(nb_point: number, chicken_A: number[], chicken_B: number[]): Promise<void> {
  while (true) {
    const population = gen_population();
    let bet_A = 0;
    let bet_B = 0;

    for (const element of population) {
      if (element[0] === 0) {
        bet_A += element[1];
      } else {
        bet_B += element[1];
      }
    }

    display_chicken(chicken_A, "Poulet A");
    display_chicken(chicken_B, "Poulet B");
    let multiplicator = 1;
    if (bet_A > bet_B) {
      multiplicator = bet_A / bet_B;
      console.log(bet_A, "  ", multiplicator.toFixed(2), ":1  ", bet_B);
    } else {
      multiplicator = bet_B / bet_A;
      console.log(bet_A, "  1:", multiplicator.toFixed(2), "  ", bet_B);
    }

    let choice = 0;
    while (choice !== 1 && choice !== 2) {
      const input = await question("Pick a chicken\nChicken A - 1\nChicken B - 2\n>>");
      choice = parseInt(input);
    }

    let bet = nb_point + 1;
    while (bet > nb_point) {
      const input = await question("Bet >>");
      bet = parseInt(input);
    }
    if (bet === 0) {
      rl.close();
      return;
    }
    nb_point -= bet;
    if (choice === 1) {
      bet_A += bet;
    } else {
      bet_B += bet;
    }
    if (bet_A > bet_B) {
      multiplicator = bet_A / bet_B;
      console.log(bet_A, "  ", multiplicator.toFixed(2), ":1  ", bet_B);
    } else {
      multiplicator = bet_B / bet_A;
      console.log(bet_A, "  1:", multiplicator.toFixed(2), "  ", bet_B);
    }
    const [winnerChicken, chicken_name] = fight(chicken_A, chicken_B, "Poulet A", "Poulet B");
    if (choice === chicken_name) {
      console.log("Congrats, you picked the right chicken, you win ", Math.round(bet * multiplicator), " points!");
      nb_point += Math.round(bet * multiplicator);
    } else {
      console.log("You loosed, but don't worry, you'll have the next one !");
    }
    console.log("Now you have ", nb_point, "!");
    chicken_B.splice(0, chicken_B.length, ...create_chicken());
  }
}

start(100, chicken_A, chicken_B);
