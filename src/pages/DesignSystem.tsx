import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Heart, 
  Shield, 
  Users, 
  Calendar, 
  Star, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Check,
  X,
  ArrowRight,
  Settings,
  Bell,
  User,
  Mail,
  Phone,
  MapPin,
  Clock,
  TrendingUp,
  Activity,
  Bone,
  Stethoscope,
  GraduationCap,
  Building2,
  Target,
  Lightbulb,
  Globe,
  Zap
} from 'lucide-react';
import StandardPage from '@/components/layouts/StandardPage';
import MetaTags from '@/components/SEO/MetaTags';

const DesignSystem = () => {
  return (
    <>
      <MetaTags
        title="Design System | TheraMate - Design Guidelines & Components"
        description="TheraMate's comprehensive design system including colors, typography, spacing, components, and responsive guidelines."
        keywords="design system, UI components, design guidelines, TheraMate design, healthcare platform design"
        canonicalUrl="https://theramate.co.uk/design-system"
      />
      <StandardPage 
        title="TheraMate Design System" 
        badgeText="Design Guidelines" 
        subtitle="Comprehensive design system for consistent, accessible, and beautiful healthcare platform experiences."
      >
        {/* Design Principles */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Design Principles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-red-500" />
                      Human-Centered
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Every design decision prioritizes the wellbeing and comfort of healthcare professionals and their clients.
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-500" />
                      Trust & Safety
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Visual design reinforces security, professionalism, and reliability in healthcare contexts.
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-500" />
                      Inclusive
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Accessible design that works for all users regardless of ability, device, or context.
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-purple-500" />
                      Efficient
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Streamlined workflows that reduce cognitive load and support busy healthcare professionals.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Color Palette */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Color Palette</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {/* Primary Colors */}
                <Card>
                  <CardHeader>
                    <CardTitle>Primary Colors</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="w-full h-12 bg-primary rounded-md"></div>
                      <p className="text-sm font-medium">Primary</p>
                      <p className="text-xs text-muted-foreground">hsl(var(--primary))</p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-12 bg-primary/80 rounded-md"></div>
                      <p className="text-sm font-medium">Primary 80%</p>
                      <p className="text-xs text-muted-foreground">Primary with opacity</p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-12 bg-primary/10 rounded-md"></div>
                      <p className="text-sm font-medium">Primary 10%</p>
                      <p className="text-xs text-muted-foreground">Light backgrounds</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Secondary Colors */}
                <Card>
                  <CardHeader>
                    <CardTitle>Secondary Colors</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="w-full h-12 bg-secondary rounded-md"></div>
                      <p className="text-sm font-medium">Secondary</p>
                      <p className="text-xs text-muted-foreground">hsl(var(--secondary))</p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-12 bg-accent rounded-md"></div>
                      <p className="text-sm font-medium">Accent</p>
                      <p className="text-xs text-muted-foreground">hsl(var(--accent))</p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-12 bg-muted rounded-md"></div>
                      <p className="text-sm font-medium">Muted</p>
                      <p className="text-xs text-muted-foreground">hsl(var(--muted))</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Status Colors */}
                <Card>
                  <CardHeader>
                    <CardTitle>Status Colors</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="w-full h-12 bg-green-500 rounded-md"></div>
                      <p className="text-sm font-medium">Success</p>
                      <p className="text-xs text-muted-foreground">#10b981</p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-12 bg-yellow-500 rounded-md"></div>
                      <p className="text-sm font-medium">Warning</p>
                      <p className="text-xs text-muted-foreground">#f59e0b</p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-12 bg-red-500 rounded-md"></div>
                      <p className="text-sm font-medium">Error</p>
                      <p className="text-xs text-muted-foreground">#ef4444</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Healthcare Role Colors */}
                <Card>
                  <CardHeader>
                    <CardTitle>Role Colors</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="w-full h-12 bg-blue-500 rounded-md"></div>
                      <p className="text-sm font-medium">Practitioner</p>
                      <p className="text-xs text-muted-foreground">#3b82f6</p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-12 bg-green-500 rounded-md"></div>
                      <p className="text-sm font-medium">Client</p>
                      <p className="text-xs text-muted-foreground">#10b981</p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-12 bg-purple-500 rounded-md"></div>
                      <p className="text-sm font-medium">Admin</p>
                      <p className="text-xs text-muted-foreground">#8b5cf6</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Typography</h2>
              
              <div className="space-y-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Font Family</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-lg font-medium mb-2">Primary Font: Inter</p>
                        <p className="text-muted-foreground">
                          Inter is a carefully crafted typeface designed for computer screens. 
                          It features a tall x-height to aid in readability of mixed-case and lower-case text.
                        </p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="font-inter text-lg">
                          The quick brown fox jumps over the lazy dog
                        </p>
                        <p className="font-inter text-sm text-muted-foreground mt-2">
                          ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Text Scales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <h1 className="text-4xl font-bold mb-2">Heading 1</h1>
                        <p className="text-sm text-muted-foreground">text-4xl font-bold</p>
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold mb-2">Heading 2</h2>
                        <p className="text-sm text-muted-foreground">text-3xl font-bold</p>
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold mb-2">Heading 3</h3>
                        <p className="text-sm text-muted-foreground">text-2xl font-semibold</p>
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold mb-2">Heading 4</h4>
                        <p className="text-sm text-muted-foreground">text-xl font-semibold</p>
                      </div>
                      <div>
                        <p className="text-lg mb-2">Body Large</p>
                        <p className="text-sm text-muted-foreground">text-lg</p>
                      </div>
                      <div>
                        <p className="text-base mb-2">Body Regular</p>
                        <p className="text-sm text-muted-foreground">text-base</p>
                      </div>
                      <div>
                        <p className="text-sm mb-2">Body Small</p>
                        <p className="text-sm text-muted-foreground">text-sm</p>
                      </div>
                      <div>
                        <p className="text-xs mb-2">Caption</p>
                        <p className="text-sm text-muted-foreground">text-xs</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Spacing System */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Spacing System</h2>
              
              <Card>
                <CardHeader>
                  <CardTitle>Spacing Scale</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-1 h-4 bg-primary rounded"></div>
                      <span className="text-sm font-mono">1 (4px)</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-4 bg-primary rounded"></div>
                      <span className="text-sm font-mono">2 (8px)</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-4 bg-primary rounded"></div>
                      <span className="text-sm font-mono">3 (12px)</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-4 h-4 bg-primary rounded"></div>
                      <span className="text-sm font-mono">4 (16px)</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-6 h-4 bg-primary rounded"></div>
                      <span className="text-sm font-mono">6 (24px)</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-4 bg-primary rounded"></div>
                      <span className="text-sm font-mono">8 (32px)</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-4 bg-primary rounded"></div>
                      <span className="text-sm font-mono">12 (48px)</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-4 bg-primary rounded"></div>
                      <span className="text-sm font-mono">16 (64px)</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-4 bg-primary rounded"></div>
                      <span className="text-sm font-mono">20 (80px)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Component Library */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Component Library</h2>
              
              <Tabs defaultValue="buttons" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="buttons">Buttons</TabsTrigger>
                  <TabsTrigger value="forms">Forms</TabsTrigger>
                  <TabsTrigger value="feedback">Feedback</TabsTrigger>
                  <TabsTrigger value="navigation">Navigation</TabsTrigger>
                </TabsList>

                <TabsContent value="buttons" className="space-y-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Button Variants</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-4">
                        <Button>Primary</Button>
                        <Button variant="secondary">Secondary</Button>
                        <Button variant="outline">Outline</Button>
                        <Button variant="ghost">Ghost</Button>
                        <Button variant="destructive">Destructive</Button>
                        <Button variant="link">Link</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Button Sizes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap items-center gap-4">
                        <Button size="sm">Small</Button>
                        <Button size="default">Default</Button>
                        <Button size="lg">Large</Button>
                        <Button size="icon"><Heart className="h-4 w-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Badges</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-4">
                        <Badge>Default</Badge>
                        <Badge variant="secondary">Secondary</Badge>
                        <Badge variant="outline">Outline</Badge>
                        <Badge variant="destructive">Destructive</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="forms" className="space-y-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Form Elements</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" placeholder="Enter your email" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea id="message" placeholder="Enter your message" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="terms" />
                        <Label htmlFor="terms">Accept terms and conditions</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="notifications" />
                        <Label htmlFor="notifications">Enable notifications</Label>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="feedback" className="space-y-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Alerts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          This is an informational alert.
                        </AlertDescription>
                      </Alert>
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          This is a success alert.
                        </AlertDescription>
                      </Alert>
                      <Alert className="border-yellow-200 bg-yellow-50">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                          This is a warning alert.
                        </AlertDescription>
                      </Alert>
                      <Alert className="border-red-200 bg-red-50">
                        <X className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          This is an error alert.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Progress</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>33%</span>
                        </div>
                        <Progress value={33} />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="navigation" className="space-y-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Avatars</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src="/placeholder-avatar.jpg" />
                          <AvatarFallback>JD</AvatarFallback>
                        </Avatar>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>SM</AvatarFallback>
                        </Avatar>
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>AB</AvatarFallback>
                        </Avatar>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Separators</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm">Content above</p>
                          <Separator className="my-4" />
                          <p className="text-sm">Content below</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>

        {/* Iconography */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Iconography</h2>
              
              <Card>
                <CardHeader>
                  <CardTitle>Healthcare Icons</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-6">
                    <div className="text-center">
                      <Heart className="h-8 w-8 mx-auto mb-2 text-red-500" />
                      <p className="text-xs">Heart</p>
                    </div>
                    <div className="text-center">
                      <Shield className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <p className="text-xs">Shield</p>
                    </div>
                    <div className="text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p className="text-xs">Users</p>
                    </div>
                    <div className="text-center">
                      <Calendar className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                      <p className="text-xs">Calendar</p>
                    </div>
                    <div className="text-center">
                      <Stethoscope className="h-8 w-8 mx-auto mb-2 text-indigo-500" />
                      <p className="text-xs">Stethoscope</p>
                    </div>
                    <div className="text-center">
                      <Activity className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                      <p className="text-xs">Activity</p>
                    </div>
                    <div className="text-center">
                      <Bone className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                      <p className="text-xs">Bone</p>
                    </div>
                    <div className="text-center">
                      <GraduationCap className="h-8 w-8 mx-auto mb-2 text-teal-500" />
                      <p className="text-xs">Education</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Responsive Guidelines */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Responsive Guidelines</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Breakpoints</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Mobile</span>
                        <span className="text-sm font-mono text-muted-foreground">0px - 768px</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Tablet</span>
                        <span className="text-sm font-mono text-muted-foreground">768px - 1024px</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Desktop</span>
                        <span className="text-sm font-mono text-muted-foreground">1024px - 1280px</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Large Desktop</span>
                        <span className="text-sm font-mono text-muted-foreground">1280px+</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Container Sizes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Small</span>
                        <span className="text-sm font-mono text-muted-foreground">640px</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Medium</span>
                        <span className="text-sm font-mono text-muted-foreground">768px</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Large</span>
                        <span className="text-sm font-mono text-muted-foreground">1024px</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Extra Large</span>
                        <span className="text-sm font-mono text-muted-foreground">1280px</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">2X Large</span>
                        <span className="text-sm font-mono text-muted-foreground">1400px</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Mobile-First Approach</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      All designs start with mobile considerations and scale up. Key principles:
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Touch targets minimum 44px</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Readable text without zooming</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Thumb-friendly navigation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>Fast loading and performance</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Accessibility */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-8">Accessibility Guidelines</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Color Contrast</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Normal Text</span>
                        <span className="text-sm font-mono text-muted-foreground">4.5:1 minimum</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Large Text</span>
                        <span className="text-sm font-mono text-muted-foreground">3:1 minimum</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">UI Components</span>
                        <span className="text-sm font-mono text-muted-foreground">3:1 minimum</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Focus Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Focus Indicators</span>
                        <span className="text-sm font-mono text-muted-foreground">Visible</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Tab Order</span>
                        <span className="text-sm font-mono text-muted-foreground">Logical</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Skip Links</span>
                        <span className="text-sm font-mono text-muted-foreground">Available</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </StandardPage>
    </>
  );
};

export default DesignSystem;

