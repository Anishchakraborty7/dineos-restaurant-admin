document.addEventListener('DOMContentLoaded', async () => {
  auth.requireAuth();
  document.getElementById('logoutBtn').addEventListener('click', e => { e.preventDefault(); if(confirm('Sign out?')) auth.logout(); });
  await loadProfile();
  setupSettingsForm();
});

async function loadProfile() {
  try {
    const res = await api.get('/admin/profile');
    const d   = res.data;
    // Restaurant info
    document.getElementById('settingName').value        = d.name || '';
    document.getElementById('settingOwnerName').value   = d.owner_name || '';
    document.getElementById('settingOwnerPhone').value  = d.owner_phone || '';
    document.getElementById('settingAddress').value     = d.address || '';
    document.getElementById('settingCity').value        = d.city || '';
    document.getElementById('settingState').value       = d.state || '';
    document.getElementById('settingPincode').value     = d.pincode || '';
    // Branding
    document.getElementById('settingPrimary').value     = d.primary_color || '#6366f1';
    document.getElementById('settingSecondary').value   = d.secondary_color || '#1e293b';
    document.getElementById('settingTagline').value     = d.tagline || '';
    document.getElementById('settingAbout').value       = d.about_text || '';
    document.getElementById('settingLogo').value        = d.logo_url || '';
    // Social
    document.getElementById('settingInstagram').value   = d.social_instagram || '';
    document.getElementById('settingFacebook').value    = d.social_facebook || '';
    document.getElementById('settingWhatsapp').value    = d.social_whatsapp || '';
    document.getElementById('settingMaps').value        = d.maps_link || '';
    // API key hint
    document.getElementById('apiKeyHint').textContent   = auth.getApiKey()?.substring(0, 20) + '...' || '—';
    // Features
    const features = d.features_enabled || {};
    for (const [key, val] of Object.entries(features)) {
      const el = document.getElementById(`feat_${key}`);
      if (el) el.checked = val;
    }
    // Plan info
    document.getElementById('planBadge').textContent = `${d.plan?.toUpperCase()} Plan`;
  } catch (err) { toast.error('Failed to load settings'); }
}

function setupSettingsForm() {
  // Color preview
  ['settingPrimary','settingSecondary'].forEach(id => {
    document.getElementById(id).addEventListener('input', e => {
      document.getElementById(id+'Preview').style.background = e.target.value;
    });
  });

  // Save profile
  document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    const payload = {
      owner_name:  document.getElementById('settingOwnerName').value.trim(),
      owner_phone: document.getElementById('settingOwnerPhone').value.trim(),
      address:     document.getElementById('settingAddress').value.trim(),
      city:        document.getElementById('settingCity').value.trim(),
      state:       document.getElementById('settingState').value.trim(),
      pincode:     document.getElementById('settingPincode').value.trim(),
    };
    try {
      await api.patch('/admin/profile', payload);
      toast.success('Profile saved!');
    } catch (err) { toast.error(err.message); }
  });

  // Save branding
  document.getElementById('saveBrandingBtn').addEventListener('click', async () => {
    const payload = {
      primary_color:   document.getElementById('settingPrimary').value,
      secondary_color: document.getElementById('settingSecondary').value,
      tagline:         document.getElementById('settingTagline').value.trim(),
      about_text:      document.getElementById('settingAbout').value.trim(),
      logo_url:        document.getElementById('settingLogo').value.trim(),
      social_instagram:document.getElementById('settingInstagram').value.trim(),
      social_facebook: document.getElementById('settingFacebook').value.trim(),
      social_whatsapp: document.getElementById('settingWhatsapp').value.trim(),
      maps_link:       document.getElementById('settingMaps').value.trim(),
    };
    try {
      await api.patch('/admin/profile', payload);
      toast.success('Branding saved! Restart your app to see changes.');
      applyBranding();
    } catch (err) { toast.error(err.message); }
  });

  // Save features
  document.getElementById('saveFeaturesBtn').addEventListener('click', async () => {
    const featCheckboxes = document.querySelectorAll('.feat-toggle');
    const features = {};
    featCheckboxes.forEach(cb => { features[cb.dataset.key] = cb.checked; });
    try {
      await api.patch('/admin/profile', { features_enabled: features });
      toast.success('Features updated!');
    } catch (err) { toast.error(err.message); }
  });

  // Change password
  document.getElementById('changePasswordBtn').addEventListener('click', async () => {
    const cur = document.getElementById('currentPassword').value;
    const nw  = document.getElementById('newPassword').value;
    const cnf = document.getElementById('confirmPassword').value;
    if (!cur || !nw || !cnf) { toast.error('All password fields are required.'); return; }
    if (nw !== cnf) { toast.error('New passwords do not match.'); return; }
    if (nw.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    try {
      await api.patch('/admin/auth/change-password', { current_password: cur, new_password: nw });
      toast.success('Password updated. You will need to login again.');
      document.getElementById('currentPassword').value = '';
      document.getElementById('newPassword').value = '';
      document.getElementById('confirmPassword').value = '';
      setTimeout(() => auth.logout(), 2000);
    } catch (err) { toast.error(err.message); }
  });

  // Copy API key
  document.getElementById('copyKeyBtn').addEventListener('click', async () => {
    const key = auth.getApiKey();
    await utils.copyToClipboard(key, document.getElementById('copyKeyBtn'));
  });
}