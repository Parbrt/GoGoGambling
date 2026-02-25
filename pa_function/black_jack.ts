type Suit = '♠' | '♥' | '♦' | '♣';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface Card {
  suit: Suit;
  rank: Rank;
}

export class BlackjackGame {
  private deck: Card[] = [];
  private playerHand: Card[] = [];
  private dealerHand: Card[] = [];
  
  private playerPoints: number;
  private currentBet: number = 0;
  private isGameOver: boolean = true;

  constructor(initialPoints: number = 1000) {
    this.playerPoints = initialPoints;
    this.initializeDeck();
  }

  // Initialise et mélange le paquet de 52 cartes
  private initializeDeck(): void {
    const suits: Suit[] = ['♠', '♥', '♦', '♣'];
    const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    this.deck = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        this.deck.push({ suit, rank });
      }
    }
    this.shuffleDeck();
  }

  // Algorithme de mélange de Fisher-Yates
  private shuffleDeck(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  // Calcule le score d'une main (gère les As)
  private calculateScore(hand: Card[]): number {
    let score = 0;
    let acesCount = 0;

    for (const card of hand) {
      if (['J', 'Q', 'K'].includes(card.rank)) {
        score += 10;
      } else if (card.rank === 'A') {
        score += 11;
        acesCount++;
      } else {
        score += parseInt(card.rank);
      }
    }

    // Ajuste la valeur des As si on dépasse 21
    while (score > 21 && acesCount > 0) {
      score -= 10;
      acesCount--;
    }

    return score;
  }

  // --- ACTIONS DU JEU ---

  public placeBetAndStart(betAmount: number): string {
    if (!this.isGameOver) return "Une partie est déjà en cours.";
    if (betAmount <= 0) return "La mise doit être supérieure à 0.";
    if (betAmount > this.playerPoints) return "Fonds insuffisants.";

    // Réinitialise le paquet si on manque de cartes
    if (this.deck.length < 15) this.initializeDeck();

    this.currentBet = betAmount;
    this.playerPoints -= betAmount;
    this.playerHand = [this.deck.pop()!, this.deck.pop()!];
    this.dealerHand = [this.deck.pop()!, this.deck.pop()!];
    this.isGameOver = false;

    // Vérifie le Blackjack naturel
    if (this.calculateScore(this.playerHand) === 21) {
      return this.endRound("Blackjack ! Vous gagnez !");
    }

    return `Partie commencée. Vous avez parié ${betAmount} points.`;
  }

  public hit(): string {
    if (this.isGameOver) return "Veuillez lancer une nouvelle partie.";

    this.playerHand.push(this.deck.pop()!);
    const playerScore = this.calculateScore(this.playerHand);

    if (playerScore > 21) {
      return this.endRound("Vous avez dépassé 21. Vous perdez !");
    } else if (playerScore === 21) {
      return this.stand(); // Force l'arrêt si on atteint 21
    }

    return `Vous avez tiré une carte. Votre score : ${playerScore}`;
  }

  public stand(): string {
    if (this.isGameOver) return "Veuillez lancer une nouvelle partie.";

    let dealerScore = this.calculateScore(this.dealerHand);

    // Le croupier tire jusqu'à 17
    while (dealerScore < 17) {
      this.dealerHand.push(this.deck.pop()!);
      dealerScore = this.calculateScore(this.dealerHand);
    }

    const playerScore = this.calculateScore(this.playerHand);

    if (dealerScore > 21) {
      return this.endRound("Le croupier a sauté. Vous gagnez !");
    } else if (playerScore > dealerScore) {
      return this.endRound("Vous battez le croupier !");
    } else if (playerScore < dealerScore) {
      return this.endRound("Le croupier gagne !");
    } else {
      return this.endRound("Égalité !");
    }
  }

  // Résout la fin de manche et gère les gains
  private endRound(reason: string): string {
    this.isGameOver = true;
    const playerScore = this.calculateScore(this.playerHand);
    const dealerScore = this.calculateScore(this.dealerHand);

    let resultMessage = `${reason} (Votre score: ${playerScore} | Score du croupier: ${dealerScore}).\n`;

    if (reason.includes("gagnez") || reason.includes("battez")) {
      // Si c'est un Blackjack naturel (21 avec 2 cartes), on paie souvent 3:2, ici on simplifie à 2x la mise
      const winnings = reason.includes("Blackjack") ? this.currentBet * 2.5 : this.currentBet * 2;
      this.playerPoints += winnings;
      resultMessage += `Vous remportez ${winnings} points !`;
    } else if (reason.includes("Égalité")) {
      this.playerPoints += this.currentBet; // Rembourse la mise
      resultMessage += "Votre mise vous est rendue.";
    } else {
      resultMessage += `Vous perdez votre mise de ${this.currentBet} points.`;
    }

    this.currentBet = 0;
    return resultMessage;
  }

  // Fonctions utilitaires d'affichage
  public getStatus() {
    return {
      points: this.playerPoints,
      playerHand: this.playerHand,
      playerScore: this.calculateScore(this.playerHand),
      // Ne montre qu'une seule carte du croupier si la partie est en cours
      dealerHand: this.isGameOver ? this.dealerHand : [this.dealerHand[0], { suit: '?', rank: '?' }],
      dealerScore: this.isGameOver ? this.calculateScore(this.dealerHand) : '?',
      isGameOver: this.isGameOver
    };
  }
}
