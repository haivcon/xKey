# Rapport d'Examen du Projet xKey

Date d'examen : 2026-06-16
Version Actuelle : 5.7.0
Portée : code source React/Vite, Capacitor Android, stockage, sécurité, interface utilisateur, multilingue, build et direction du produit.

## 1. But du Proje

xKey est une application de gestion de coffre-fort de portefeuilles Web3 axée sur une utilisation hors ligne ("offline-first"). L'application permet aux utilisateurs de stocker des adresses de portefeuille, des clés privées, des phrases mnémoniques (seed phrases), des notes, des étiquettes, des dossiers, des codes QR, des fichiers de sauvegarde `.xkey`, des données CSV et les soldes d'actifs localement sur l'appareil.

L'objectif principal de xKey est d'être un "coffre-fort de clés privées" local, et non un portefeuille de transactions en ligne. Les utilisateurs peuvent utiliser xKey pour :

- Gérer plusieurs portefeuilles Web3 dans un coffre-fort chiffré.
- Stocker les clés privées et les phrases mnémoniques dans un format chiffré localement.
- Créer de nouveaux portefeuilles, importer des portefeuilles manuellement, générer des portefeuilles personnalisés (vanity) par préfixe/suffixe.
- Grouper les portefeuilles par dossiers, étiquettes, réseaux, état épinglé ou soldes.
- Sauvegarder/restaurer en utilisant des fichiers `.xkey` protégés par mot de passe.
- Exporter en CSV lorsque c'est nécessaire pour un inventaire ou un audit.
- Scanner, afficher, partager et télécharger des codes QR pour les adresses ou les données de portefeuille.
- Suivre les soldes manuellement dans des unités optionnelles telles que `$`, `USDT`, `VND`, `CNY`, `KRW`, `JPY`, `EUR`, `RUB`, `INR`, des points ou des étiquettes personnalisées.
- Utiliser l'Android Device Credential pour déverrouiller le coffre-fort avec l'empreinte digitale, le visage, le code PIN, le mot de passe ou le modèle de l'appareil.

## 2. Points Forts Actuels

### Sécurité et Stockage

- Les données du portefeuille sont chiffrées localement, ce qui correspond à l'objectif du coffre-fort hors ligne.
- Les champs sensibles comme les clés privées et les phrases mnémoniques sont en outre chiffrés au niveau du champ avant que l'ensemble de la liste des portefeuilles ne soit chiffré.
- La version native d'Android dispose d'un plugin Device Credential dédié, utilisant l'Android Keystore pour envelopper la clé du coffre.
- `android:allowBackup="false"` est configuré dans l'AndroidManifest, réduisant le risque de sauvegardes de données d'application non désirées.
- Comprend des mécanismes tels que le verrouillage automatique en cas d'inactivité, l'effacement automatique du presse-papiers, un écran de confidentialité lorsque l'application est inactive, et des demandes de mot de passe maître lors de l'affichage de données sensibles.
- Prend en charge l'effacement/réinitialisation (wipe/reset) lorsque le coffre rencontre une erreur critique.

### Expérience Utilisateur

- La page d'accueil prend en charge une mise en page réactive, avec une liste de portefeuilles à plusieurs colonnes sur les grands écrans et une optimisation pour les mobiles.
- Dispose d'une échelle d'affichage personnalisable de 5% à 200%, adaptée aux petits appareils ou aux utilisateurs souhaitant voir plus de données.
- Fournit des modes dense/compact/ultra compact pour la liste des portefeuilles.
- Les boutons pour copier, le code QR, développer le portefeuille, ajouter un portefeuille, les outils, la recherche, le filtre et le tri sont placés près du flux de travail réel.
- Comprend un dossier de portefeuilles personnalisés, des étiquettes NEW, un anneau lumineux pour les portefeuilles nouvellement créés et une navigation automatique vers le dossier contenant le nouveau portefeuille.
- Le module de modification de solde comprend la recherche, le collage, la copie d'adresse, l'importation de CSV, le filtre et l'enregistrement automatique des brouillons.
- Les toasts/confirmations ont été repensés pour paraître plus professionnels et ont tendance à s'adapter selon le ratio d'affichage.

