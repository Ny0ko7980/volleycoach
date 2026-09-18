-- Coach Volley — extension de la bibliothèque d'exercices (16 nouveaux
-- exercices) pour couvrir davantage de variantes par poste, niveau et
-- objectif, en complément des 18 exercices de la migration 0003.

insert into public.exercises
  (name, description, positions, level, objective, duration_minutes, equipment, difficulty, instructions, common_mistakes, tips)
values
  ('Réception en diagonale', 'Réception après un appel de balle croisé, pour couvrir toute la largeur du terrain.',
   '{libero,outside_hitter}', 'avance', 'reception', 10, '{ballons}', 4,
   '4 séries de 8 réceptions sur des ballons envoyés en diagonale, alternance zone 1 et zone 5.',
   'Appuis parallèles au filet au lieu d''être orientés vers la trajectoire du ballon.',
   'Ouvre tes appuis vers l''endroit où tu comptes envoyer le ballon, pas vers celui d''où il vient.'),

  ('Service flottant — précision', 'Technique du service flottant (sans rotation) pour perturber la réception adverse.',
   '{setter,outside_hitter,opposite,middle_blocker,libero}', 'intermediaire', 'service', 10, '{ballons}', 3,
   '4 séries de 8 services flottants, contact sec au centre du ballon, sans accompagnement du bras après la frappe.',
   'Bras qui accompagne trop le ballon après le contact, ce qui lui donne de la rotation.',
   'Coupe net ton geste juste après le contact: c''est ce qui garde le ballon instable dans les airs.'),

  ('Attaque rapide au centre', 'Timing d''attaque rapide (bloc médium) synchronisé avec la passe basse.',
   '{middle_blocker}', 'avance', 'attaque', 12, '{ballons,filet}', 4,
   '5 séries de 6 attaques rapides sur passe basse et proche du passeur, appel dès que le ballon quitte les mains du passeur.',
   'Appel trop tardif qui fait arriver l''attaquant après le ballon.',
   'Commence ton appel sur la trajectoire du ballon vers le passeur, pas après la passe.'),

  ('Attaque de zone 2', 'Frappe en configuration pointu (zone 2), avec ou sans double bloc en face.',
   '{opposite,setter}', 'intermediaire', 'attaque', 12, '{ballons,filet}', 3,
   '4 séries de 8 attaques depuis la zone 2, en variant frappe longue ligne et croisée courte.',
   'Prise d''élan trop proche du filet, ce qui limite l''extension au contact.',
   'Recule ton point de départ d''un pas pour avoir plus d''élan avant l''appel.'),

  ('Lecture de passe et bloc extérieur', 'Anticipation du bloc extérieur à partir de la trajectoire de la passe adverse.',
   '{outside_hitter,opposite}', 'intermediaire', 'bloc', 10, '{filet}', 3,
   '4 séries de 8 sauts de bloc déclenchés uniquement après lecture de la direction de la passe adverse.',
   'Saut réflexe dès que l''attaquant arme, sans avoir lu la passe avant.',
   'Regarde la passe avant de regarder l''attaquant: elle te donne l''info une seconde plus tôt.'),

  ('Triple bloc — couverture large', 'Formation à trois bloqueurs pour couvrir une attaque en croisé ou en ligne.',
   '{middle_blocker,outside_hitter,opposite}', 'avance', 'bloc', 12, '{filet}', 4,
   '4 séries de 6 sauts de bloc à trois, le bloqueur central ferme la ligne selon l''appel du bloqueur extérieur.',
   'Bloqueurs qui sautent sans se synchroniser sur l''appel vocal du central.',
   'Le central donne la direction à voix haute avant le saut: "dehors" ou "ligne".'),

  ('Bondissements horizontaux', 'Renforcement explosif des jambes en poussée horizontale, complémentaire aux squats sautés.',
   '{setter,outside_hitter,opposite,middle_blocker,libero}', 'debutant', 'detente', 10, '{}', 2,
   '4 séries de 6 bonds horizontaux enchaînés, réception équilibrée avant le bond suivant.',
   'Réception déséquilibrée vers l''avant, perte d''appui au sol.',
   'Stabilise-toi complètement entre deux bonds avant de repartir, ne cherche pas l''enchaînement rapide au début.'),

  ('Mobilité chevilles et hanches', 'Routine de mobilité articulaire pour prévenir les blessures liées aux sauts répétés.',
   '{setter,outside_hitter,opposite,middle_blocker,libero}', 'debutant', 'global', 8, '{tapis}', 1,
   '3 séries de 10 rotations de cheville par côté, fentes dynamiques et cercles de hanches, à faire avant chaque séance de saut.',
   'Mouvements trop rapides qui perdent l''intérêt de la mobilisation articulaire.',
   'Fais chaque mouvement lentement et en contrôle, c''est la qualité du mouvement qui prévient la blessure, pas la vitesse.'),

  ('Réactivité visuelle — sprint sur signal', 'Temps de réaction et premier pas explosif déclenchés par un signal visuel.',
   '{libero,outside_hitter,setter}', 'intermediaire', 'vitesse', 8, '{}', 3,
   '5 séries de 5 sprints de 3 mètres déclenchés dès qu''un partenaire lève le bras (signal visuel aléatoire).',
   'Anticipation du signal au lieu d''une vraie réaction, fausse le travail.',
   'Demande à ton partenaire de varier le délai avant le signal pour que tu ne puisses pas anticiper.'),

  ('Changements de direction en T', 'Agilité et changements d''appuis rapides sur un parcours en T.',
   '{libero,outside_hitter,middle_blocker}', 'avance', 'vitesse', 12, '{plots}', 4,
   '4 séries d''un parcours en T: sprint avant, déplacement latéral droite, latéral gauche, recul, chronométré.',
   'Redressement du buste dans les changements de direction, perte de vitesse.',
   'Reste bas sur tes appuis pendant tout le parcours, surtout dans les changements de direction.'),

  ('Transition bloc-défense', 'Enchaînement rapide entre un saut de bloc et une position de défense au sol.',
   '{outside_hitter,opposite,middle_blocker}', 'avance', 'defense', 12, '{filet}', 4,
   '4 séries de 6 sauts de bloc suivis immédiatement d''un repli en position basse de défense sur le ballon suivant.',
   'Temps de réaction trop long après la réception au sol pour se remettre en position de défense.',
   'Pense "bloc puis recul" comme un seul geste continu, pas deux actions séparées.'),

  ('Lecture d''attaquant — anticipation défensive', 'Anticipation de la zone de frappe adverse à partir de la position du corps de l''attaquant.',
   '{libero,outside_hitter,opposite}', 'intermediaire', 'defense', 10, '{ballons,filet}', 3,
   '4 séries de 8 lectures de position d''attaquant (épaules, bras armé) suivies d''un déplacement vers la zone anticipée.',
   'Regarder uniquement le ballon au lieu du corps de l''attaquant, ce qui retarde la lecture.',
   'Fixe les épaules et le bras armé de l''attaquant: ils annoncent la direction de la frappe avant le ballon.'),

  ('Passe arrière — précision', 'Passe haute vers l''arrière (dos au filet) pour varier les zones d''attaque.',
   '{setter}', 'intermediaire', 'precision', 10, '{ballons}', 3,
   '4 séries de 12 passes arrière vers une cible fixe en zone 2, sans se retourner.',
   'Rotation du buste vers l''arrière au moment de la passe, ce qui la rend prévisible pour le bloc adverse.',
   'Garde les épaules face au filet: seul le mouvement des bras et des poignets envoie le ballon en arrière.'),

  ('Passe en suspension', 'Passe haute réalisée en sautant, pour gagner en rapidité de jeu et masquer l''intention.',
   '{setter}', 'avance', 'precision', 10, '{ballons}', 4,
   '4 séries de 10 passes hautes réalisées en sautant légèrement au moment du contact.',
   'Saut trop haut qui décale le timing de la passe suivante de l''attaquant.',
   'Le saut doit être discret: son but est la vitesse d''exécution, pas la hauteur.'),

  ('Double contact contrôlé', 'Enchaînement réception-passe sur soi-même pour travailler la régularité individuelle.',
   '{setter,outside_hitter,opposite,middle_blocker,libero}', 'debutant', 'regularite', 8, '{ballons}', 1,
   '3 séries de 15 enchaînements manchette puis passe à soi-même, sans faire tomber le ballon.',
   'Précipitation entre les deux contacts, perte de contrôle du ballon.',
   'Laisse le ballon monter complètement avant le deuxième contact, ne te précipite pas.'),

  ('Renforcement complet — circuit poids de corps', 'Circuit de renforcement musculaire général sans matériel, complémentaire au travail technique.',
   '{setter,outside_hitter,opposite,middle_blocker,libero}', 'intermediaire', 'global', 15, '{tapis}', 3,
   '4 tours d''un circuit: 15 squats, 10 pompes, 30 secondes de gainage, 10 fentes par jambe, 30 secondes de repos entre les tours.',
   'Enchaîner les tours sans respecter le temps de repos, dégradation rapide de la forme d''exécution.',
   'Priorise une exécution propre à chaque tour plutôt que d''aller plus vite: la qualité prévient les blessures.'),

  ('Circuit intermédiaire — 6 ateliers', 'Séance polyvalente niveau intermédiaire couvrant les six fondamentaux du jeu.',
   '{setter,outside_hitter,opposite,middle_blocker,libero}', 'intermediaire', 'global', 18, '{ballons,filet}', 3,
   'Rotation de 6 ateliers de 3 minutes: réception, service, passe, attaque, bloc, défense, en changeant de poste à chaque atelier.',
   'Rester toujours sur le même atelier plutôt que de tourner, ce qui limite la polyvalence recherchée.',
   'Change vraiment de poste à chaque atelier, même si ce n''est pas ton poste habituel: c''est ce qui construit ta compréhension globale du jeu.')
on conflict do nothing;
