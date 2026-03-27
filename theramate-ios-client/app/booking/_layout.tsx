import { Stack } from "expo-router";
import { Colors } from "@/constants/colors";

export default function BookingModalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: "Book",
        headerTintColor: Colors.charcoal[900],
        headerStyle: { backgroundColor: Colors.cream[50] },
        contentStyle: { backgroundColor: Colors.cream[50] },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Book session" }} />
      <Stack.Screen
        name="choose-mode"
        options={{ title: "Choose booking mode" }}
      />
      <Stack.Screen
        name="mobile-request"
        options={{ title: "Request mobile booking" }}
      />
      <Stack.Screen name="find" options={{ title: "Find my booking" }} />
      <Stack.Screen
        name="view/[sessionId]"
        options={{ title: "Booking details" }}
      />
    </Stack>
  );
}
