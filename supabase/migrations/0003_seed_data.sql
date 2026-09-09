-- Coach Volley — données de départ: bibliothèque d'exercices + badges
-- Suffisant pour que le générateur de séances et le Coach IA fonctionnent
-- réellement dès l'installation, sans dépendre d'un admin qui remplit tout.

insert into public.exercises
  (name, description, positions, level, objective, duration_minutes, equipment, difficulty, instructions, common_mistakes, tips)
values
  ('Manchettes ciblées', 'Réception de balles envoyées à la main sur des zones précises.',
   '{libero,outside_hitter,setter}', 'debutant', 'reception', 8, '{ballons}', 2,
   '3 séries de 20 ballons envoyés à la main vers des zones marquées au sol. Plateforme stable, jambes fléchies.',
   'Bras qui montent trop haut, plateforme instable, recul au moment du contact.',
   'Garde les épaules devant les genoux et vise le passeur, pas le plafond.'),

  ('Déplacement + réception', 'Travail des appuis avant réception sous contrainte de déplacement.',
   '{libero,outside_hitter,opposite}', 'intermediaire', 'reception', 10, '{ballons}', 3,
   '4 séries de 10 réceptions après un déplacement latéral de 2-3 pas.',
   'Réception à l''arrêt sans se stabiliser, retard sur le placement des appuis.',
   'Anticipe la trajectoire dès la frappe adverse pour arriver stable avant le contact.'),

  ('Réception sous pression', 'Simulation de service smashé pour travailler les réflexes de réception.',
   '{libero,outside_hitter}', 'avance', 'reception', 12, '{ballons}', 4,
   '5 séries de 5 réceptions sur services frappés, alternance zones 1/5/6.',
   'Bras trop mous ou trop rigides, mauvaise lecture de trajectoire.',
   'Fixe le point de contact avec le ballon, pas le serveur.'),

  ('Services ciblés', 'Précision du service sur zones définies.',
   '{setter,outside_hitter,opposite,middle_blocker,libero}', 'debutant', 'service', 10, '{ballons}', 2,
   '4 séries de 8 services vers 4 zones différentes du terrain adverse.',
   'Lancer de balle irrégulier, tempo précipité.',
   'Standardise ton lancer de balle: même hauteur, même point à chaque fois.'),

  ('Service smashé — puissance', 'Développement de la puissance et de la régularité du service smashé.',
   '{outside_hitter,opposite,middle_blocker}', 'avance', 'service', 12, '{ballons}', 4,
   '5 séries de 6 services smashés en visant la profondeur du terrain.',
   'Armé du bras trop tardif, manque d''extension au contact.',
   'Travaille l''armé complet avant de chercher la puissance maximale.'),

  ('Approche + attaque ligne droite', 'Technique d''approche 3 appuis et frappe en ligne.',
   '{outside_hitter,opposite}', 'intermediaire', 'attaque', 12, '{ballons,filet}', 3,
   '4 séries de 8 attaques après ballon envoyé par le passeur, ligne droite uniquement.',
   'Appel trop tôt/trop tard, bras d''armé qui casse le rythme.',
   'Synchronise le dernier appui avec la montée du ballon envoyé par le passeur.'),

  ('Attaque en croisé + lecture de bloc', 'Diversification des angles d''attaque face à un bloc.',
   '{outside_hitter,opposite,middle_blocker}', 'avance', 'attaque', 15, '{ballons,filet}', 4,
   '5 séries de 6 attaques en variant croisé/ligne selon la position du bloqueur.',
   'Frappe systématique au même endroit, absence de lecture du bloc.',
   'Regarde les mains du bloqueur juste avant l''armé, pas avant.'),

  ('Bloc individuel — placement de mains', 'Travail du timing et du placement des mains au bloc.',
   '{middle_blocker,outside_hitter,opposite}', 'debutant', 'bloc', 10, '{filet}', 2,
   '4 séries de 8 sauts de bloc synchronisés avec un attaquant partenaire.',
   'Mains qui pénètrent trop tard le plan du filet, saut trop tôt.',
   'Les mains passent le filet juste après celles de l''attaquant, pas avant.'),

  ('Bloc à deux — coulissage central', 'Déplacement latéral rapide pour former un double bloc.',
   '{middle_blocker,outside_hitter,opposite}', 'intermediaire', 'bloc', 12, '{filet}', 3,
   '4 séries de 6 déplacements latéraux suivis d''un saut de bloc synchronisé.',
   'Pas croisé trop long, saut désynchronisé entre les deux bloqueurs.',
   'Communique à voix haute pour synchroniser l''appel de saut.'),

  ('Squats sautés', 'Renforcement explosif des membres inférieurs pour la détente.',
   '{setter,outside_hitter,opposite,middle_blocker,libero}', 'debutant', 'detente', 10, '{}', 2,
   '4 séries de 8 squats sautés avec réception amortie.',
   'Genoux qui rentrent vers l''intérieur à la réception.',
   'Contrôle la réception, ne cherche pas l''enchaînement rapide au début.'),

  ('Pliométrie — sauts en contrebas', 'Développement de la puissance réactive des jambes.',
   '{outside_hitter,opposite,middle_blocker}', 'avance', 'detente', 12, '{plyobox}', 4,
   '5 séries de 5 sauts en contrebas avec rebond immédiat le plus haut possible.',
   'Temps de contact au sol trop long, réception genoux verrouillés.',
   'Pense "sol brûlant": minimise le temps de contact au sol.'),

  ('Gainage dynamique', 'Renforcement du tronc pour la stabilité en vol et en défense.',
   '{setter,outside_hitter,opposite,middle_blocker,libero}', 'debutant', 'physique', 8, '{tapis}', 2,
   '3 séries de 30 secondes de gainage (planche, gainage latéral).',
   'Bassin qui s''affaisse, respiration bloquée.',
   'Respire normalement, ne bloque pas ta respiration pendant l''effort.'),

  ('Navette 6m — vitesse de déplacement', 'Amélioration de la vitesse de déplacement latéral.',
   '{libero,outside_hitter,setter}', 'intermediaire', 'vitesse', 10, '{plots}', 3,
   '5 séries de 6 allers-retours sur 6 mètres, récupération 30s.',
   'Redressement trop tôt en fin de course, foulées trop longues.',
   'Petits appuis rapides plutôt que grandes foulées pour les changements de direction.'),

  ('Plongeon et roulade défensive', 'Technique de plongeon pour sauver des ballons difficiles.',
   '{libero,outside_hitter,opposite}', 'avance', 'defense', 12, '{tapis}', 4,
   '4 séries de 6 plongeons latéraux avec roulade contrôlée.',
   'Réception du poids du corps sur les bras tendus (risque de blessure).',
   'Enchaîne toujours avec une roulade, n''amortis jamais sur les coudes.'),

  ('Passe à 2 mains — précision', 'Régularité et précision de la passe haute.',
   '{setter}', 'debutant', 'precision', 10, '{ballons}', 2,
   '4 séries de 15 passes hautes vers une cible fixe (zone 2 et zone 4).',
   'Passe trop en avant du corps, mains qui se referment trop tôt.',
   'Garde les mains en forme de "fenêtre" au-dessus du front avant le contact.'),

  ('Circuit régularité — enchaînements', 'Enchaînement réception-passe-attaque pour la régularité en match.',
   '{setter,outside_hitter,opposite,middle_blocker,libero}', 'avance', 'regularite', 15, '{ballons,filet}', 4,
   '5 séries d''un enchaînement complet réception → passe → attaque, sans pause entre les actions.',
   'Précipitation entre les actions, perte de posture après la réception.',
   'Reste sur les appuis après chaque action, ne te relève pas complètement entre deux gestes.'),

  ('Préparation compétition — simulation match', 'Séance type avant compétition, intensité proche du match.',
   '{setter,outside_hitter,opposite,middle_blocker,libero}', 'competition', 'competition', 20, '{ballons,filet}', 4,
   'Rotation complète des 6 postes avec points joués à thème (service + réception + attaque).',
   'Intensité trop faible par rapport au rythme réel de match.',
   'Simule la pression du match: annonce le score à voix haute pendant l''exercice.'),

  ('Circuit global débutant', 'Séance polyvalente pour progresser sur tous les fondamentaux.',
   '{setter,outside_hitter,opposite,middle_blocker,libero}', 'debutant', 'global', 15, '{ballons}', 1,
   'Rotation de 4 ateliers de 3 min: manchette, service, passe, déplacement.',
   'Vouloir aller trop vite, négliger la technique de base.',
   'Priorise la qualité du geste à la quantité de répétitions.')
