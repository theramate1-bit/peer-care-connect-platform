import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  X, 
  Send, 
  Phone, 
  Mail, 
  Clock, 
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Shield,
  CreditCard,
  User as UserIcon
} from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'support';
  timestamp: Date;
  type?: 'text' | 'help' | 'success' | 'error';
}

interface CheckoutSupportProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep?: string;
  className?: string;
}

export const CheckoutSupport: React.FC<CheckoutSupportProps> = ({
  isOpen,
  onClose,
  currentStep = 'review',
  className = ''
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [supportAgent, setSupportAgent] = useState({
    name: 'Sarah',
    status: 'online',
    avatar: '👩‍💼'
  });

  const quickHelpTopics = [
    {
      id: 'payment-issues',
      title: 'Payment Problems',
      icon: <CreditCard className="h-4 w-4" />,
      description: 'Having trouble with payment?'
    },
    {
      id: 'booking-changes',
      title: 'Change Booking',
      icon: <Clock className="h-4 w-4" />,
      description: 'Need to modify your session?'
    },
    {
      id: 'account-help',
      title: 'Account Issues',
      icon: <UserIcon className="h-4 w-4" />,
      description: 'Problems with your account?'
    },
    {
      id: 'technical-support',
      title: 'Technical Help',
      icon: <HelpCircle className="h-4 w-4" />,
      description: 'App or website issues?'
    }
  ];

  const commonQuestions = [
    {
      question: 'Is my payment secure?',
      answer: 'Yes! We use 256-bit SSL encryption and are PCI DSS compliant. Your payment information is never stored on our servers.'
    },
    {
      question: 'Can I cancel my booking?',
      answer: 'You can cancel your booking up to 24 hours before your session for a full refund. Same-day cancellations may incur a small fee.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit/debit cards, Apple Pay, Google Pay, PayPal, and buy-now-pay-later options like Klarna and Clearpay.'
    },
    {
      question: 'How do I reschedule my session?',
      answer: 'You can reschedule your session by going to your bookings page or contacting us directly. We\'ll help you find a new time that works.'
    }
  ];

  useEffect(() => {
    if (isOpen) {
      // Add welcome message
      const welcomeMessage: Message = {
        id: '1',
        text: `Hi! I'm ${supportAgent.name}, your checkout assistant. I'm here to help you complete your booking. What can I help you with?`,
        sender: 'support',
        timestamp: new Date(),
        type: 'help'
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, supportAgent.name]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsTyping(true);

    // Simulate support response
    setTimeout(() => {
      const responses = [
        "I understand your concern. Let me help you with that right away.",
        "That's a great question! Here's what I can tell you...",
        "I can definitely help you with that. Let me check the details for you.",
        "Thanks for reaching out! I'm here to make sure your checkout goes smoothly."
      ];

      const supportMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responses[Math.floor(Math.random() * responses.length)],
        sender: 'support',
        timestamp: new Date(),
        type: 'help'
      };

      setMessages(prev => [...prev, supportMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleQuickHelp = (topic: any) => {
    const helpMessage: Message = {
      id: Date.now().toString(),
      text: `I'd like help with: ${topic.title}`,
      sender: 'user',
      timestamp: new Date(),
      type: 'help'
    };

    setMessages(prev => [...prev, helpMessage]);
    setIsTyping(true);

    setTimeout(() => {
      const supportMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `I'd be happy to help you with ${topic.title.toLowerCase()}. ${topic.description} Let me know what specific issue you're experiencing.`,
        sender: 'support',
        timestamp: new Date(),
        type: 'help'
      };

      setMessages(prev => [...prev, supportMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleCommonQuestion = (question: any) => {
    const questionMessage: Message = {
      id: Date.now().toString(),
      text: question.question,
      sender: 'user',
      timestamp: new Date(),
      type: 'help'
    };

    const answerMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: question.answer,
      sender: 'support',
      timestamp: new Date(),
      type: 'success'
    };

    setMessages(prev => [...prev, questionMessage, answerMessage]);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-4 z-50 ${className}`}>
      <Card className="w-full max-w-md h-[600px] flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Checkout Support</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">{supportAgent.name} is online</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.type === 'success'
                      ? 'bg-green-50 text-green-900 border border-green-200'
                      : message.type === 'error'
                      ? 'bg-red-50 text-red-900 border border-red-200'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="text-sm">{message.text}</div>
                  <div className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Help Topics */}
            {messages.length === 1 && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-700">Quick Help Topics:</div>
                <div className="grid grid-cols-2 gap-2">
                  {quickHelpTopics.map((topic) => (
                    <Button
                      key={topic.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickHelp(topic)}
                      className="h-auto p-3 flex flex-col items-start space-y-1"
                    >
                      {topic.icon}
                      <span className="text-xs font-medium">{topic.title}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Common Questions */}
            {messages.length <= 3 && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-700">Common Questions:</div>
                <div className="space-y-2">
                  {commonQuestions.slice(0, 2).map((q, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCommonQuestion(q)}
                      className="w-full h-auto p-2 text-left justify-start text-xs"
                    >
                      <HelpCircle className="h-3 w-3 mr-2 flex-shrink-0" />
                      {q.question}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex justify-center space-x-4 mt-3 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Phone className="h-3 w-3" />
                <span>Call: 0800 123 456</span>
              </div>
              <div className="flex items-center space-x-1">
                <Mail className="h-3 w-3" />
                <span>Email Support</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const CheckoutSupportButton: React.FC<{ onClick: () => void; className?: string }> = ({ 
  onClick, 
  className = '' 
}) => {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      className={`fixed bottom-4 right-4 z-40 shadow-lg ${className}`}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      Need Help?
    </Button>
  );
};

export default CheckoutSupport;
