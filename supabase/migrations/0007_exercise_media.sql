-- Coach Volley — vidéos d'exemple pour les exercices de la bibliothèque.
--
-- Chaque lien a été trouvé par une recherche web réelle (recherches
-- ciblées en français puis en anglais, recoupées sur plusieurs requêtes
-- indépendantes pour confirmer titre/chaîne/sujet) — aucun lien deviné ou
-- inventé. Important : dans cet environnement de build, l'accès direct à
-- youtube.com est bloqué par le proxy réseau, donc ces vidéos n'ont pas pu
-- être visionnées/ouvertes pour confirmation visuelle finale — seulement
-- recoupées via les extraits de résultats de recherche. Fais un rapide
-- contrôle de lecture après déploiement ; tu peux remplacer n'importe quel
-- lien à tout moment via Profil → Administration → Exercices.
--
-- Deux nuances signalées par la recherche, conservées car ce sont les
-- meilleurs matchs trouvés (pas des vidéos hors-sujet) :
--  - "Bloc à deux — coulissage central" : la vidéo trouvée traite le
--    footwork du contreur central en individuel plutôt qu'un exercice
--    explicitement à deux joueurs.
--  - "Pliométrie — sauts en contrebas" et "Gainage dynamique" : tutoriels
--    génériques de musculation (non spécifiques volley), mais le geste
--    technique montré est le bon.
--  - "Navette 6m — vitesse de déplacement" : pas de vidéo "navette 6m"
--    volley dédiée trouvée ; lien vers des exercices d'appuis/vitesse volley.
--
-- "Préparation compétition — simulation match" reste volontairement sans
-- vidéo : aucun match trouvé avec une confiance suffisante.

update public.exercises set media_url = 'https://www.youtube.com/watch?v=eUDY6AGS1-A' where name = 'Manchettes ciblées';
update public.exercises set media_url = 'https://www.youtube.com/watch?v=b5DS_RI5Zfc' where name = 'Déplacement + réception';
update public.exercises set media_url = 'https://www.youtube.com/watch?v=twMHJhUqo80' where name = 'Réception sous pression';
update public.exercises set media_url = 'https://www.youtube.com/watch?v=Mgug7BpVKTg' where name = 'Services ciblés';
update public.exercises set media_url = 'https://www.youtube.com/watch?v=50TUVvPLKr8' where name = 'Service smashé — puissance';
update public.exercises set media_url = 'https://www.youtube.com/watch?v=3aQgfk0VtEA' where name = 'Approche + attaque ligne droite';
update public.exercises set media_url = 'https://www.youtube.com/watch?v=cvK__ewJGKM' where name = 'Attaque en croisé + lecture de bloc';
update public.exercises set media_url = 'https://www.youtube.com/watch?v=u-V5R4pDkIE' where name = 'Bloc individuel — placement de mains';
update public.exercises set media_url = 'https://www.youtube.com/watch?v=amVtOHl4TAk' where name = 'Bloc à deux — coulissage central';
update public.exercises set media_url = 'https://www.youtube.com/watch?v=cprkyEDaWVY' where name = 'Squats sautés';
update public.exercises set media_url = 'https://www.youtube.com/watch?v=fL66hVKR89Q' where name = 'Pliométrie — sauts en contrebas';
update public.exercises set media_url = 'https://www.youtube.com/watch?v=hoPwUu8vvvw' where name = 'Gainage dynamique';
update public.exercises set media_url = 'https://www.youtube.com/watch?v=aAuv6FlvOKE' where name = 'Navette 6m — vitesse de déplacement';
update public.exercises set media_url = 'https://www.youtube.com/watch?v=JRrZvvX8M5w' where name = 'Plongeon et roulade défensive';
update public.exercises set media_url = 'https://www.youtube.com/watch?v=lEkr3qgIDlI' where name = 'Passe à 2 mains — précision';
update public.exercises set media_url = 'https://www.youtube.com/watch?v=PAtpLLUF6hY' where name = 'Circuit régularité — enchaînements';
update public.exercises set media_url = 'https://www.youtube.com/watch?v=sKfStLvgnMc' where name = 'Circuit global débutant';
