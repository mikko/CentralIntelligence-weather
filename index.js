const Promise = require('bluebird');
const Client = require('ci-client');
const Moment = require('moment');
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

const defaultTime = 15;
const forecastTimes = [ 8, 12, 16, 20 ];
const weekdays = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
];

const dateStrToMoment = (date) => {
    let forecast = true;
    let dateTerm = date || 'now';
    let customDate = '';
    const now = new Moment();

    // Assuming 'next saturday', 'next weekend' etc
    if (dateTerm.split(' ').length > 1) {
        dateParts = date.split(' ');
        dateTerm = 'custom';
        customDate = dateParts[1];
    }

    if (weekdays.indexOf(dateTerm.toLocaleLowerCase()) !== -1) {
        customDate = dateTerm;
        dateTerm = 'custom';
    }

    switch(dateTerm) {
        case 'tomorrow':
            return forecastTimes.map(hour => new Moment(now).add(1, 'day').hours(hour));
            break;
        case 'custom':
            const currentWeekday = now.isoWeekday();
            if (customDate === 'weekend') {
                customDate = 'saturday';
            }

            const wantedWeekday = new Moment().day(customDate).isoWeekday();

            if (forecast) {
                const thisWeek = wantedWeekday > currentWeekday;
                const daysForward = thisWeek ? wantedWeekday - currentWeekday : wantedWeekday - currentWeekday + 7;
                return forecastTimes.map(hour => new Moment(now).add(daysForward, 'day').hours(hour));
            }
            break;
        default:
            return [now];
    }
};

const getEntryByMoment = (list, moment) => {
    return list.find(entry => {
        const entryDate = new Moment(entry.time);
        if (moment.isSame(entryDate, 'hour')) {
            return entry;
        }
    })
};

const messageReceiver = (action, message, context, reply) => {
    const location = message.locations.length > 0 ? message.locations[0]: defaultLocation;
    const date = message.dates[0];
    console.log('Getting weather for ', location, date, message.times);

    const today = message.dates.length === 0;

    const dateMoments = dateStrToMoment(date);

    let fcStart;
    let fcEnd;

    if (!today) {
        fcStart = new Moment(dateMoments[0]).subtract(12, 'hours').toISOString();
        fcEnd = new Moment(dateMoments[dateMoments.length - 1]).add(12, 'hours').toISOString();
    }

    const observationPromises = fmi.latestObservations(location);
    const forecastPromises = fmi.simpleForecast(location, fcStart, fcEnd);

    Promise.props({ observations: observationPromises, forecast: forecastPromises })
        .then(results => {
            const { observations, forecast } = results;

            const forecastWithDescriptions = forecast.map(fc => Object.assign(fc, { description: symbolToDesc(fc.weathersymbol3) }));

            // Forecast
            if (!today) {
                const dateString = new Moment(dateMoments[0]).format("dddd");
                const messageStart = `${dateString} in ${location}\n`;
                const forecastMessages = dateMoments.map(hour => {
                    const correctForecast = getEntryByMoment(forecastWithDescriptions, hour);

                    if (correctForecast === undefined || correctForecast.description === undefined) {
                        return;
                    }

                    const hourString = new Moment(correctForecast.time).format("H:mm");
                    return `at ${hourString} ${correctForecast.description} and ${parseInt(correctForecast.temperature)} degrees`;
                }).filter(msg => msg !== undefined);

                if (forecastMessages.length === 0) {
                    reply(`No forecast available for ${date}`);
                    return;
                }

                const forecastStr = forecastMessages.join('\n');
                reply(`${messageStart}${forecastStr}`);

            } else { // Latest observation
                const latestObservation= observations.pop();
                const description = forecastWithDescriptions.shift().description;
                const message = `Weather in ${location} is currently ${description} and ${latestObservation.temperature} degrees.`;
                reply(message);
            }
        });
};

client.setReceiver(messageReceiver);
