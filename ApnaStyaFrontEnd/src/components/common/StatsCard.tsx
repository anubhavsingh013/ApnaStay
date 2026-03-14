import type { ReactNode } from "react";

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
}

const StatsCard = ({ icon, label, value }: StatsCardProps) => (
  <div className="bg-card rounded-xl border border-border/50 p-5 flex items-center justify-between">
    <div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-card-foreground">{value}</p>
    </div>
    <div className="text-primary shrink-0">
      {icon}
    </div>
  </div>
);

export default StatsCard;
