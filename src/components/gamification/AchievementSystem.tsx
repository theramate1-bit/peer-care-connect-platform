import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Star, 
  Award, 
  Target, 
  Zap, 
  Heart, 
  Users, 
  Calendar,
  Clock,
  CheckCircle,
  Lock,
  Crown,
  Medal,
  Shield,
  Flame,
  Sparkles,
  TrendingUp,
  BookOpen,
  MessageCircle,
  CreditCard,
  MapPin
} from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'session' | 'social' | 'loyalty' | 'exploration' | 'milestone';
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirements: {
    type: string;
    target: number;
    current: number;
  };
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;
}

interface UserProfile {
  id: string;
  name: string;
  level: number;
  totalPoints: number;
  currentLevelPoints: number;
  nextLevelPoints: number;
  achievements: Achievement[];
  streak: number;
  rank: string;
  avatar: string;
}

interface AchievementSystemProps {
  userProfile: UserProfile;
  onAchievementUnlocked: (achievement: Achievement) => void;
  className?: string;
}

export const AchievementSystem: React.FC<AchievementSystemProps> = ({
  userProfile,
  onAchievementUnlocked,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false);

  const categories = [
    { id: 'all', name: 'All', icon: <Trophy className="h-4 w-4" /> },
    { id: 'session', name: 'Sessions', icon: <Calendar className="h-4 w-4" /> },
    { id: 'social', name: 'Social', icon: <Users className="h-4 w-4" /> },
    { id: 'loyalty', name: 'Loyalty', icon: <Heart className="h-4 w-4" /> },
    { id: 'exploration', name: 'Exploration', icon: <MapPin className="h-4 w-4" /> },
    { id: 'milestone', name: 'Milestones', icon: <Target className="h-4 w-4" /> }
  ];

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800';
      case 'rare': return 'bg-blue-100 text-blue-800';
      case 'epic': return 'bg-purple-100 text-purple-800';
      case 'legendary': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'common': return <Medal className="h-4 w-4" />;
      case 'rare': return <Award className="h-4 w-4" />;
      case 'epic': return <Crown className="h-4 w-4" />;
      case 'legendary': return <Trophy className="h-4 w-4" />;
      default: return <Medal className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'session': return <Calendar className="h-5 w-5" />;
      case 'social': return <Users className="h-5 w-5" />;
      case 'loyalty': return <Heart className="h-5 w-5" />;
      case 'exploration': return <MapPin className="h-5 w-5" />;
      case 'milestone': return <Target className="h-5 w-5" />;
      default: return <Trophy className="h-5 w-5" />;
    }
  };

  const filteredAchievements = userProfile.achievements.filter(achievement => {
    const categoryMatch = selectedCategory === 'all' || achievement.category === selectedCategory;
    const unlockedMatch = !showUnlockedOnly || achievement.unlocked;
    return categoryMatch && unlockedMatch;
  });

  const getLevelProgress = () => {
    return (userProfile.currentLevelPoints / userProfile.nextLevelPoints) * 100;
  };

  const getRankInfo = (level: number) => {
    if (level < 5) return { name: 'Beginner', color: 'text-gray-600', icon: <Star className="h-4 w-4" /> };
    if (level < 10) return { name: 'Explorer', color: 'text-blue-600', icon: <MapPin className="h-4 w-4" /> };
    if (level < 20) return { name: 'Practitioner', color: 'text-green-600', icon: <Heart className="h-4 w-4" /> };
    if (level < 30) return { name: 'Expert', color: 'text-purple-600', icon: <Crown className="h-4 w-4" /> };
    return { name: 'Master', color: 'text-yellow-600', icon: <Trophy className="h-4 w-4" /> };
  };

  const rankInfo = getRankInfo(userProfile.level);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* User Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {userProfile.avatar}
              </div>
              <div>
                <CardTitle className="text-2xl">{userProfile.name}</CardTitle>
                <div className="flex items-center space-x-2 mt-1">
                  {rankInfo.icon}
                  <span className={`font-semibold ${rankInfo.color}`}>{rankInfo.name}</span>
                  <Badge variant="outline">Level {userProfile.level}</Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{userProfile.totalPoints}</div>
              <div className="text-sm text-gray-600">Total Points</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Level Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Level Progress</span>
                <span>{userProfile.currentLevelPoints}/{userProfile.nextLevelPoints} points</span>
              </div>
              <Progress value={getLevelProgress()} className="h-3" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{userProfile.streak}</div>
                <div className="text-sm text-gray-600">Day Streak</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {userProfile.achievements.filter(a => a.unlocked).length}
                </div>
                <div className="text-sm text-gray-600">Achievements</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">
                  {userProfile.achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.points, 0)}
                </div>
                <div className="text-sm text-gray-600">Achievement Points</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="flex items-center space-x-1"
              >
                {category.icon}
                <span>{category.name}</span>
              </Button>
            ))}
            <div className="ml-auto">
              <Button
                variant={showUnlockedOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowUnlockedOnly(!showUnlockedOnly)}
              >
                {showUnlockedOnly ? <CheckCircle className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
                {showUnlockedOnly ? 'All' : 'Unlocked Only'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((achievement) => (
          <Card
            key={achievement.id}
            className={`transition-[border-color,background-color] duration-200 ease-out ${
              achievement.unlocked ? 'ring-2 ring-green-500 bg-green-50' : 'opacity-75'
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    achievement.unlocked ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {achievement.unlocked ? achievement.icon : <Lock className="h-5 w-5" />}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{achievement.title}</CardTitle>
                    <p className="text-sm text-gray-600">{achievement.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={getRarityColor(achievement.rarity)}>
                    {getRarityIcon(achievement.rarity)}
                    <span className="ml-1">{achievement.rarity}</span>
                  </Badge>
                  <div className="text-sm font-semibold text-blue-600 mt-1">
                    {achievement.points} pts
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  {getCategoryIcon(achievement.category)}
                  <span className="text-sm text-gray-600 capitalize">{achievement.category}</span>
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{achievement.requirements.current}/{achievement.requirements.target}</span>
                  </div>
                  <Progress value={achievement.progress} className="h-2" />
                </div>

                {achievement.unlocked && achievement.unlockedAt && (
                  <div className="text-xs text-green-600 flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3" />
                    <span>Unlocked {achievement.unlockedAt.toLocaleDateString()}</span>
                  </div>
                )}

                {!achievement.unlocked && (
                  <div className="text-xs text-gray-500">
                    {achievement.requirements.current} of {achievement.requirements.target} {achievement.requirements.type}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Achievement Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">Achievement Progress</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.slice(1).map((category) => {
                const categoryAchievements = userProfile.achievements.filter(a => a.category === category.id);
                const unlockedCount = categoryAchievements.filter(a => a.unlocked).length;
                const totalCount = categoryAchievements.length;
                
                return (
                  <div key={category.id} className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{unlockedCount}/{totalCount}</div>
                    <div className="text-sm text-gray-600">{category.name}</div>
                    <Progress value={(unlockedCount / totalCount) * 100} className="h-2 mt-2" />
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const AchievementNotification: React.FC<{
  achievement: Achievement;
  onClose: () => void;
  className?: string;
}> = ({ achievement, onClose, className = '' }) => {
  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm ${className}`}>
      <Card className="border-green-500 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Trophy className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-green-900">Achievement Unlocked!</h4>
              <p className="text-sm text-green-800">{achievement.title}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className="bg-green-200 text-green-800">
                  +{achievement.points} points
                </Badge>
                <Badge variant="outline" className="text-green-700">
                  {achievement.rarity}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AchievementSystem;
