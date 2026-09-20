/**
 * Vérifie que les variables publiques dont le client a besoin sont présentes.
 *
 * Exécuté par `npm run env:check` et, surtout, par le hook `eas-build-pre-install`
 * sur les serveurs EAS. Les variables `EXPO_PUBLIC_*` sont figées dans le bundle
 * au moment de la compilation : si elles manquent pendant le build, l'IPA produit
 * est définitivement inutilisable, et le problème ne se voit qu'une fois
 * l'application installée. Mieux vaut faire échouer le build ici, avec un
 * message clair, que livrer un binaire cassé sur TestFlight.
 *
 * Node brut, sans dépendance : ce hook tourne avant `npm install`.
 *
 * Ce script ne lit que la PRÉSENCE des variables. Il n'affiche jamais leur
 * valeur, et n'en écrit aucune nulle part.
 */

const REQUIRED = ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"];

const missing = REQUIRED.filter((name) => !process.env[name]);

if (missing.length > 0) {
  const lines = [
    "",
    "  Configuration manquante — build interrompu.",
    "",
    `  ${missing.length > 1 ? "Variables absentes" : "Variable absente"} :`,
    ...missing.map((name) => `    - ${name}`),
    "",
    "  Ces variables sont intégrées au bundle à la compilation. Sans elles,",
    "  l'application se lance sur un écran « Configuration incomplète ».",
    "",
    "  En local   : copier .env.example vers .env et renseigner les valeurs.",
    "  Sur EAS    : les définir dans l'environnement du profil de build, avec",
    "               eas env:create --environment <development|preview|production>",
    "",
  ];
  console.error(lines.join("\n"));
  process.exit(1);
}

console.log(`Configuration présente : ${REQUIRED.join(", ")}`);
