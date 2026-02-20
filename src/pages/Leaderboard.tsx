import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { getPlayersInfo } from "@/lib/supabase";
import type { PlayerType } from "@/types";

export function Leaderboard() {
  const [players, setPlayers] = useState<PlayerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const data = await getPlayersInfo();
      // Trier par points décroissants
      const sortedPlayers = data.sort((a, b) => b.nb_point - a.nb_point);
      setPlayers(sortedPlayers);
    } catch (err) {
      setError("Erreur lors du chargement du classement");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">🥇 1er</Badge>;
      case 1:
        return <Badge className="bg-gray-400 hover:bg-gray-500 text-white">🥈 2ème</Badge>;
      case 2:
        return <Badge className="bg-orange-400 hover:bg-orange-500 text-white">🥉 3ème</Badge>;
      default:
        return <Badge variant="outline">#{index + 1}</Badge>;
    }
  };

  const getRowStyle = (index: number) => {
    switch (index) {
      case 0:
        return "bg-yellow-50/50";
      case 1:
        return "bg-gray-50/50";
      case 2:
        return "bg-orange-50/50";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-muted-foreground">Classement de tous les joueurs</p>
        </div>
        <Card>
          <CardContent className="flex justify-center items-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-muted-foreground">Classement de tous les joueurs</p>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">
          Classement de tous les joueurs par nombre de points
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Classement</CardTitle>
          <CardDescription>
            {players.length} joueur{players.length > 1 ? 's' : ''} au total
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Rang</TableHead>
                  <TableHead>Joueur</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player, index) => (
                  <TableRow key={player.id} className={getRowStyle(index)}>
                    <TableCell>
                      {getRankBadge(index)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {player.player_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {player.player_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-xl font-bold text-primary">
                        {player.nb_point.toLocaleString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {players.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">Aucun joueur dans le classement.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
