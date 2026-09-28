/**
 * Jour courant, au fuseau du téléphone, sous la forme `AAAA-MM-JJ`.
 *
 * Sert de composante de clé de cache pour tout ce qui est « du jour » : la
 * séance en cours, la proposition d'entraînement. Sans elle, une application
 * laissée ouverte pendant la nuit continuerait d'afficher le lendemain ce
 * qu'elle avait mis en cache la veille — et le joueur n'aurait pas de séance.
 *
 * Le fuseau local est le bon, et non UTC : c'est celui que les lectures
 * serveur utilisent pour borner leur journée (`setHours(0, 0, 0, 0)`). Les
 * deux doivent parler du même jour.
 */
export function localDayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
