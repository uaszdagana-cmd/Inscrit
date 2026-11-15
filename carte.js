/* =====================================================
   Consultation de la carte étudiant AERDZ
   ===================================================== */

const vueRecherche = document.getElementById('vue-recherche');
const vueCarte = document.getElementById('vue-carte');
const formRecherche = document.getElementById('form-recherche');
const msgRecherche = document.getElementById('msg-recherche');

function afficherMessage(txt, type = 'error') {
  msgRecherche.textContent = txt;
  msgRecherche.className = `alerte ${type}`;
  msgRecherche.classList.remove('hidden');
}

function afficherCarte(insc) {
  document.getElementById('c-nom-prenom').textContent = `${insc.nom.toUpperCase()} ${insc.prenom}`;
  document.getElementById('c-filiere').textContent = insc.filiere;
  document.getElementById('c-niveau').textContent = insc.niveau;
  document.getElementById('c-telephone').textContent = insc.telephone || '—';
  document.getElementById('c-annee').textContent = getAnneeUniversitaire();
  document.getElementById('c-num').textContent = insc.numeroCarte || '—';

  const photoDiv = document.getElementById('carte-photo');
  if (insc.photo) photoDiv.innerHTML = `<img src="${insc.photo}" alt="Photo">`;
  else photoDiv.innerHTML = '<span>Photo</span>';

  vueRecherche.classList.add('hidden');
  vueCarte.classList.remove('hidden');
}

function chercherParValeur(val) {
  const v = val.trim().toLowerCase();
  if (!v) return null;
  const list = getInscriptions();
  if (/^aerdz-\d{4}-\d{3}$/i.test(v)) {
    return list.find(i => (i.numeroCarte || '').toLowerCase() === v) || null;
  }
  return list.find(i => (i.email || '').toLowerCase() === v) || null;
}

formRecherche.addEventListener('submit', (e) => {
  e.preventDefault();
  const val = document.getElementById('recherche-val').value;
  const insc = chercherParValeur(val);

  if (!insc) { afficherMessage("Aucune demande trouvée. Vérifiez votre saisie.", 'error'); return; }
  if (insc.statut === 'en_attente') {
    afficherMessage("Votre demande est en attente de validation (paiement / infos). Revenez plus tard.", 'info'); return;
  }
  if (insc.statut === 'rejete') {
    afficherMessage("Votre demande a été rejetée. Contactez l'administration.", 'error'); return;
  }
  msgRecherche.classList.add('hidden');
  afficherCarte(insc);
});

window.addEventListener('DOMContentLoaded', () => {
  const num = new URLSearchParams(window.location.search).get('num');
  if (num) {
    const insc = getInscriptions().find(i => i.numeroCarte === num && i.statut === 'valide');
    if (insc) { afficherCarte(insc); return; }
  }
});

document.getElementById('btn-retour').addEventListener('click', () => {
  vueCarte.classList.add('hidden');
  vueRecherche.classList.remove('hidden');
  document.getElementById('recherche-val').value = '';
  msgRecherche.classList.add('hidden');
});