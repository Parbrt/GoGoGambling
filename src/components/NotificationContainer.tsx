import { useNotifications } from "@/context/NotificationContext";
import { X, Trophy, TrendingDown, TrendingUp, AlertCircle, Gift, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  info: Info,
  success: TrendingUp,
  warning: AlertCircle,
  error: TrendingDown,
  jackpot: Gift,
  ranking: Trophy,
};

const styles = {
  info: "bg-blue-50 border-blue-200 text-blue-800",
  success: "bg-green-50 border-green-200 text-green-800",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  error: "bg-red-50 border-red-200 text-red-800",
  jackpot: "bg-purple-50 border-purple-200 text-purple-800",
  ranking: "bg-orange-50 border-orange-200 text-orange-800",
};

const iconColors = {
  info: "text-blue-500",
  success: "text-green-500",
  warning: "text-yellow-500",
  error: "text-red-500",
  jackpot: "text-purple-500",
  ranking: "text-orange-500",
};

export function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {notifications.map((notification) => {
        const Icon = icons[notification.type];
        return (
          <div
            key={notification.id}
            className={cn(
              "relative p-4 rounded-lg border shadow-lg animate-in slide-in-from-right duration-300",
              styles[notification.type]
            )}
          >
            <button
              onClick={() => removeNotification(notification.id)}
              className="absolute top-2 right-2 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-start gap-3 pr-6">
              <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", iconColors[notification.type])} />
              <div>
                <h4 className="font-semibold text-sm">{notification.title}</h4>
                <p className="text-sm mt-1 opacity-90">{notification.message}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
