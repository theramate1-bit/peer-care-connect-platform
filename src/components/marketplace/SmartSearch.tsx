/**
 * Smart Search Chat Component
 * iOS-style messaging interface for AI-powered practitioner recommendations
 */

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MessageSquare,
  Send,
  Sparkles,
  User,
  MapPin,
  Clock,
  Star,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { processUserInput, ConversationContext, RecommendationResult } from '@/lib/smart-search/matching-engine';

// Helper function to get initial greeting
const getInitialGreeting = (): { message: string; suggestions: string[] } => {
  return {
    message: "I want to understand your pain. Let's find the best service and the best practitioner for you. What can I help you with?",
    suggestions: [
      "I'm in pain",
      "I want relaxation/stress relief"
    ]
  };
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  recommendations?: RecommendationResult[];
}

interface SmartSearchProps {
  onPractitionerSelect: (practitioner: any) => void;
  onClose?: () => void;
}

export const SmartSearch: React.FC<SmartSearchProps> = ({
  onPractitionerSelect,
  onClose
}) => {
  // Initialize with greeting from matching engine
  const initialGreeting = getInitialGreeting();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: initialGreeting.message,
      timestamp: new Date(),
      suggestions: initialGreeting.suggestions
    }
  ]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationContext, setConversationContext] = useState<ConversationContext>({
    symptoms: [],
    detailedSymptoms: {
      location: [],
      characteristics: [],
      timing: [],
      severity: 0,
      duration: '',
      triggers: [],
      reliefFactors: [],
      impactOnDailyLife: []
    },
    location: null,
    urgency: null,
    preferences: {},
    detectedConditions: [],
    conversationHistory: [],
    // New fields for redesigned flow
    painType: null,
    injuryType: null,
    seenHealthcareProfessional: null,
    severity: null,
    stage: 'greeting'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldScrollRef = useRef(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (force: boolean = false) => {
    if (shouldScrollRef.current || force) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    // Only scroll when assistant messages are added, not when user sends a message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      // Don't auto-scroll if the message contains recommendations
      // This allows users to read the practitioner recommendations without being scrolled away
      const hasRecommendations = lastMessage.recommendations && lastMessage.recommendations.length > 0;

      if (!hasRecommendations) {
        // Only auto-scroll during conversation phase (no recommendations)
        shouldScrollRef.current = true;
        scrollToBottom();
      } else {
        // Recommendations are present - don't auto-scroll so users can read them
        shouldScrollRef.current = false;
      }
    } else {
      // User message - don't scroll
      shouldScrollRef.current = false;
    }
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async (message: string) => {
    if (!message.trim()) return;

    // Prevent scrolling when user sends message
    shouldScrollRef.current = false;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setInput('');

    try {
      // Process with AI matching engine
      const response = await processUserInput(message, conversationContext);

      // Simulate typing delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

      // Add assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        suggestions: response.suggestions,
        recommendations: response.recommendations
      };

      // Only allow auto-scrolling if there are no recommendations
      // If recommendations are present, don't scroll so users can read them
      const hasRecommendations = response.recommendations && response.recommendations.length > 0;
      shouldScrollRef.current = !hasRecommendations;

      setMessages(prev => [...prev, assistantMessage]);
      setConversationContext(response.updatedContext);

    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again or use the traditional search.",
        timestamp: new Date(),
        suggestions: ["Try again", "Use traditional search"]
      };
      // Allow scrolling for error messages (assistant role, no recommendations)
      shouldScrollRef.current = true;
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStageProgress = () => {
    const stages = ['greeting', 'pain_type_selection', 'acute_injury_flow', 'chronic_injury_flow', 'relaxation_flow', 'healthcare_professional_check', 'ready_for_recommendations'];
    const currentIndex = stages.indexOf(conversationContext.stage);
    const stageName = conversationContext.stage
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    return {
      current: currentIndex >= 0 ? currentIndex + 1 : 1,
      total: stages.length,
      stageName: stageName || 'Getting Started'
    };
  };

  const progress = getStageProgress();

  return (
    <div className="flex flex-col h-[600px] bg-background rounded-lg border shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">AI Smart Search</h3>
              <Badge variant="secondary" className="text-xs">Powered by AI</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Tell me what you need in plain English</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              handleSend("Show me all practitioners");
            }}
            className="text-xs"
          >
            Skip to Practitioners
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-2 bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{Math.round((progress.current / progress.total) * 100)}%</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="space-y-3">
            {/* Message Bubble */}
            <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Sparkles className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}

              <div className={`max-w-[75%] space-y-2`}>
                <div
                  className={`rounded-2xl px-4 py-3 ${message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                    }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>

                <div className={`text-xs text-muted-foreground ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {formatTime(message.timestamp)}
                </div>
              </div>

              {message.role === 'user' && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="bg-muted-foreground text-muted">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>

            {/* Quick Reply Suggestions */}
            {message.suggestions && message.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 ml-11">
                {message.suggestions.map((suggestion, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-xs h-8 px-3 rounded-full border-dashed hover:border-solid transition-[border-color] duration-200 ease-out"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            )}

            {/* Practitioner Recommendations */}
            {message.recommendations && message.recommendations.length > 0 && (
              <div className="ml-11 space-y-3">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Recommended Practitioners:
                </div>
                {message.recommendations.map((rec, idx) => (
                  <Card key={idx} className="p-4 transition-[border-color,background-color] duration-200 ease-out cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {rec.practitioner.first_name?.[0]}{rec.practitioner.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold text-sm">
                              {rec.practitioner.first_name} {rec.practitioner.last_name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {rec.suggestedService} • {rec.matchScore}% match
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-2">
                          {rec.reasons.slice(0, 2).map((reason, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {reason}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {rec.practitioner.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {rec.practitioner.location}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {rec.practitioner.experience_years} years exp
                          </div>
                          {rec.practitioner.average_rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {rec.practitioner.average_rating.toFixed(1)}
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => onPractitionerSelect(rec.practitioner)}
                        className="flex items-center gap-1"
                      >
                        <Calendar className="h-3 w-3" />
                        Book
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex gap-3 justify-start">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Try: 'sports injury in my shoulder' or 'massage therapist near London'..."
            className="flex-1 rounded-full border-0 bg-background focus:ring-1"
            disabled={isTyping}
          />
          <Button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isTyping}
            size="sm"
            className="rounded-full w-10 h-10 p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3 w-3" />
            <span>AI-powered matching • Just describe what you need</span>
          </div>
          <span>{messages.length} messages</span>
        </div>
      </div>
    </div>
  );
};
