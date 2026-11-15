/* =====================================================
   Admin AERDZ — login, tableau, validation, CSV
   ===================================================== */

const vueLogin = document.getElementById('vue-login');
const vueDashboard = document.getElementById('vue-dashboard');
const formLogin = document.getElementById('form-login');
const btnLogout = document.getElementById('btn-logout');
const tbody = document.getElementById('tbody');
const recherche = document.getElementById('recherche');
const filtreStatut = document.getElementById('filtre-statut');
const btnExport = document.getElementById('btn-export');
const vide = document.getElementById('vide');

const modal = document.getElementById('modal');
const modalImg = document.getElementById('modal-img');

/* ---------- Session ---------- */
function afficherVue() {
  if (estConnecte()) {
    vueLogin.classList.add('hidden');
    vueDashboard.classList.remove('hidden');
    rafraichir();
  } else {
    vueLogin.classList.remove('hidden');
    vueDashboard.classList.add('hidden');
  }
}

/* ---------- Login ---------- */
formLogin.addEventListener('submit', (e) => {
  e.preventDefault();
  const pwd = document.getElementById('motdepasse').value;
  const err = document.querySelector('.error[data-for="motdepasse"]');
  if (verifierMotDePasse(pwd)) {
    err.textContent = '';
    connecter();
    document.getElementById('motdepasse').value = '';
    afficherVue();
  } else {
    err.textContent = "Mot de passe incorrect.";
  }
});
btnLogout.addEventListener('click', () => { deconnecter(); afficherVue(); });

/* ---------- Rendu ---------- */
function badgeStatut(s) {
  const map = {
    en_attente: { t: 'En attente', c: 'badge-attente' },
    valide: { t: 'Validé', c: 'badge-valide' },
    rejete: { t: 'Rejeté', c: 'badge-rejete' }
  };
  const x = map[s] || map.en_attente;
  return `<span class="badge-statut ${x.c}">${x.t}</span>`;
}

function avatarCell(i) {
  if (i.photo) return `<img class="avatar" src="${i.photo}" alt="photo" data-img="${i.photo}">`;
  const init = ((i.prenom?.[0] || '') + (i.nom?.[0] || '')).toUpperCase();
  return `<div class="avatar">${escapeHtml(init)}</div>`;
}

function actionsCell(i) {
  let html = '';
  if (i.statut === 'en_attente') {
    html += `<button class="btn-mini btn-valide" data-action="valider" data-id="${i.id}">Valider</button>`;
    html += `<button class="btn-mini btn-rejete" data-action="rejeter" data-id="${i.id}">Rejeter</button>`;
  } else if (i.statut === 'valide') {
    html += `<a class="btn-mini btn-voir" href="carte.html?num=${encodeURIComponent(i.numeroCarte)}" target="_blank">Voir la carte</a>`;
  } else if (i.statut === 'rejete') {
    html += `<button class="btn-mini btn-valide" data-action="valider" data-id="${i.id}">Réactiver</button>`;
  }
  return html;
}