### Fonctionnalités

- Créer des portefeuilles réguliers, importer manuellement et générer des portefeuilles personnalisés à l'aide d'un worker dédié.
- Sauvegarde `.xkey`, importation/exportation CSV, détecteur de doublons, analyses, outils avancés.
- Transfert de QR code protégé par mot de passe, scanner QR, partage/téléchargement QR.
- Prend en charge les réseaux populaires : XLAYER, ETH, BSC, Polygon, Arbitrum, Optimism, Solana, Tron, Base.
- Support multilingue avec 15 langues.
- La version est récupérée de `package.json`/informations sur l'application native et affichée dans l'application.

### Build et Android

- `npm run lint` se termine avec succès.
- `npm run build` se termine avec succès.
- `npx cap sync android` synchronise avec succès les ressources web vers Android.
- La version actuelle d'Android est `versionName "5.7.0"` et `versionCode 57`.
- `.gitignore` exclut correctement `1/`, les artefacts de build, les secrets de signature, `.xkey`, les APK/AAB et les fichiers locaux.

## 3. Faiblesses et Problèmes Potentiels

### Niveau Élevé

1. Les dépendances ont des avertissements de sécurité de `npm audit`.

   L'exécution de `npm audit --omit=dev` rapporte :

   - `vite 8.0.0 - 8.0.15` : gravité élevée, lié aux chemins Windows/UNC dans le serveur de développement.
   - `ws` via `ethers` : gravité élevée/modérée. `npm audit fix --force` suggère de rétrograder `ethers` à la version majeure 5, ce qui pourrait causer des changements incompatibles (breaking changes).

   Recommandation : Mettez à jour Vite de manière sécurisée dans la plage des patch/minor en premier. Pour `ethers/ws`, vérifiez s'il existe une version plus récente de `ethers` ou surchargez `ws` si cela est pris en charge en amont ; évitez d'utiliser aveuglément `--force`.

2. La version de publication (release) Android n'a pas activé shrink/minify.

   `android/app/build.gradle` contient actuellement `release { minifyEnabled false }`. Cela ne fait pas planter l'application, mais rend l'APK/AAB plus facile à rétro-ingénierier et plus volumineux.

   Recommandation : Essayez d'activer R8/ProGuard pour la release, ajoutez des règles de conservation (keep rules) pour Capacitor/plugins si nécessaire, et testez minutieusement avant la publication.

3. La clé AES de secours (fallback) est toujours stockée dans les Préférences.

   Le code stocke actuellement `xkey_aes_fallback` pour la récupération ou la compatibilité web/de secours. C'est un compromis pour réduire le risque de perte du coffre-fort lors du changement des méthodes de verrouillage de l'appareil, mais en termes de sécurité native Android, c'est plus faible que de garder la clé uniquement dans le Keystore.

   Recommandation : Séparez clairement les deux modes :
   - Mode Sécurisé Android : La clé n'est déballée (unwrapped) que via Keystore/device credential.
   - Mode Compatibilité : Conserve la clé de secours, avec un avertissement clair affiché à l'utilisateur.

4. Certaines traductions secondaires contiennent toujours des chaînes en anglais.

   Les vérifications automatiques montrent que de nombreuses locales comme `de`, `fr`, `es`, `hi`, `id`, `pt`, `tr`, `ar`, `th` ont encore des chaînes telles que `Remove master password?`, `Enter master password`, `Wrong password`, `Pinned`, `Unpin`, `Double AES-256 with biometrics`.

   Recommandation : Créez un script de vérification i18n dans CI pour faire échouer le build lorsqu'une locale manque de clés ou contient encore des clés brutes importantes.

### Niveau Moyen

