import React from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Mail, Lock, User } from "lucide-react-native";

import { useAuth } from "@/hooks/useAuth";
import { AuthBackHeader } from "@/components/AuthBackHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";

type SignupRole = "client" | "practitioner";

function parseSignupRole(raw: string | string[] | undefined): SignupRole {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "practitioner" || v === "client") return v;
  return "client";
}

const schema = z
  .object({
    firstName: z.string().min(2, "First name is required"),
    lastName: z.string().min(2, "Last name is required"),
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { role: roleParam } = useLocalSearchParams<{ role?: string }>();
  const signupRole = parseSignupRole(roleParam);
  const { signUp, signInWithOAuth, clearError, error, isLoading } = useAuth();

  const handleOAuth = async (provider: "google" | "apple") => {
    clearError();
    await signInWithOAuth(provider, { signupRole });
  };
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    clearError();
    const res = await signUp(
      values.email,
      values.password,
      values.firstName,
      values.lastName,
      signupRole,
    );
    if (res.success) {
      router.replace("/registration-success");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthBackHeader fallbackHref="/hero" label="Role selection" />
          <Text className="text-charcoal-900 text-3xl font-bold mt-2 mb-2">
            Create Account
          </Text>
          <Text className="text-sage-600 font-semibold mb-1">
            {signupRole === "practitioner"
              ? "Signing up as a practitioner"
              : "Signing up as a client"}
          </Text>
          <Text className="text-charcoal-500 mb-8">
            {signupRole === "practitioner"
              ? "Create your account to list services and manage clients."
              : "Join Theramate to book and track sessions."}
          </Text>

          <Controller
            control={control}
            name="firstName"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="First name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.firstName?.message}
                leftIcon={<User size={20} color={Colors.charcoal[400]} />}
              />
            )}
          />
          <Controller
            control={control}
            name="lastName"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Last name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.lastName?.message}
                leftIcon={<User size={20} color={Colors.charcoal[400]} />}
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email?.message}
                leftIcon={<Mail size={20} color={Colors.charcoal[400]} />}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                isPassword
                error={errors.password?.message}
                leftIcon={<Lock size={20} color={Colors.charcoal[400]} />}
              />
            )}
          />
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Confirm password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                isPassword
                error={errors.confirmPassword?.message}
                leftIcon={<Lock size={20} color={Colors.charcoal[400]} />}
              />
            )}
          />

          {error ? (
            <View className="bg-errorLight px-4 py-3 rounded-lg mb-4">
              <Text className="text-error text-sm">{error}</Text>
            </View>
          ) : null}

          <Button
            onPress={handleSubmit(onSubmit)}
            isLoading={isLoading}
            rightIcon={<ArrowRight size={18} color="#fff" />}
          >
            Create account
          </Button>

          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-charcoal-100" />
            <Text className="mx-4 text-charcoal-400 text-sm">or continue with</Text>
            <View className="flex-1 h-px bg-charcoal-100" />
          </View>

          <View className="space-y-3 mb-2">
            <Button
              variant="outline"
              onPress={() => void handleOAuth("google")}
              fullWidth
              className="mb-3"
            >
              Continue with Google
            </Button>
            {Platform.OS === "ios" ? (
              <Button
                variant="outline"
                onPress={() => void handleOAuth("apple")}
                fullWidth
              >
                Continue with Apple
              </Button>
            ) : null}
          </View>

          <View className="flex-row justify-center mt-6">
            <Text className="text-charcoal-500">Already have an account? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text className="text-sage-500 font-semibold">Sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
