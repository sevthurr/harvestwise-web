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
import { navigation } from './navigation.js';
import { dashboard } from './dashboard.js';
import { prices } from './prices.js';
import { commodityDetail } from './commodityDetail.js';
import { forecast } from './forecast.js';
import { assess } from './assess.js';
import { crops } from './crops.js';
import { cropCycle } from './cropCycle.js';
import { settings } from './settings.js';
import { profile } from './profile.js';
import { notifications } from './notifications.js';
import { about } from './about.js';
import { errors } from './errors.js';
import { emptyStates } from './emptyStates.js';

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
  },
  navigation,
  dashboard,
  prices,
  commodityDetail,
  forecast,
  assess,
  crops,
  cropCycle,
  settings,
  profile,
  notifications,
  about,
  errors,
  emptyStates
};
