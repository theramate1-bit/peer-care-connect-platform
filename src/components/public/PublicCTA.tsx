import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

interface PublicCTAProps {
  variant?: "inline" | "card" | "banner";
  title?: string;
  description?: string;
}

export function PublicCTA({
  variant = "inline",
  title = "Ready to book a session?",
  description = "Create an account to book appointments and message therapists"
}: PublicCTAProps) {
  if (variant === "card") {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          <div className="space-y-3">
            <Link to="/register" className="w-full block">
              <Button className="w-full">Sign Up</Button>
            </Link>
            <Link to="/login" className="w-full block">
              <Button variant="outline" className="w-full">Login</Button>
            </Link>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-sm font-medium mb-2">Account Benefits:</h4>
            <ul className="space-y-2">
              <li className="flex items-center text-sm text-muted-foreground">
                <CheckCircle className="h-3 w-3 text-green-600 mr-2" />
                Book sessions with verified therapists
              </li>
              <li className="flex items-center text-sm text-muted-foreground">
                <CheckCircle className="h-3 w-3 text-green-600 mr-2" />
                Message therapists directly
              </li>
              <li className="flex items-center text-sm text-muted-foreground">
                <CheckCircle className="h-3 w-3 text-green-600 mr-2" />
                Manage all your appointments
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "banner") {
    return (
      <div className="bg-primary/10 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="text-muted-foreground">{description}</p>
          </div>
          <div className="flex gap-3">
            <Link to="/register">
              <Button>Sign Up</Button>
            </Link>
            <Link to="/login">
              <Button variant="outline">Login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Default inline variant
  return (
    <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Link to="/register">
        <Button size="sm">Sign Up</Button>
      </Link>
    </div>
  );
}
