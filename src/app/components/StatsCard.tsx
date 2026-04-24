interface StatsCardProps {
  title: string;
  value: number;
  icon: string;
  bgColor: string;
  textColor: string;
}

export default function StatsCard({ title, value, icon, bgColor, textColor }: StatsCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg ${bgColor} ${textColor} flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-muted-foreground mb-1">{title}</p>
        <p className="text-4xl">{value}</p>
      </div>
    </div>
  );
}
