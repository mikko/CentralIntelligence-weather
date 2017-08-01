const Promise = require('bluebird');
const Client = require('ci-client');
const config = require('./client-config.js');

const fmi = require('fmi-js');

const client = new Client(config);

const defaultLocation = 'Tampere';

const symbolMap = {
    1: "clear",
    2: "partly cloudy",
    21: "light rain showers",
    22: "rain showers",
    23: "heavy rain showers",
    3: "cloudy",
    31: "light rain",
    32: "rain",
    33: "heavy rain",
    41: "light snow showers",
    42: "snow showers",
    43: "heavy snow showers",
    51: "light snowfall",
    52: "snowfall",
    53: "heavy snowfall",
    61: "thundershowers",
    62: "strong thundershowers",
    63: "thunder",
    64: "heavy thunder",
    71: "light sleet showers",
    72: "sleet showers",
    73: "heavy sleet showers",
    81: "light sleet",
    82: "sleet",
    83: "heavy sleet",
    91: "utua",
    92: "haze",
};

const symbolToDesc = symbol => symbolMap[symbol];

const messageReceiver = (action, message, context, reply) => {
    const locations = message.locations.length > 0 ? message.locations: [defaultLocation];
    console.log('Getting weather for ', locations, message.dates, message.times);

    const observationPromises = Promise.all(locations.map(location => fmi.latestObservations(location)));
    const forecastPromises = Promise.all(locations.map(location => fmi.simpleForecast(location)));

    Promise.props({ observations: observationPromises, forecasts: forecastPromises })
        .then(results => {
            const { observations, forecasts } = results;
            const descriptions = forecasts.map(fc => symbolToDesc(fc.shift().weathersymbol3));

            const latestObservationsForLocation = observations.map((obs, i) => ({ location: locations[i], weather: obs.pop(), description: descriptions[i] }));

            const message = latestObservationsForLocation.map(obs => `Weather in ${obs.location} is ${obs.description} and ${obs.weather.temperature} degrees.`).join('. ');
            reply(message);
        });
};

client.setReceiver(messageReceiver);
