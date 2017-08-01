module.exports = {
    name: 'weather service',
    serverHost: 'localhost',
    serverPort: 3000,
    myHost: 'localhost',
    myPort: 3003,
    output: false,
    actions: {
        weather: {
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
