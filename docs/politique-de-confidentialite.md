# Politique de confidentialité — Coach Volley

**Dernière mise à jour : 20 septembre 2026**

Cette politique décrit les données que l'application mobile **Coach Volley**
collecte, pourquoi elle les collecte, avec qui elle les partage et comment vous
gardez la main dessus.

Elle est écrite pour être vérifiable : chaque donnée listée ci-dessous
correspond à une colonne réellement présente dans la base de données de
l'application. Rien n'est collecté « au cas où ».

---

## 1. Responsable du traitement

Le responsable du traitement est **Adrien Moine**, personne
physique, agissant à titre individuel.

Contact pour toute question ou demande relative à vos données :
**coachvolley.contact@gmail.com**

---

## 2. Âge minimum

L'application est réservée aux personnes de **15 ans ou plus**.

En France, c'est le seuil fixé en application de l'article 8 du RGPD : en
dessous, le traitement des données d'un mineur suppose le consentement conjoint
du titulaire de l'autorité parentale. Coach Volley ne met pas en œuvre de
recueil de ce consentement, et n'accepte donc pas d'inscription en dessous de
15 ans. Cette limite est appliquée à la fois à la saisie et dans la base de
données elle-même.

Si vous constatez qu'un compte a été créé par une personne de moins de 15 ans,
écrivez à l'adresse de contact ci-dessus : le compte sera supprimé.

---

## 3. Données collectées

### 3.1 Données de compte

| Donnée | Origine | Pourquoi |
|---|---|---|
| Adresse e-mail | Vous, à l'inscription | Identifier le compte, permettre la connexion et la réinitialisation du mot de passe |
| Mot de passe | Vous | Stocké uniquement sous forme de condensat (*hash*) par notre hébergeur. Il n'est jamais lisible, ni par nous, ni par personne |
| Dates de création et de dernière connexion | Automatique | Sécurité du compte |

### 3.2 Profil sportif

Pseudo, âge, taille, poste de jeu, niveau, nom du club, années d'expérience,
fréquence d'entraînement, objectifs sélectionnés.

Ces champs sont facultatifs à l'exception du pseudo. Ils servent exclusivement à
adapter les séances proposées à votre poste, votre niveau et vos objectifs.

### 3.3 Données d'entraînement

Séances générées et réalisées, date et durée, exercices effectués, difficulté
ressentie, niveau de fatigue, satisfaction, commentaires libres que vous
écrivez, ressenti par exercice, statistiques que vous saisissez vous-même
(réceptions, services, attaques, etc.), objectifs personnels et leur
progression, badges obtenus, expérience, niveau et série de jours consécutifs.

### 3.4 Coach IA

Le contenu des conversations que vous avez avec le Coach IA (vos questions et
ses réponses) est conservé pour que vous puissiez les relire. Un compteur du
nombre de messages envoyés par jour est également conservé, uniquement pour
faire respecter la limite d'usage décrite au point 5.

### 3.5 Équipe

Si vous rejoignez une équipe, votre appartenance à cette équipe est enregistrée.
Votre entraîneur peut alors consulter, pour les membres de son équipe
uniquement : le pseudo, le poste, le niveau et la série de jours d'entraînement.
**Il ne voit ni vos statistiques, ni vos objectifs, ni vos séances, ni vos
conversations avec le Coach IA**, et ne peut modifier aucune de vos données.

### 3.6 Ce que l'application ne collecte pas

Pour être explicite, et parce que beaucoup d'applications le font :

- **Aucune donnée de localisation.**
- **Aucun accès à l'appareil photo ni à vos photos.**
- **Aucun accès à vos contacts, à votre agenda, à votre microphone.**
- **Aucun outil de mesure d'audience, de statistiques d'usage ou de suivi
  publicitaire.** Pas de Google Analytics, pas de Firebase, pas de SDK
  publicitaire, pas d'identifiant publicitaire.
- **Aucun profilage publicitaire, aucune revente de données.** Vos données ne
  sont jamais vendues, louées ni échangées.
- **Aucune notification poussée depuis un serveur.** Les rappels d'entraînement
  sont programmés localement par votre téléphone ; aucun jeton de notification
  n'est transmis.

---

## 4. Bases légales (RGPD article 6)

| Traitement | Base légale |
|---|---|
| Création et gestion du compte, fourniture des séances, du suivi et du Coach IA | Exécution du contrat (art. 6.1.b) |
| Rappels d'entraînement par notification | Votre consentement (art. 6.1.a), révocable à tout moment dans les réglages |
| Limitation du nombre de requêtes au Coach IA, protection contre les abus | Intérêt légitime (art. 6.1.f) |

---

## 5. Destinataires et sous-traitants

Vos données ne sont accessibles qu'à vous, et transmises uniquement aux
prestataires techniques suivants :

