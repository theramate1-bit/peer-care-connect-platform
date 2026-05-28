import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RoutePlaceholderProps = {
  title: string;
  description?: string;
  links?: { label: string; to: string }[];
};

export default function RoutePlaceholder({
  title,
  description = "This screen is not bundled in the minimal web shell yet. Use the links below for shipped flows.",
  links = [
    { label: "Marketplace", to: "/marketplace" },
    { label: "Book a practitioner", to: "/client/booking" },
    { label: "Find my booking", to: "/booking/find" },
  ],
}: RoutePlaceholderProps) {
  return (
    <div className="container mx-auto px-4 py-12 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {links.map((l) => (
            <Button key={l.to} variant="outline" asChild>
              <Link to={l.to}>{l.label}</Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
