import { useNotifications } from "@/context/NotificationContext";

// Exemple d'utilisation du système de notification

export function NotificationExample() {
  const { addNotification } = useNotifications();

  const showInfo = () => {
    addNotification({
      type: "info",
      title: "Information",
      message: "Ceci est une notification d'information.",
      duration: 5000,
    });
  };

  const showSuccess = () => {
    addNotification({
      type: "success",
      title: "Succès !",
      message: "Votre action a été réalisée avec succès.",
      duration: 5000,
    });
  };

  const showWarning = () => {
    addNotification({
      type: "warning",
      title: "Attention",
      message: "Quelque chose nécessite votre attention.",
      duration: 8000,
    });
  };

  const showError = () => {
    addNotification({
      type: "error",
      title: "Erreur",
      message: "Une erreur s'est produite.",
      duration: 10000,
    });
  };

  const showJackpot = () => {
    addNotification({
      type: "jackpot",
      title: "🎰 JACKPOT !",
      message: "Quelqu'un vient de gagner 15,000 points !",
      duration: 10000,
    });
  };

  const showRanking = () => {
    addNotification({
      type: "ranking",
      title: "📉 Vous avez été dépassé !",
      message: "Un autre joueur vous a dépassé au classement.",
      duration: 8000,
    });
  };

  return {
    showInfo,
    showSuccess,
    showWarning,
    showError,
    showJackpot,
    showRanking,
  };
}
