import { RefreshCw } from "lucide-react";

export function UpdateBanner() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-4 bg-[#141413] text-[#F3F0EE] px-6 py-3.5 rounded-[28px] shadow-[rgba(0,0,0,0.24)_0px_16px_40px_0px] border border-white/10">
        <div className="flex flex-col">
          <span className="text-sm font-medium tracking-[-0.02em]">Nouvelle version disponible</span>
          <span className="text-xs opacity-60">Rafraichissez la page pour profiter des dernières mises à jour.</span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 bg-[#F3F0EE] text-[#141413] text-sm font-medium px-4 py-2 rounded-full hover:bg-white transition-colors whitespace-nowrap"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Rafraîchir
        </button>
      </div>
    </div>
  );
}
