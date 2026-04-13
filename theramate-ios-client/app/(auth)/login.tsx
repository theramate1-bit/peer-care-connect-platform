/**
 * Login Screen
 * Email/password and OAuth login
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, ArrowRight } from 'lucide-react-native';

import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { getMainAppHref } from '@/lib/postAuthRoute';
import { AuthBackHeader } from '@/components/AuthBackHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/colors';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { signIn, signInWithOAuth, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    clearError();
    const result = await signIn(data.email, data.password);
    if (result.success) {
      await useAuthStore.getState().refreshProfile();
      const role = useAuthStore.getState().userProfile?.user_role;
      router.replace(getMainAppHref(role));
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    clearError();
    await signInWithOAuth(provider);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream[50] }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 py-8">
            <AuthBackHeader fallbackHref="/hero" label="Home" />
            {/* Header */}
            <View className="items-center mb-10">
              <View className="w-20 h-20 bg-sage-500 rounded-2xl items-center justify-center mb-4">
                <Text className="text-3xl text-white font-bold">T</Text>
              </View>
              <Text className="text-3xl font-bold text-charcoal-900 mb-2">
                Welcome Back
              </Text>
              <Text className="text-base text-charcoal-500 text-center">
                Sign in to continue to Theramate
              </Text>
            </View>

            {/* Form */}
            <View className="mb-6">
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Email"
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    leftIcon={<Mail size={20} color={Colors.charcoal[400]} />}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Password"
                    placeholder="Enter your password"
                    isPassword
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                    leftIcon={<Lock size={20} color={Colors.charcoal[400]} />}
                  />
                )}
              />

              <Link href="/forgot-password" asChild>
                <TouchableOpacity className="self-end mb-6">
                  <Text className="text-sage-500 font-medium">
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </Link>

              {error && (
                <View className="bg-errorLight px-4 py-3 rounded-lg mb-4">
                  <Text className="text-error text-sm">{error}</Text>
                </View>
              )}

              <Button
                onPress={handleSubmit(onSubmit)}
                isLoading={isLoading}
                fullWidth
                rightIcon={<ArrowRight size={20} color="#FFFFFF" />}
              >
                Sign In
              </Button>
            </View>

            {/* Divider */}
            <View className="flex-row items-center mb-6">
              <View className="flex-1 h-px bg-charcoal-100" />
              <Text className="mx-4 text-charcoal-400 text-sm">or continue with</Text>
              <View className="flex-1 h-px bg-charcoal-100" />
            </View>

            {/* OAuth Buttons */}
            <View className="space-y-3 mb-8">
              <Button
                variant="outline"
                onPress={() => handleOAuth('google')}
                fullWidth
                className="mb-3"
              >
                Continue with Google
              </Button>

              {Platform.OS === 'ios' && (
                <Button
                  variant="outline"
                  onPress={() => handleOAuth('apple')}
                  fullWidth
                >
                  Continue with Apple
                </Button>
              )}
            </View>

            {/* Sign Up Link */}
            <View className="flex-row justify-center">
              <Text className="text-charcoal-500">Don't have an account? </Text>
              <Link href="/register" asChild>
                <TouchableOpacity>
                  <Text className="text-sage-500 font-semibold">Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

