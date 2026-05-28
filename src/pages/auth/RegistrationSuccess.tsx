import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RegistrationSuccess = () => (
  <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
        <CardTitle>Account created</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Check your email to confirm your address if required, then sign in to
          continue.
        </p>
        <Button asChild className="w-full">
          <Link to="/login">Sign in</Link>
        </Button>
        <Button variant="outline" asChild className="w-full">
          <Link to="/marketplace">Browse marketplace</Link>
        </Button>
      </CardContent>
    </Card>
  </div>
);

export default RegistrationSuccess;
