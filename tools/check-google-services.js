// Reports whether google-services.json can support Google sign-in at all.
// Prints shapes and counts, never the values.
const fs = require('fs');
const WANT = 'com.maites.recipes';
const j = JSON.parse(fs.readFileSync('android/app/google-services.json', 'utf8'));
const clients = j.client || [];
const names = clients.map(c => ((c.client_info || {}).android_client_info || {}).package_name).filter(Boolean);
const mine = clients.find(c => (((c.client_info || {}).android_client_info || {}).package_name) === WANT);

console.log('project:            ' + ((j.project_info || {}).project_id || '(none)'));
console.log('android packages:   ' + (names.join(', ') || '(none)'));

if (!mine) {
  console.log('::error::google-services.json has no Android app for ' + WANT
    + '. Add it in the Firebase console and download the file again.');
  process.exit(1);
}

const own = mine.oauth_client || [];
const others = (((mine.services || {}).appinvite_service || {}).other_platform_oauth_client) || [];
const types = [...own, ...others].map(o => o.client_type);
const hasAndroid = types.includes(1);
const hasWeb = types.includes(3);

console.log('oauth clients:      ' + (types.length ? types.map(t => t === 1 ? 'android(1)' : t === 3 ? 'web(3)' : 'type' + t).join(', ') : '(none)'));
console.log('android client:     ' + (hasAndroid ? 'present' : 'MISSING'));
console.log('web client:         ' + (hasWeb ? 'present' : 'MISSING'));

// Both of these produce DEVELOPER_ERROR (status 10) on the device, which
// is a dead end with nothing on screen to explain it. Better to stop here.
if (!hasAndroid) {
  console.log('::error::No android OAuth client for ' + WANT + '. Either no SHA-1 '
    + 'fingerprint is registered, or google-services.json was downloaded before it '
    + 'was added — adding the fingerprint does not update a file already downloaded. '
    + 'Download it again and update the GOOGLE_SERVICES_JSON secret.');
}
if (!hasWeb) {
  console.log('::error::No web OAuth client, so default_web_client_id will not exist '
    + 'and the sign-in plugin has no server client ID. Enable Google as a sign-in '
    + 'provider in Firebase Authentication, then download the file again.');
}
if (!hasAndroid || !hasWeb) process.exit(1);
console.log('Google sign-in is configured correctly.');
