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
  },
};
