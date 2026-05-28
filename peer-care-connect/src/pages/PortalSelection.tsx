import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Shield, ArrowRight, Star, Calendar, TrendingUp, User, Stethoscope } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import theramatemascot from "@/assets/theramatemascot.png";
import { BackButton } from "@/components/BackButton";
import { useState } from "react";

export const PortalSelection = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<'client' | 'professional' | null>(null);

  const handleRoleSelection = (role: 'client' | 'professional') => {
    setSelectedRole(role);
    // Store the intended role in sessionStorage for the auth flow
    sessionStorage.setItem('intendedRole', role);
  };

  const handleAuthAction = (action: 'login' | 'register') => {
    if (!selectedRole) return;
    
    if (action === 'login') {
      navigate('/login', { state: { intendedRole: selectedRole } });
    } else {
      navigate('/register', { state: { intendedRole: selectedRole } });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-wellness-50 to-wellness-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10">
              <img 
                src={theramatemascot} 
                alt="Theramate Mascot" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Theramate</h1>
            </div>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="mb-8">
            <BackButton />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Choose Your <span className="text-wellness-600">Portal</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select your role to access the right tools and features for your needs. 
            Each portal is designed specifically for your journey.
          </p>
        </div>

        {/* Portal Options */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto mb-16">
          {/* Client Portal */}
          <Card className={`group transition-all duration-300 transform hover:-translate-y-2 cursor-pointer ${
            selectedRole === 'client' 
              ? 'ring-2 ring-green-500 shadow-xl bg-green-50/50' 
              : 'hover:shadow-xl'
          }`}>
            <div 
              className="p-8 text-center"
              onClick={() => handleRoleSelection('client')}
            >
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors duration-300 ${
                selectedRole === 'client' 
                  ? 'bg-green-100' 
                  : 'bg-wellness-100 group-hover:bg-wellness-200'
              }`}>
                <User className={`w-12 h-12 transition-colors duration-300 ${
                  selectedRole === 'client' ? 'text-green-600' : 'text-wellness-600'
                }`} />
              </div>
              
              <h2 className={`text-3xl font-bold mb-4 transition-colors duration-300 ${
                selectedRole === 'client' 
                  ? 'text-green-600' 
                  : 'text-gray-900 group-hover:text-wellness-600'
              }`}>
                Client Portal
              </h2>
              
              <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                <strong>I'm seeking healthcare services</strong><br/>
                Find qualified professionals, book sessions, and track your wellness journey.
              </p>

              {/* Features */}
              <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Star className="w-4 h-4 text-green-500" />
                  <span>Verified Professionals</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-green-500" />
                  <span>Easy Booking</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span>Progress Tracking</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>Secure & Free</span>
                </div>
              </div>

              {selectedRole === 'client' && (
                <div className="space-y-3 mb-6">
                  <Button 
                    size="lg" 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAuthAction('login');
                    }}
                  >
                    <span>Sign In to Client Portal</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="w-full border-green-600 text-green-600 hover:bg-green-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAuthAction('register');
                    }}
                  >
                    <span>Create Client Account</span>
                  </Button>
                </div>
              )}

              {selectedRole !== 'client' && (
                <Button 
                  size="lg" 
                  className="w-full bg-green-600 hover:bg-green-700 text-white group-hover:bg-green-700 transition-colors duration-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRoleSelection('client');
                  }}
                >
                  <span>Select Client Portal</span>
                  <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              )}
            </div>
          </Card>

          {/* Professional Portal */}
          <Card className={`group transition-all duration-300 transform hover:-translate-y-2 cursor-pointer ${
            selectedRole === 'professional' 
              ? 'ring-2 ring-blue-500 shadow-xl bg-blue-50/50' 
              : 'hover:shadow-xl'
          }`}>
            <div 
              className="p-8 text-center"
              onClick={() => handleRoleSelection('professional')}
            >
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors duration-300 ${
                selectedRole === 'professional' 
                  ? 'bg-blue-100' 
                  : 'bg-blue-100 group-hover:bg-blue-200'
              }`}>
                <Stethoscope className={`w-12 h-12 transition-colors duration-300 ${
                  selectedRole === 'professional' ? 'text-blue-600' : 'text-blue-600'
                }`} />
              </div>
              
              <h2 className={`text-3xl font-bold mb-4 transition-colors duration-300 ${
                selectedRole === 'professional' 
                  ? 'text-blue-600' 
                  : 'text-gray-900 group-hover:text-blue-600'
              }`}>
                Professional Portal
              </h2>
              
              <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                <strong>I'm a healthcare professional</strong><br/>
                Manage your practice, exchange services, and grow your professional network.
              </p>

              {/* Features */}
              <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>Client Management</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span>Schedule Tools</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span>Credit Exchange</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Star className="w-4 h-4 text-blue-500" />
                  <span>Professional Development</span>
                </div>
              </div>

              {selectedRole === 'professional' && (
                <div className="space-y-3 mb-6">
                  <Button 
                    size="lg" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAuthAction('login');
                    }}
                  >
                    <span>Sign In to Professional Portal</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAuthAction('register');
                    }}
                  >
                    <span>Create Professional Account</span>
                  </Button>
                </div>
              )}

              {selectedRole !== 'professional' && (
                <Button 
                  size="lg" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white group-hover:bg-blue-700 transition-colors duration-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRoleSelection('professional');
                  }}
                >
                  <span>Select Professional Portal</span>
                  <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" />
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Additional Info */}
        <div className="text-center">
          <p className="text-gray-500 mb-4">
            Not sure which portal to use? 
            <Link to="/how-it-works" className="text-wellness-600 hover:text-wellness-700 ml-1 underline">
              Learn more about how Theramate works
            </Link>
          </p>
          
          <div className="flex justify-center gap-6 text-sm text-gray-500">
            <Link to="/about" className="hover:text-gray-700">About Us</Link>
            <Link to="/pricing" className="hover:text-gray-700">Pricing</Link>
            <Link to="/contact" className="hover:text-gray-700">Contact</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalSelection;