on conflict do nothing;

insert into public.achievements (code, name, description, icon, criteria) values
  ('first_session', 'Première séance', 'Tu as complété ta toute première séance d''entraînement.', '🏐', '{"type":"session_count","value":1}'),
  ('streak_7', '7 jours consécutifs', 'Une semaine complète sans manquer un entraînement.', '🔥', '{"type":"streak","value":7}'),
  ('streak_30', '30 jours consécutifs', 'Un mois entier de régularité totale.', '⚡', '{"type":"streak","value":30}'),
  ('exercises_100', '100 exercices', 'Tu as complété 100 exercices au total.', '💯', '{"type":"exercise_count","value":100}'),
  ('new_record', 'Nouveau record', 'Tu as battu un de tes records personnels.', '🏆', '{"type":"personal_record","value":1}'),
  ('reception_regular', 'Réceptionneur régulier', '10 séances de réception complétées.', '🎯', '{"type":"objective_session_count","objective":"reception","value":10}'),
  ('sessions_10', 'Assidu', '10 séances complétées au total.', '📅', '{"type":"session_count","value":10}'),
  ('sessions_50', 'Pilier', '50 séances complétées au total.', '🧱', '{"type":"session_count","value":50}'),
  ('goal_achieved', 'Objectif atteint', 'Tu as atteint un de tes objectifs personnels.', '✅', '{"type":"goal_achieved","value":1}')
on conflict (code) do nothing;
