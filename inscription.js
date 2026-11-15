/* =====================================================
   Formulaire d'inscription + paiement Wave
   ===================================================== */

const form = document.getElementById('form-inscription');
const alerte = document.getElementById('alerte');
const succes = document.getElementById('succes');

let photoDataUrl = null;
let recuDataUrl = null;

/* ---------- Aperçu photo ---------- */
const inputPhoto = document.getElementById('photo');
inputPhoto.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  photoDataUrl = null;
  document.getElementById('photo-preview').hidden = true;
  if (!file) return;
  if (!file.type.startsWith('image/')) { afficherErreurChamp('photo', "Le fichier doit être une image."); inputPhoto.value = ''; return; }
  if (file.size > 5 * 1024 * 1024) { afficherErreurChamp('photo', "Max 5 Mo."); inputPhoto.value = ''; return; }
  try {
    photoDataUrl = await compresserImage(file);
    document.getElementById('photo-img').src = photoDataUrl;
    document.getElementById('photo-preview').hidden = false;
    afficherErreurChamp('photo', '');
  } catch { afficherErreurChamp('photo', "Erreur de traitement."); }
});
document.getElementById('retirer-photo').addEventListener('click', () => {
  photoDataUrl = null; inputPhoto.value = '';
  document.getElementById('photo-preview').hidden = true;
});

/* ---------- Aperçu reçu Wave ---------- */
const inputRecu = document.getElementById('recu');
inputRecu.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  recuDataUrl = null;
  document.getElementById('recu-preview').hidden = true;
  if (!file) return;
  if (!file.type.startsWith('image/')) { afficherErreurChamp('recu', "Le fichier doit être une image."); inputRecu.value = ''; return; }
  if (file.size > 5 * 1024 * 1024) { afficherErreurChamp('recu', "Max 5 Mo."); inputRecu.value = ''; return; }
  try {
    recuDataUrl = await compresserImage(file, 700, 0.8);
    document.getElementById('recu-img').src = recuDataUrl;
    document.getElementById('recu-preview').hidden = false;
    afficherErreurChamp('recu', '');
  } catch { afficherErreurChamp('recu', "Erreur de traitement."); }
});
document.getElementById('retirer-recu').addEventListener('click', () => {
  recuDataUrl = null; inputRecu.value = '';
  document.getElementById('recu-preview').hidden = true;
});

/* ---------- Helpers ---------- */
function afficherErreurChamp(nom, msg) {
  const small = document.querySelector(`.error[data-for="${nom}"]`);
  const input = document.getElementById(nom);
  if (small) small.textContent = msg || '';
  if (input) input.classList.toggle('invalid', !!msg);
}
function afficherAlerte(msg, type = 'error') {
  alerte.textContent = msg;
  alerte.className = `alerte ${type}`;
  alerte.classList.remove('hidden');
  alerte.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ---------- Validation ---------- */
function validerFormulaire(data) {
  let ok = true;

  const validerNom = (nom, champ) => {
    if (!data[champ] || data[champ].trim().length < 2) {
      afficherErreurChamp(champ, `Le ${nom} est requis (2 car. min).`); return false;
    }
    if (!/^[A-Za-zÀ-ÿ' -]+$/.test(data[champ].trim())) {
      afficherErreurChamp(champ, `Le ${nom} ne doit contenir que des lettres.`); return false;
    }
    afficherErreurChamp(champ, ''); return true;
  };

  if (!validerNom('nom', 'nom')) ok = false;
  if (!validerNom('prénom', 'prenom')) ok = false;

  if (!data.filiere || data.filiere.trim().length < 2) { afficherErreurChamp('filiere', "Renseignez votre filière."); ok = false; }
  else afficherErreurChamp('filiere', '');

  if (!data.niveau) { afficherErreurChamp('niveau', "Choisissez votre niveau."); ok = false; }
  else afficherErreurChamp('niveau', '');

  const digits = (data.telephone || '').replace(/\D/g, '');
  if (!data.telephone) { afficherErreurChamp('telephone', "Téléphone requis."); ok = false; }
  else if (digits.length < 9 || digits.length > 15) { afficherErreurChamp('telephone', "Numéro invalide."); ok = false; }
  else afficherErreurChamp('telephone', '');

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!data.email) { afficherErreurChamp('email', "Email requis."); ok = false; }
  else if (!emailRe.test(data.email)) { afficherErreurChamp('email', "Format d'email invalide."); ok = false; }
  else afficherErreurChamp('email', '');

  if (!data.transaction || data.transaction.trim().length < 4) {
    afficherErreurChamp('transaction', "Numéro de transaction requis (min 4 car.)."); ok = false;
  } else afficherErreurChamp('transaction', '');

  return ok;
}

/* ---------- Soumission ---------- */
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const data = {
    nom: document.getElementById('nom').value.trim(),
    prenom: document.getElementById('prenom').value.trim(),
    filiere: document.getElementById('filiere').value.trim(),
    niveau: document.getElementById('niveau').value,
    telephone: document.getElementById('telephone').value.trim(),
    email: document.getElementById('email').value.trim().toLowerCase(),
    photo: photoDataUrl,
    transaction: document.getElementById('transaction').value.trim(),
    recu: recuDataUrl
  };

  if (!validerFormulaire(data)) {
    afficherAlerte("Certains champs sont incorrects. Vérifiez votre saisie.", 'error');
    return;
  }

  const existants = getInscriptions();
  if (existants.some(i => i.email === data.email)) {
    afficherAlerte("Une demande avec cet email existe déjà. Consultez « Ma carte ».", 'info');
    return;
  }

  try {
    addInscription(data);
    form.classList.add('hidden');
    alerte.classList.add('hidden');
    succes.classList.remove('hidden');
    succes.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    afficherAlerte("Erreur lors de l'enregistrement. Réessayez.", 'error');
    console.error(err);
  }
});