import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DailyReward } from "@/components/DailyReward";
import type { PlayerType } from "@/types";
import type { User } from "@supabase/supabase-js";

interface HomeProps {
  user: User;
  player: PlayerType;
  onPlayerUpdate: (player: PlayerType) => void;
}

export function Home({ user, player, onPlayerUpdate }: HomeProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Bienvenue {player.player_name} !</h1>
        <p className="text-muted-foreground">Voici votre tableau de bord</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Vos informations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold">{user.email}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Nom</p>
                <p className="font-semibold">{player.player_name}</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="pt-6">
                <p className="text-sm text-primary/70">Points</p>
                <p className="text-3xl font-bold text-primary">{player.nb_point}</p>
              </CardContent>
            </Card>
            <Card className="bg-destructive/10 border-destructive/20">
              <CardContent className="pt-6">
                <p className="text-sm text-destructive/70">Dettes</p>
                <p className="text-3xl font-bold text-destructive">{player.nb_debt}</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Actions A</p>
                <p className="font-semibold">{player.nb_share_A} <Badge variant="secondary">moy: {player.avg_share_A_value}</Badge></p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Actions B</p>
                <p className="font-semibold">{player.nb_share_B} <Badge variant="secondary">moy: {player.avg_share_B_value}</Badge></p>
              </CardContent>
            </Card>
          </div>
          <Card className="mt-4 bg-muted/50">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Dernière connexion</p>
              <p className="font-semibold">
                {player.last_login 
                  ? new Date(player.last_login).toLocaleString('fr-FR') 
                  : 'Jamais'}
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <DailyReward 
        userId={user.id} 
        onRewardClaimed={async () => {
          const { getPlayerByUserId } = await import('@/lib/supabase');
          const updatedPlayer = await getPlayerByUserId(user.id);
          if (updatedPlayer) {
            onPlayerUpdate(updatedPlayer);
          }
        }}
      />
    </div>
  );
}
