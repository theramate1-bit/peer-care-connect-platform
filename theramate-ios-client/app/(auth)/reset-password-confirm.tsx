import React from "react";
import { View, Text, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { useAuth } from "@/hooks/useAuth";
import { AuthBackHeader } from "@/components/AuthBackHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordConfirmScreen() {
  const { updatePassword } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const res = await updatePassword(values.password);
      if (!res.success) {
        Alert.alert(
          "Could not update password",
          res.error || "Please try again.",
        );
        return;
      }
      Alert.alert(
        "Password updated",
        "You can now sign in with your new password.",
      );
      router.replace("/login");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <View className="flex-1 px-6 pt-4">
        <AuthBackHeader fallbackHref="/login" label="Sign in" />
        <Text className="text-charcoal-900 text-2xl font-bold mt-2">
          Set new password
        </Text>
        <Text className="text-charcoal-500 mt-2 mb-8">
          Enter your new password to continue.
        </Text>

        <Controller
          control={control}
          name="password"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="New password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              isPassword
              error={errors.password?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label="Confirm new password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              isPassword
              error={errors.confirmPassword?.message}
            />
          )}
        />

        <Button
          variant="primary"
          onPress={handleSubmit(onSubmit)}
          isLoading={submitting}
        >
          Save new password
        </Button>
      </View>
    </SafeAreaView>
  );
}
