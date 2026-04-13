import React from "react";
import { View, Text, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useAuth } from "@/hooks/useAuth";
import { AuthBackHeader } from "@/components/AuthBackHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const res = await resetPassword(values.email);
      if (!res.success) {
        Alert.alert(
          "Could not send reset email",
          res.error || "Please try again.",
        );
        return;
      }
      Alert.alert("Check your email", "Password reset instructions were sent.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <View className="flex-1 px-6 pt-4">
        <AuthBackHeader fallbackHref="/login" label="Sign in" />
        <Text className="text-charcoal-900 text-2xl font-bold mt-2">
          Forgot password
        </Text>
        <Text className="text-charcoal-500 mt-2 mb-8">
          Enter your account email and we will send reset instructions.
        </Text>

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
            />
          )}
        />

        <Button
          variant="primary"
          onPress={handleSubmit(onSubmit)}
          isLoading={submitting}
        >
          Send reset email
        </Button>

      </View>
    </SafeAreaView>
  );
}
