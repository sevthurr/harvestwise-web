import { advisory } from './advisory.js';
import { calendar } from './calendar.js';
import { plantingGuide } from './plantingGuide.js';
import { price } from './factors/price.js';
import { arrival } from './factors/arrival.js';
import { production } from './factors/production.js';
import { weather } from './factors/weather.js';
import { profitability } from './factors/profitability.js';
import { weatherActions } from './actions/weather.js';
import { monitoringActions } from './actions/monitoring.js';

export const farmer = {
  advisory,
  calendar,
  plantingGuide,
  factors: {
    price,
    arrival,
    production,
    weather,
    profitability
  },
  actions: {
    weather: weatherActions,
    monitoring: monitoringActions
  }
};
