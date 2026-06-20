import { Construction } from "lucide-react";

interface Props {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <Construction className="w-12 h-12 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-xs">
        {description ?? "This feature is coming in a future phase."}
      </p>
    </div>
  );
}
