
import { createStore, combineReducers, applyMiddleware } from 'redux';

import createHistory from 'history/createHashHistory';

import { routerReducer, routerMiddleware } from 'react-router-redux';

import thunk from 'redux-thunk';

import { reduceWorkflows } from './reducers/workflows';

export const history = createHistory();

// Add the reducer to your store on the `router` key
// Also apply our middleware for navigating
export const store = (window.REDUX_STORE = createStore(
  combineReducers({
    workflows: reduceWorkflows,
    router: routerReducer
  }),
  applyMiddleware(
    thunk,
    routerMiddleware(history)
  )
));
