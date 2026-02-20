import readlineSync from 'readline-sync';

function start(nb_point: number): void {
    while (true) {
        let choice1 = -1;
        while (choice1 !== 0 && choice1 !== 1 && choice1 !== 2) {
            choice1 = parseInt(readlineSync.question("Pick one :\nBet on odd/even (x2) - 1\nBet on a number (x36) - 2\n>>"));
        }
        if (choice1 === 0) {
            break;
        }
        let choice2 = -1;
        if (choice1 === 1) {
            while (choice2 !== 1 && choice2 !== 2) {
                choice2 = parseInt(readlineSync.question("Odd - 1\nEven - 2\n>>"));
            }
        } else {
            const numbers = Array.from({ length: 36 }, (_, i) => i);
            while (!numbers.includes(choice2)) {
                choice2 = parseInt(readlineSync.question("Pick a number (0-35)\n>>"));
            }
        }
        let bet = -1;
        while (bet > nb_point || bet < 0) {
            bet = parseInt(readlineSync.question("How much do you bet ?\n" + (choice1 === 1 ? "(x2)" : "(x36)") + "\n>>"));
        }
        nb_point -= bet;
        const number = Math.floor(Math.random() * 36);
        console.log(number, " went out !");
        if (choice1 === 1) {
            if ((number % 2 === 0 && choice2 === 2) || (number % 2 === 1 && choice2 === 1)) {
                bet = bet * 2;
                nb_point += bet;
                console.log("You won ", bet, " points !");
            } else {
                console.log("You lost :(");
            }
        } else if (choice1 === 2) {
            if (choice2 === number) {
                bet = bet * 36;
                nb_point += bet;
                console.log("You won ", bet, " points !");
            } else {
                console.log("You lost :(");
            }
        }
        console.log("You've got ", nb_point, " points.");
    }
}
