interface CountdownProps {
  timeString: string;
  phase: string;
}

export function Countdown({ timeString, phase }: CountdownProps) {
  const isUrgent = timeString.startsWith("00:0") || timeString.startsWith("00:00:0");

  const labels: Record<string, string> = {
    betting: "Fermeture des paris dans",
    fighting: "Resultat imminent",
    resolved: "Prochain combat dans",
    waiting: "Prochain combat dans",
  };

  return (
    <div className="text-center space-y-1">
      <p className="text-sm text-muted-foreground">{labels[phase] || "Prochain combat dans"}</p>
      <p className={`text-5xl font-bold tracking-tight font-mono ${isUrgent ? "text-red-500 animate-pulse" : "text-foreground"}`}>
        {timeString}
      </p>
    </div>
  );
}
