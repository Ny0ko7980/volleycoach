import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useAppTheme } from "@/hooks/useAppTheme";

interface Props {
  height?: number;
}

// Barre de progression indéterminée — pour une attente dont la durée n'est
// pas connue à l'avance (ex: chargement réseau d'une liste). Un segment
// coloré glisse en boucle sur toute la largeur, sur une piste discrète.
export function LinearProgress({ height = 3 }: Props) {
  const { theme } = useAppTheme();
  const translate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(translate, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [translate]);

  const translateX = translate.interpolate({
    inputRange: [0, 1],
    outputRange: ["-40%", "100%"],
  });

  return (
    <View style={[styles.track, { height, backgroundColor: theme.surfaceAlt }]}>
      <Animated.View
        style={[
          styles.bar,
          { height, backgroundColor: theme.primary, transform: [{ translateX }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: "100%", overflow: "hidden", borderRadius: 2 },
  bar: { width: "40%", borderRadius: 2 },
});
