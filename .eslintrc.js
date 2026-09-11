module.exports = {
  extends: "expo",
  ignorePatterns: ["/dist/*"],
  rules: {
    // eslint-plugin-react-hooks@7 (tiré par eslint-config-expo pour le SDK 57)
    // ajoute cette règle à son preset "recommended". Elle signale notre motif
    // standard "setLoading(true) au début d'un fetch déclenché au montage et
    // réutilisé pour le pull-to-refresh" — un pattern sûr et très répandu,
    // pas le vrai risque de boucle de rendu que la règle cible. Désactivée
    // volontairement plutôt que de complexifier ~6 écrans pour la contourner.
    "react-hooks/set-state-in-effect": "off",
    // Même préset: signale le motif standard `useRef(new Animated.Value(x)).current`
    // (et `ref.interpolate(...)` dérivé) utilisé pour garder une valeur
    // Animated stable entre les rendus — c'est le pattern documenté par
    // React Native lui-même, pas une vraie lecture instable pendant le
    // rendu. Désactivée pour la même raison que la règle ci-dessus.
    "react-hooks/refs": "off",
    // Même préset: interdit tout Date.now()/new Date() dans le corps d'un
    // composant (utilisé ici pour un filtre "7j/30j/3mois/tout" et une
    // salutation selon l'heure) — pertinent pour le React Compiler, pas un
    // bug réel dans une app sans memoization agressive de ce type. Le
    // recalcul à chaque rendu est voulu et sans coût perceptible.
    "react-hooks/purity": "off",
  },
};
