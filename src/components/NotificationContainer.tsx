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
  info: "bg-[#FCFBFA] border-[#D1CDC7] text-[#141413]",
  success: "bg-[#FCFBFA] border-[#D1CDC7] text-[#141413]",
  warning: "bg-[#FCFBFA] border-[#F37338]/40 text-[#141413]",
  error: "bg-[#FCFBFA] border-[#CF4500]/40 text-[#141413]",
  jackpot: "bg-[#141413] border-[#141413] text-[#F3F0EE]",
  ranking: "bg-[#FCFBFA] border-[#F37338]/40 text-[#141413]",
};

const iconColors = {
  info: "text-[#3860BE]",
  success: "text-green-600",
  warning: "text-[#F37338]",
  error: "text-[#CF4500]",
  jackpot: "text-[#F37338]",
  ranking: "text-[#F37338]",
};

export function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-28 right-6 z-50 flex flex-col gap-3 max-w-sm">
      {notifications.map((notification) => {
        const Icon = icons[notification.type];
        return (
          <div
            key={notification.id}
            className={cn(
              "relative p-5 rounded-[28px] border shadow-[rgba(0,0,0,0.08)_0px_24px_48px_0px] animate-in slide-in-from-right duration-300",
              styles[notification.type]
            )}
          >
            <button
              onClick={() => removeNotification(notification.id)}
              className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center opacity-40 hover:opacity-100 hover:bg-black/10 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", iconColors[notification.type])} />
              <div>
                <h4 className="font-medium text-sm tracking-[-0.02em]">{notification.title}</h4>
                <p className="text-sm mt-0.5 opacity-70">{notification.message}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
