import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Phone, Video, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at?: string;
}

interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at: string;
  participant1: {
    id: string;
    first_name: string;
    last_name: string;
    user_role: string;
  };
  participant2: {
    id: string;
    first_name: string;
    last_name: string;
    user_role: string;
  };
}

interface RealTimeMessagingProps {
  conversationId?: string;
  recipientId?: string;
  recipientName?: string;
}

const RealTimeMessaging: React.FC<RealTimeMessagingProps> = ({
  conversationId,
  recipientId,
  recipientName,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(conversationId || null);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    const checkViewport = () => setIsMobile(window.innerWidth < 768);
    checkViewport();
    window.addEventListener("resize", checkViewport);
    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (currentConversationId) {
      fetchMessages(currentConversationId);
    }
  }, [currentConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          id,
          participant1_id,
          participant2_id,
          last_message_at,
          participant1:users!conversations_participant1_id_fkey(id, first_name, last_name, user_role),
          participant2:users!conversations_participant2_id_fkey(id, first_name, last_name, user_role)
        `,
        )
        .or(
          `participant1_id.eq.${currentUser.id},participant2_id.eq.${currentUser.id}`,
        )
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      setConversations(data || []);

      // If we have a recipientId but no conversation, create one
      if (recipientId && !conversationId && data?.length === 0) {
        await createConversation(recipientId);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const createConversation = async (recipientId: string) => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { data, error } = await supabase
        .from("conversations")
        .insert({
          participant1_id: currentUser.id,
          participant2_id: recipientId,
          conversation_key: `${currentUser.id}_${recipientId}`,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentConversationId(data.id);
      await fetchConversations();
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to create conversation");
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentConversationId) return;

    setSending(true);
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: currentConversationId,
          sender_id: currentUser.id,
          recipient_id: getRecipientId(currentConversationId),
          content: newMessage.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setNewMessage("");

      // Update conversation last message
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", currentConversationId);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const getRecipientId = (conversationId: string): string => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation || !user) return "";

    return conversation.participant1_id === user.id
      ? conversation.participant2_id
      : conversation.participant1_id;
  };

  const getRecipientName = (conversationId: string): string => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation || !user) return "";

    const recipient =
      conversation.participant1_id === user.id
        ? conversation.participant2
        : conversation.participant1;

    return `${recipient.first_name} ${recipient.last_name}`;
  };

  const getRecipientRole = (conversationId: string): string => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation || !user) return "";

    const recipient =
      conversation.participant1_id === user.id
        ? conversation.participant2
        : conversation.participant1;

    return recipient.user_role;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderConversationList = () => (
    <div className="w-full md:w-80 border-b md:border-b-0 md:border-r">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Conversations</h3>
      </div>
      <ScrollArea className="h-[calc(100dvh-280px)] md:h-[600px]">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`p-4 border-b cursor-pointer hover:bg-muted/50 ${
              currentConversationId === conversation.id ? "bg-muted" : ""
            }`}
            onClick={() => setCurrentConversationId(conversation.id)}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {getRecipientName(conversation.id)
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {getRecipientName(conversation.id)}
                </div>
                <div className="text-sm text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {getRecipientRole(conversation.id).replace("_", " ")}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );

  const renderMessageArea = () => {
    if (!currentConversationId) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <div className="text-lg font-semibold mb-2">
              Select a conversation
            </div>
            <p>Choose a conversation from the list to start messaging</p>
          </div>
        </div>
      );
    }

    const recipientName = getRecipientName(currentConversationId);
    const recipientRole = getRecipientRole(currentConversationId);

    return (
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => setCurrentConversationId(null)}
              >
                Back
              </Button>
            )}
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {recipientName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold">{recipientName}</div>
              <Badge variant="outline" className="text-xs">
                {recipientRole.replace("_", " ")}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button variant="ghost" size="sm">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === user?.id ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender_id === user?.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <div className="text-sm">{message.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      message.sender_id === user?.id
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatTime(message.created_at)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              disabled={sending}
            />
            <Button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="h-[calc(100dvh-140px)] md:h-[700px] min-h-[560px] md:min-h-0">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading conversations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[calc(100dvh-140px)] md:h-[700px] min-h-[560px] md:min-h-0">
      <CardContent className="p-0 h-full">
        <div className="flex flex-col md:flex-row h-full">
          {(!isMobile || !currentConversationId) && renderConversationList()}
          {(!isMobile || currentConversationId) && renderMessageArea()}
        </div>
      </CardContent>
    </Card>
  );
};

export default RealTimeMessaging;
