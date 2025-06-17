db = db.getSiblingDB('vyral_cms');

db.createUser({
  user: 'vyral_user',
  pwd: 'vyral_password',
  roles: [
    {
      role: 'readWrite',
      db: 'vyral_cms'
    }
  ]
});