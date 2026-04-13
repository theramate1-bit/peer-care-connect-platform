import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { Colors } from "@/constants/colors";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("RootErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: Colors.cream[50],
            padding: 24,
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700", color: Colors.charcoal[900] }}>
            Something went wrong
          </Text>
          <Text style={{ marginTop: 12, color: Colors.charcoal[600] }}>
            Theramate hit a JavaScript error during startup. Details below (dev builds only).
          </Text>
          <ScrollView style={{ marginTop: 20, maxHeight: 320 }}>
            <Text
              selectable
              style={{
                fontFamily: "Menlo",
                fontSize: 12,
                color: Colors.error,
              }}
            >
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}
