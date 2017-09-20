const fs = require('fs');

module.exports = {
    name: 'weather service',
    serverHost: process.env.SERVER_HOST || 'localhost',
    serverPort: process.env.SERVER_PORT || 3000,
    myHost: process.env.MY_HOST || 'localhost',
    myPort: process.env.MY_PORT || 3003,
    authKey: process.env.AUTH_KEY || fs.readFileSync('/run/secrets/authkey', { encoding: 'utf-8' }).trim(),
    output: false,
    trustedUserGroups: 'all',
    actions: {
        weather: {
            exactPhrase: 'weather',
            keywords: [
                {
                    word: 'weather',
                    type: 'noun'
                }
            ],
            entities: [
                'locations',
                'dates',
                'times'
            ]
        }
    }
};
