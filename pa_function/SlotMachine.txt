import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query: string): Promise<string> {
    return new Promise(resolve => rl.question(query, resolve));
}

async function start(nb_points: number, nb_points_machine: number): Promise<void> {
    const mult: number[][] = [
        [0.5, 2, 5],
        [1, 5, 10],
        [5, 20, 50],
        [10, 100, 500]
    ];

    while (true) {
        console.log(`The machine contains ${nb_points_machine} points.\nYou have ${nb_points} points.`);
        let bet = -1;
        while (bet > nb_points || bet < 0) {
            const input = await question("How much do you bet :\n>>");
            bet = parseInt(input, 10);
            if (isNaN(bet)) bet = -1;
        }
        if (bet === 0) {
            console.log("Exiting ...");
            break;
        }
        nb_points -= bet;
        nb_points_machine += bet;
        const num: number[] = Array(5).fill(-1);
        let reward = 0;
        for (let i = 0; i < num.length; i++) {
            num[i] = Math.floor(Math.random() * 10);
        }
        console.log(`ding ding ding :\n${num[0]}-${num[1]}-${num[2]}-${num[3]}-${num[4]}`);

        // Find the value that appears most frequently
        const counts = new Map<number, number>();
        for (const n of num) {
            counts.set(n, (counts.get(n) ?? 0) + 1);
        }
        let val = num[0];
        let maxCount = 0;
        for (const [key, count] of counts.entries()) {
            if (count > maxCount) {
                maxCount = count;
                val = key;
            }
        }
        const nb_sim = maxCount;

        if (nb_sim >= 3) {
            if (val === 7) {
                reward = bet * mult[3][nb_sim - 3];
            } else if (val === 8 || val === 9) {
                reward = bet * mult[2][nb_sim - 3];
            } else if (num[0] % 2 === 1) {
                reward = bet * mult[1][nb_sim - 3];
            } else if (num[0] % 2 === 0) {
                reward = bet * mult[0][nb_sim - 3];
            }
            reward = Math.round(reward);
            console.log(`you won ${reward} points !`);
            nb_points += reward;
        } else if (
            num[4] === num[3] + 1 &&
            num[3] === num[2] + 1 &&
            num[2] === num[1] + 1 &&
            num[1] === num[0] + 1
        ) {
            reward = nb_points_machine;
            nb_points_machine = 0;
            reward = Math.round(reward);
            console.log(`you won ${reward} points !`);
            nb_points += reward;
        } else {
            console.log("you lost :(");
        }
    }
    rl.close();
}

start(1000, 10000);