1. Clés manquantes dans les locales pour plusieurs langues.

   Comparé à `en.js`, la plupart des locales autres que `vi` manquent de :
   - `common.warning`
   - `createWallet.vanityLongTitle`

   Parce que `LanguageContext` bascule sur l'anglais, l'application ne plante pas, mais l'expérience multilingue est incomplète.

2. `chainBulk` est une clé supplémentaire dans de nombreuses locales.

   De nombreuses locales ont le groupe `chainBulk.*`, mais `en.js` ne l'a pas. Ce sont peut-être des clés obsolètes ou non synchronisées. Bien qu'elles ne causent pas d'erreurs directes, elles rendent la gestion de la traduction difficile.

3. Le mode passphrase AES de CryptoJS n'est pas le standard de chiffrement le plus moderne.

   `CryptoJS.AES.encrypt(data, key)` fonctionne, mais n'est pas aussi explicite qu'un modèle standard avec des balises dédiées salt/KDF/IV/auth. AES-GCM ou WebCrypto serait plus facile à auditer.

   Recommandation à long terme : Migrez le format du coffre-fort vers WebCrypto AES-GCM, avec des paramètres PBKDF2/Argon2id explicitement définis, des charges utiles (payloads) versionnées et des balises d'authentification obligatoires.

4. Le mot de passe maître utilise PBKDF2 avec 10 000 itérations.

   Ce niveau est un peu bas par rapport aux normes actuelles pour la protection des données sensibles. Bien qu'il s'agisse d'un mot de passe secondaire pour afficher les clés privées/mots de départ et non la clé principale du coffre, il devrait tout de même être augmenté.

   Recommandation : Augmentez les itérations en fonction des benchmarks des appareils et stockez le hachage de la version afin que les migrations ne corrompent pas les anciennes données.

5. L'effacement automatique du presse-papiers n'est pas garanti de manière absolue sur toutes les plateformes.

   Le code vérifie si le presse-papiers contient toujours la bonne valeur avant de l'effacer, ce qui est une bonne approche. Cependant, Android/les navigateurs peuvent restreindre les écritures dans le presse-papiers lorsqu'elles ne sont pas déclenchées par un geste de l'utilisateur.

   Recommandation : Décrivez clairement dans l'interface utilisateur que "xKey tentera d'effacer le presse-papiers si le système d'exploitation le permet", sans promesses absolues.

6. Manque de tests automatisés pratiques.

   Le projet possède lint/build, mais manque de tests unitaires/e2e pour les flux critiques tels que le déverrouillage, l'import/export, la création de portefeuilles personnalisés, l'édition des soldes, les opérations du presse-papiers et l'i18n.

   Recommandation : Ajoutez des tests de fumée (smoke tests) en utilisant Playwright pour le Web et une liste de contrôle pour l'instrumentation Android/les tests manuels de publication.

### Niveau Faible

1. `console.error` subsiste à quelques endroits.

   Pas critique, mais devrait être regroupé dans un logger ou un environnement de développement uniquement pour éviter de fuiter des piles d'exécution inutiles en production.

2. Vite signale des morceaux (chunks) volumineux.

   Les morceaux `index` et `scan` sont volumineux. Ce n'est pas une erreur d'exécution, mais cela pourrait ralentir le chargement de l'application sur les appareils peu performants.

   Recommandation : Chargement différé (Lazy load) pour le scanner QR, les chemins lourds utilisant ethers, les outils avancés et les vues plus profondes du tableau de bord.

3. Certains éléments de l'interface utilisateur pourraient se briser à des ratios d'échelle très faibles ou très élevés.

   L'application gère bien la mise à l'échelle dans de nombreux domaines, mais les grands modules, les codes QR, les formulaires denses, les feuilles inférieures (bottom sheets) et les cartes de portefeuille ont encore besoin d'être testés à 5 %, 50 %, 75 %, 100 %, 150 % et 200 %.

## 4. Évaluation des Groupes de Fonctionnalités