function rafraichir() {
  const list = getInscriptions();
  const q = normaliser(recherche.value.trim());
  const st = filtreStatut.value;

  document.getElementById('stat-total').textContent = list.length;
  document.getElementById('stat-attente').textContent = list.filter(i => i.statut === 'en_attente').length;
  document.getElementById('stat-valide').textContent = list.filter(i => i.statut === 'valide').length;
  document.getElementById('stat-rejete').textContent = list.filter(i => i.statut === 'rejete').length;

  const filtres = list.filter(i => {
    if (st && i.statut !== st) return false;
    if (!q) return true;
    return normaliser([i.nom, i.prenom, i.filiere, i.niveau, i.email, i.telephone, i.transaction].join(' ')).includes(q);
  }).sort((a, b) => new Date(b.dateInscription) - new Date(a.dateInscription));

  tbody.innerHTML = filtres.map(i => `
    <tr>
      <td>${avatarCell(i)}</td>
      <td><strong>${escapeHtml(i.nom)}</strong><br><span style="color:var(--gris-texte);font-size:.85em">${escapeHtml(i.prenom)}</span></td>
      <td>${escapeHtml(i.filiere)}<br><span style="font-size:.82em;color:var(--gris-texte)">${escapeHtml(i.niveau)}</span></td>
      <td><a href="mailto:${escapeHtml(i.email)}">${escapeHtml(i.email)}</a><br><span style="font-size:.82em;color:var(--gris-texte)">${escapeHtml(i.telephone)}</span></td>
      <td>
        <div style="font-size:.82em;font-weight:600">Tx : ${escapeHtml(i.transaction || '—')}</div>
        ${i.recu ? `<img src="${i.recu}" alt="reçu" style="width:60px;height:40px;object-fit:cover;border-radius:6px;margin-top:4px;cursor:pointer;border:1px solid #ddd" data-img="${i.recu}">` : '<div style="font-size:.75em;color:#999">Pas de reçu</div>'}
      </td>
      <td>${badgeStatut(i.statut)}</td>
      <td>${i.numeroCarte ? `<code style="font-size:.78em">${escapeHtml(i.numeroCarte)}</code>` : '—'}</td>
      <td>${actionsCell(i)}</td>
    </tr>
  `).join('');

  vide.classList.toggle('hidden', filtres.length > 0);
  tbody.style.display = filtres.length ? '' : 'none';
}

/* ---------- Actions ---------- */
tbody.addEventListener('click', (e) => {
  const img = e.target.closest('img[data-img]');
  if (img) {
    modalImg.src = img.dataset.img;
    modal.classList.remove('hidden');
    return;
  }

  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;

  if (action === 'valider') {
    if (!confirm("Confirmer la validation ? Un numéro de carte sera généré.")) return;
    const numero = prochainNumeroCarte();
    updateInscription(id, { statut: 'valide', numeroCarte: numero, dateDelivrance: new Date().toISOString() });
    rafraichir();
  }
  if (action === 'rejeter') {
    if (!confirm("Confirmer le rejet ?")) return;
    updateInscription(id, { statut: 'rejete', numeroCarte: null, dateDelivrance: null });
    rafraichir();
  }
});

document.getElementById('modal-close').addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

/* ---------- Filtres ---------- */
recherche.addEventListener('input', rafraichir);
filtreStatut.addEventListener('change', rafraichir);

/* ---------- Export CSV ---------- */
btnExport.addEventListener('click', () => {
  const list = getInscriptions();
  const head = ['N° Carte', 'Nom', 'Prénom', 'Filière', 'Niveau', 'Téléphone', 'Email', 'Transaction Wave', 'Statut', 'Date inscription', 'Date délivrance'];
  const rows = list.map(i => [
    i.numeroCarte || '', i.nom, i.prenom, i.filiere, i.niveau, i.telephone, i.email,
    i.transaction || '',
    { en_attente: 'En attente', valide: 'Validé', rejete: 'Rejeté' }[i.statut] || i.statut,
    formatDate(i.dateInscription),
    i.dateDelivrance ? formatDate(i.dateDelivrance) : ''
  ]);
  const csv = '\ufeff' + [head, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inscriptions_aerdz_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

/* ---------- Changement mot de passe ---------- */
document.getElementById('form-pwd').addEventListener('submit', (e) => {
  e.preventDefault();
  const ancien = document.getElementById('ancien-pwd').value;
  const nouveau = document.getElementById('nouveau-pwd').value;
  const msg = document.getElementById('pwd-msg');
  if (!verifierMotDePasse(ancien)) {
    msg.textContent = "Ancien mot de passe incorrect."; msg.style.color = "var(--rouge)"; return;
  }
  if (nouveau.length < 6) {
    msg.textContent = "Min 6 caractères."; msg.style.color = "var(--rouge)"; return;
  }
  changerMotDePasse(nouveau);
  msg.textContent = "Mot de passe mis à jour ✓"; msg.style.color = "var(--vert)";
  document.getElementById('ancien-pwd').value = '';
  document.getElementById('nouveau-pwd').value = '';
});

afficherVue();