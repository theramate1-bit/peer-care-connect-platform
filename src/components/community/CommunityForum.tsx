import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MessageCircle, 
  ThumbsUp, 
  ThumbsDown, 
  Reply, 
  Share, 
  Bookmark, 
  Flag,
  Search,
  Filter,
  Plus,
  Users,
  TrendingUp,
  Clock,
  Heart,
  Star,
  Award,
  Crown,
  Shield,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  QuestionMarkCircle,
  MessageSquare
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  avatar: string;
  role: 'client' | 'therapist' | 'admin';
  verified: boolean;
  level: number;
  badges: string[];
}

interface Post {
  id: string;
  title: string;
  content: string;
  author: User;
  category: 'general' | 'therapy' | 'wellness' | 'questions' | 'success' | 'tips';
  tags: string[];
  likes: number;
  dislikes: number;
  replies: number;
  views: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  isLiked?: boolean;
  isDisliked?: boolean;
  isBookmarked?: boolean;
}

interface Reply {
  id: string;
  content: string;
  author: User;
  postId: string;
  parentId?: string;
  likes: number;
  dislikes: number;
  createdAt: Date;
  isLiked?: boolean;
  isDisliked?: boolean;
}

interface CommunityForumProps {
  className?: string;
}

export const CommunityForum: React.FC<CommunityForumProps> = ({
  className = ''
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'trending'>('newest');
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'general' as const,
    tags: [] as string[]
  });

  const categories = [
    { id: 'all', name: 'All Topics', icon: <MessageCircle className="h-4 w-4" />, color: 'bg-gray-100' },
    { id: 'general', name: 'General Discussion', icon: <Users className="h-4 w-4" />, color: 'bg-blue-100' },
    { id: 'therapy', name: 'Therapy & Treatment', icon: <Heart className="h-4 w-4" />, color: 'bg-red-100' },
    { id: 'wellness', name: 'Wellness & Health', icon: <Award className="h-4 w-4" />, color: 'bg-green-100' },
    { id: 'questions', name: 'Questions & Help', icon: <QuestionMarkCircle className="h-4 w-4" />, color: 'bg-yellow-100' },
    { id: 'success', name: 'Success Stories', icon: <Star className="h-4 w-4" />, color: 'bg-purple-100' },
    { id: 'tips', name: 'Tips & Advice', icon: <Lightbulb className="h-4 w-4" />, color: 'bg-orange-100' }
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'therapist': return 'text-blue-600 bg-blue-100';
      case 'admin': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'therapist': return <Shield className="h-3 w-3" />;
      case 'admin': return <Crown className="h-3 w-3" />;
      default: return <Users className="h-3 w-3" />;
    }
  };

  const handleLike = (postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const wasLiked = post.isLiked;
        const wasDisliked = post.isDisliked;
        
        return {
          ...post,
          isLiked: !wasLiked,
          isDisliked: false,
          likes: wasLiked ? post.likes - 1 : post.likes + 1,
          dislikes: wasDisliked ? post.dislikes - 1 : post.dislikes
        };
      }
      return post;
    }));
  };

  const handleDislike = (postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const wasLiked = post.isLiked;
        const wasDisliked = post.isDisliked;
        
        return {
          ...post,
          isLiked: false,
          isDisliked: !wasDisliked,
          likes: wasLiked ? post.likes - 1 : post.likes,
          dislikes: wasDisliked ? post.dislikes - 1 : post.dislikes + 1
        };
      }
      return post;
    }));
  };

  const handleBookmark = (postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return { ...post, isBookmarked: !post.isBookmarked };
      }
      return post;
    }));
  };

  const handleSubmitPost = () => {
    if (!newPost.title || !newPost.content) return;

    const post: Post = {
      id: Date.now().toString(),
      title: newPost.title,
      content: newPost.content,
      author: {
        id: 'current-user',
        name: 'You',
        avatar: '👤',
        role: 'client',
        verified: true,
        level: 5,
        badges: ['newbie']
      },
      category: newPost.category,
      tags: newPost.tags,
      likes: 0,
      dislikes: 0,
      replies: 0,
      views: 0,
      isPinned: false,
      isLocked: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setPosts(prev => [post, ...prev]);
    setNewPost({ title: '', content: '', category: 'general', tags: [] });
    setShowNewPost(false);
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'popular':
        return b.likes - a.likes;
      case 'trending':
        return (b.likes + b.replies) - (a.likes + a.replies);
      default:
        return 0;
    }
  });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Community Forum</h1>
          <p className="text-gray-600">Connect, share, and learn with our community</p>
        </div>
        <Button onClick={() => setShowNewPost(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          New Post
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="newest">Newest</option>
                <option value="popular">Most Popular</option>
                <option value="trending">Trending</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category.id)}
            className={`flex items-center space-x-2 ${category.color}`}
          >
            {category.icon}
            <span>{category.name}</span>
          </Button>
        ))}
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {sortedPosts.map(post => (
          <Card key={post.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <Avatar>
                    <AvatarImage src={post.author.avatar} />
                    <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold">{post.title}</h3>
                      {post.isPinned && <Badge className="bg-yellow-100 text-yellow-800">Pinned</Badge>}
                      {post.isLocked && <Badge className="bg-red-100 text-red-800">Locked</Badge>}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span className="font-medium">{post.author.name}</span>
                      <Badge className={getRoleColor(post.author.role)} size="sm">
                        {getRoleIcon(post.author.role)}
                        <span className="ml-1 capitalize">{post.author.role}</span>
                      </Badge>
                      {post.author.verified && <CheckCircle className="h-3 w-3 text-blue-500" />}
                      <span>•</span>
                      <span>{post.createdAt.toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{post.views} views</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Flag className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4 line-clamp-3">{post.content}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id)}
                    className={post.isLiked ? 'text-blue-600' : ''}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    {post.likes}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDislike(post.id)}
                    className={post.isDisliked ? 'text-red-600' : ''}
                  >
                    <ThumbsDown className="h-4 w-4 mr-1" />
                    {post.dislikes}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Reply className="h-4 w-4 mr-1" />
                    {post.replies}
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Share className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleBookmark(post.id)}
                    className={post.isBookmarked ? 'text-yellow-600' : ''}
                  >
                    <Bookmark className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPost(post)}
                  >
                    View Discussion
                  </Button>
                </div>
              </div>

              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {post.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* New Post Modal */}
      {showNewPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Create New Post</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <Input
                  value={newPost.title}
                  onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="What's your post about?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={newPost.category}
                  onChange={(e) => setNewPost(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {categories.slice(1).map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Content</label>
                <Textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Share your thoughts..."
                  className="min-h-[200px]"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowNewPost(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitPost}>
                  Post
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CommunityForum;