### Supabase — hébergement de la base de données et authentification

L'ensemble de vos données est hébergé chez **Supabase**, dans un centre de
données situé dans **l'Union européenne**. Aucun transfert hors de l'Union
européenne n'a lieu pour le stockage.

L'accès est cloisonné par des règles de sécurité au niveau de chaque ligne de la
base (*Row Level Security*) : un compte ne peut techniquement lire ni modifier
les données d'un autre compte, indépendamment de l'application.

### Anthropic — génération des réponses du Coach IA

Lorsque vous posez une question au Coach IA et qu'elle nécessite une réponse
rédigée, les éléments suivants sont transmis à **Anthropic PBC** (États-Unis)
pour produire cette réponse :

- votre pseudo, votre poste, votre niveau et vos objectifs ;
- vos statistiques les plus récentes (au maximum les 15 dernières) ;
- vos séances les plus récentes (au maximum les 10 dernières) ;
- le texte de votre question.

**Ne sont jamais transmis** : votre adresse e-mail, votre mot de passe, votre
identifiant de compte, votre âge, votre club, ni l'historique de vos
conversations précédentes.

Ce transfert vers les États-Unis constitue un transfert hors Union européenne.
Il est encadré par les clauses contractuelles types de la Commission européenne
auxquelles Anthropic adhère. Anthropic indique ne pas utiliser les données
transmises par son API pour entraîner ses modèles.

Une partie des questions reçoit une réponse construite localement par
l'application, sans aucun appel à Anthropic. Dans ce cas, rien n'est transmis.

### Apple et Google — distribution de l'application

La distribution passe par l'App Store et Google Play, qui appliquent leurs
propres politiques de confidentialité sur les données de téléchargement et de
facturation. Nous n'y avons pas accès.

---

## 6. Durée de conservation

Vos données sont conservées **tant que votre compte existe**.

Lorsque vous supprimez votre compte depuis l'application (Profil → Réglages →
Supprimer mon compte), la suppression est **immédiate et définitive** :
identifiants, profil, séances, statistiques, objectifs, badges, ressentis,
scores et conversations avec le Coach IA sont effacés de la base de données dans
la même opération. Il n'y a ni corbeille, ni période de rétention, ni copie
conservée de notre côté.

Deux exceptions, qui ne contiennent plus aucune donnée vous concernant :

- si vous avez créé une équipe, celle-ci continue d'exister pour ses autres
  membres, sans entraîneur désigné — votre identifiant en est retiré ;
- si vous avez contribué un exercice à la bibliothèque partagée, l'exercice
  reste disponible pour les autres joueurs, sans lien avec vous.

Les sauvegardes techniques de l'hébergeur peuvent contenir vos données pendant
une courte période après la suppression, avant d'être écrasées par rotation.

---

## 7. Vos droits

Conformément au RGPD, vous disposez des droits suivants :

- **Accès** — obtenir une copie de vos données.
- **Rectification** — les corriger. La plupart sont modifiables directement dans
  l'application (Profil → Modifier mon profil).
- **Effacement** — supprimer votre compte et vos données, directement dans
  l'application, sans avoir à nous écrire ni à justifier votre demande.
- **Limitation** et **opposition** au traitement.
- **Portabilité** — recevoir vos données dans un format lisible par machine.
- **Retrait du consentement** aux notifications, à tout moment, dans les
  réglages de l'application.

Pour exercer un droit qui n'est pas directement accessible dans l'application,
écrivez à **coachvolley.contact@gmail.com**. Une réponse vous sera
apportée dans un délai d'un mois.

Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une
réclamation auprès de la **CNIL** (Commission nationale de l'informatique et des
libertés), 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 —
[www.cnil.fr](https://www.cnil.fr).

---

## 8. Sécurité

Les mesures techniques suivantes sont en place :

- chiffrement des échanges entre l'application et le serveur (HTTPS/TLS) ;
- mots de passe stockés sous forme de condensats, jamais en clair ;
- cloisonnement des données au niveau de la base : chaque requête est filtrée
  par des règles qui n'autorisent l'accès qu'aux lignes de votre propre compte.
  Ce cloisonnement est vérifié automatiquement par une suite de tests qui simule
  un joueur tentant de lire et de modifier les données d'un autre ;
- la clé d'accès à l'API du Coach IA est conservée côté serveur et n'est jamais
  embarquée dans l'application.

Aucun système n'est parfaitement sûr. En cas de violation de données
susceptible d'engendrer un risque élevé pour vos droits, vous serez informé
conformément à l'article 34 du RGPD.

---

## 9. Modifications

Cette politique peut être mise à jour. La date en tête de document indique la
dernière version. En cas de changement substantiel, vous en serez informé dans
l'application avant qu'il ne prenne effet.