### Sécurité de Déverrouillage

L'approche de l'Android Device Credential est correcte, car elle permet au système d'exploitation de gérer la biométrie et le repli sur le code PIN/mot de passe/modèle. Le risque principal réside dans la migration entre l'ancien mécanisme de code PIN, les clés de secours et les clés Keystore.

Recommandations :
- Fournissez un écran "Statut de Sécurité du Coffre-fort" : Android Secure, Web Fallback, Compatibility, nécessite la configuration du verrouillage de l'appareil.
- Si une clé invalidée est détectée, ne générez pas automatiquement une nouvelle clé de coffre si l'ancien coffre contient encore du texte chiffré ; guidez plutôt l'utilisateur vers la récupération/l'effacement.
- Enregistrez les statuts de déverrouillage internes sans consigner les données sensibles.

### Génération de Portefeuilles Personnalisés (Vanity)

L'utilisation d'un worker séparé est correcte car cela empêche l'interface utilisateur de geler. Les améliorations récentes comme la quantité de portefeuilles, la sauvegarde automatique dans un dossier, la pause du verrouillage automatique pendant la génération, les limites de temps et les avertissements de modèles trop longs sont toutes raisonnables.

Recommandations :
- Affichez clairement la probabilité/le temps estimé en fonction de la longueur du modèle.
- Autorisez la mise en pause/reprise/arrêt du processus.
- Enregistrez un historique des tâches générées afin que les utilisateurs sachent quels portefeuilles proviennent de quel lot.
- Fournissez de forts avertissements pour les modèles excessivement longs sur mobile.

### Modification du Solde des Actifs

Le flux de travail actuel convient aux utilisateurs qui vérifient les adresses sur les explorateurs de blocs puis saisissent manuellement les soldes. Les points forts incluent la recherche, la copie d'adresse, le collage, le filtre, la prise en charge des CSV et l'enregistrement automatique des brouillons.

Recommandations :
- Ajoutez un mode de "vérification étape par étape" : l'écran affiche 1 portefeuille à la fois, l'adresse complète, un bouton de copie, un lien vers l'explorateur par réseau et un grand champ de saisie.
- Autorisez le marquage comme "vérifié" pour éviter d'oublier des entrées.
- Autorisez les importations de CSV avec les colonnes `address,balance,unit,network`.
- Ajoutez une fonctionnalité d'annulation (undo) pour la dernière modification.

### Multilingue

Basculer sur l'anglais évite de casser l'interface utilisateur, mais un produit ciblant un public international nécessite un contrôle de traduction plus strict.

Recommandations :
- Créez un script `npm run i18n:check`.
- Signalez les clés manquantes, les clés supplémentaires et les clés de traduction brutes dans l'interface utilisateur.
- Priorisez les traductions précises pour les groupes concernant la sécurité, la sauvegarde, l'effacement, les clés privées et les phrases mnémoniques.

### Publication Android

La configuration actuelle est suffisante pour le build et la synchronisation, mais le durcissement (hardening) de la version finale fait défaut.

Recommandations :
- Activez minify pour la publication après les tests.
- Ajoutez une étape CI `npm audit --omit=dev` avec une liste d'autorisations (allowlist) claire.
- Compilez l'APK/AAB via GitHub Actions lors des soumissions de tags (tag pushes).
- Conservez les notes de version (release notes) versionnées dans le dépôt.

## 5. Idées de Mise à Niveau Proposées

### Court Terme

- Corrigez toutes les clés de traduction manquantes : `common.warning`, `createWallet.vanityLongTitle`.
- Nettoyez les chaînes en anglais qui subsistent dans les autres locales.
- Ajoutez un script de vérification i18n au CI.
- Mettez à jour Vite pour résoudre l'avis de sécurité actuel.
- Ajoutez une page "Statut de Sécurité" dans les paramètres.
- Ajoutez une note claire indiquant que l'effacement automatique du presse-papiers est un effort "au mieux" (best-effort).
- Ajoutez un bouton "Ouvrir dans l'explorateur" par réseau dans le module de modification de solde.
- Ajoutez des snackbars d'annulation (undo) pour la suppression de portefeuilles, la modification de solde et les changements de dossiers.

