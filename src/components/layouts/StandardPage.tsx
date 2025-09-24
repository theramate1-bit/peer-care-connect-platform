import React from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BackButton } from '@/components/BackButton';
import { Badge } from '@/components/ui/badge';

type StandardPageProps = {
  title: string;
  subtitle?: string;
  badgeText?: string;
  children: React.ReactNode;
  heroClassName?: string;
};

const StandardPage: React.FC<StandardPageProps> = ({ 
  title, 
  subtitle, 
  badgeText, 
  children, 
  heroClassName = "bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5" 
}) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className={`${heroClassName} py-12 sm:py-16 md:py-20 lg:py-24`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-4 sm:mb-6">
            <BackButton />
          </div>
          {badgeText && (
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
              {badgeText}
            </Badge>
          )}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </section>
      <main className="py-8 sm:py-12 md:py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StandardPage;


