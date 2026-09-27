/**
 * Nom de l'application, en un seul endroit.
 *
 * ORVADIN est un nom de travail : la marque n'est pas déposée. Tout le texte
 * affiché à l'utilisateur passe donc par cette constante, pour qu'un futur
 * changement de marque se fasse ici et nulle part ailleurs.
 *
 * CE QUI NE PASSE PAS PAR ICI, VOLONTAIREMENT
 * ===========================================
 * Les identifiants techniques gardent leur valeur d'origine, parce que les
 * changer casserait quelque chose de concret :
 *
 *   - `com.coachvolley.app` (bundle iOS / package Android) — c'est l'identité
 *     de l'app auprès d'Apple et de Google. La changer crée une application
 *     différente : les installations existantes ne se mettraient jamais à jour.
 *   - `coach-volley` (slug Expo) — lié au projet EAS.
 *   - `coachvolley://` (schéma de lien profond) — inscrit dans les apps déjà
 *     installées et dans les URL de redirection autorisées côté Supabase. Le
 *     changer casserait la réinitialisation de mot de passe.
 *   - `coach-volley:*` (clés AsyncStorage) — changer la clé rendrait le cache
 *     déjà présent sur les téléphones inaccessible.
 *   - `project_id` de supabase/config.toml — lie le CLI au projet distant.
 *
 * Ces valeurs sont invisibles pour l'utilisateur : elles peuvent rester telles
 * quelles indéfiniment sans que personne ne s'en aperçoive.
 */
export const APP_NAME = "ORVADIN";