### Moyen Terme

- Migrez le format de chiffrement vers WebCrypto AES-GCM versionné.
- Séparez le Mode Sécurisé Android et le Mode Compatibilité.
- Ajoutez des tests de fumée (smoke tests) Playwright pour les flux principaux.
- Chargement différé (Lazy load) des scanners/analyses/outils avancés pour réduire la taille initiale du bundle.
- Ajoutez une fonctionnalité d'exportation/importation des paramètres qui exclut les données sensibles.
- Ajoutez un mode "Audit du Coffre-fort" : portefeuilles manquant de sauvegardes, adresses en double, réseaux manquants, noms manquants ou clés privées ne correspondant pas aux adresses.

### Long Terme

- Créez un guide de récupération officiel pour des scénarios tels que le changement d'appareils, le changement de verrous d'écran, la perte de données biométriques ou la perte de fichiers `.xkey`.
- Ajoutez un transfert multi-appareils chiffré via des codes QR en plusieurs parties ou des fichiers temporaires.
- Ajoutez une option uniquement basée sur le matériel (hardware-backed) pour les utilisateurs exigeant une haute sécurité.
- Ajoutez la validation d'adresse via checksum/réseau.
- Fournissez des modèles de sauvegarde papier : adresse, réseau, notes, à l'exclusion des clés privées si l'utilisateur le choisit.
- Meilleur support bureau/PWA si vous souhaitez utiliser xKey comme coffre-fort de bureau hors ligne.

## 6. Direction Future du Produi

xKey devrait poursuivre sur la voie d'un "coffre-fort hors ligne professionnel pour les utilisateurs disposant de nombreux portefeuilles". Il ne devrait pas être transformé prématurément en portefeuille de transactions en ligne, car cela augmenterait les risques de sécurité, les dépendances RPC, les vecteurs de phishing, les responsabilités de signature de transactions et les surfaces d'attaque.

Direction Appropriée :
1. Prioriser la sécurité des données : sauvegarde, restauration, migration, avertissements clairs, audit de coffre-fort.
2. Prioriser la gestion rapide de nombreux portefeuilles : dossiers, étiquettes, filtres, modifications par lots, CSV, QR, génération personnalisée.
3. Prioriser les fonctionnalités natives Android stables : Device Credential, Keystore, gestion du presse-papiers, sélecteur de fichiers, partage/téléchargement QR.
4. Prioriser une interface utilisateur dense mais claire : mise à l'échelle, mode compact, dispositions pour tablettes réactives, toasts courts, modules non bloquants.
5. Prioriser la transparence : Statut de sécurité, notes de version, contrôle de version explicite dans l'application, guides de sauvegarde et d'effacement.

## 7. Conclusion

Le projet repose sur une base solide : riche en fonctionnalités, approche "offline-first" claire, l'intégration des identifiants Android est sur la bonne voie, l'interface utilisateur est fortement optimisée pour les mobiles/tablettes et dispose d'un ensemble complet d'outils de gestion de portefeuilles.

Les principales priorités pour aller de l'avant ne sont pas d'ajouter de nombreuses nouvelles fonctionnalités, mais de rendre l'application "plus difficile à casser" :
- Achevez la mise en œuvre de l'i18n.
- Renforcez la version de publication Android.
- Clarifiez le modèle de sécurité Keystore/fallback.
- Ajoutez des tests automatisés pour les flux critiques.
- Gérez les audits de dépendances.
- Standardisez le format de chiffrement à long terme.

Si ces points sont bien abordés, xKey peut devenir un outil de coffre-fort hors ligne très fiable pour les utilisateurs gérant de multiples portefeuilles Web3.
