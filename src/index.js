import React from 'react';
import ReactDOM from 'react-dom';
import { RouterStore, startRouter } from './modules/router';

//mobx
import { Provider } from 'mobx-react';
import { Store } from './store/Store';

//router
import views from './config/views';

import App from './App';
import * as serviceWorker from './serviceWorker';
import { init } from 'd2';
import Loading from './components/Loading'
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const config = {};
if (process.env.NODE_ENV === 'development') {
    config.baseUrl = `https://mis.baylor-uganda.org/activity/api`; // Baylor
    config.headers = { Authorization: 'Basic YWRtaW46ZGlzdHJpY3Q=' }; // admin
} else {
    let baseUrl = '';
    let urlArray = window.location.pathname.split('/');
    let apiIndex = urlArray.indexOf('api');
    if (apiIndex > 1) {
        baseUrl = '/' + urlArray[apiIndex - 1] + '/';
    } else {
        baseUrl = '/';
    }
    baseUrl = window.location.protocol + '//' + window.location.host + baseUrl;
    config.baseUrl = baseUrl + 'api'
}

ReactDOM.render(<Loading />, document.getElementById('root'));
init(config).then(d2 => {
    d2.i18n.translations['id'] = 'Id';
    d2.i18n.translations['program_name'] = 'Program Name';
    d2.i18n.translations['program_type'] = 'Program Type';
    d2.i18n.translations['last_updated'] = 'Last Updated';
    d2.i18n.translations['last_run'] = 'Last Run';
    d2.i18n.translations['run'] = 'Run';
    d2.i18n.translations['schedule'] = 'Schedule';
    d2.i18n.translations['logs'] = 'Logs';
    d2.i18n.translations['delete'] = 'Delete';
    d2.i18n.translations['actions'] = 'Actions';
    d2.i18n.translations['display_name'] = 'Program Name';
    d2.i18n.translations['mapping_id'] = 'Mapping Id';
    d2.i18n.translations['name'] = 'Name';
    d2.i18n.translations['app_search_placeholder'] = 'Search Apps';
    d2.i18n.translations['manage_my_apps'] = 'Manage My Apps';
    d2.i18n.translations['settings'] = 'Settings';
    d2.i18n.translations['account'] = 'Account';
    d2.i18n.translations['profile'] = 'Profile';
    d2.i18n.translations['log_out'] = 'Logout';
    d2.i18n.translations['help'] = 'Help';
    d2.i18n.translations['about_dhis2'] = 'About DHIS2';
    d2.i18n.translations['aggregate_id'] = 'Id';
    d2.i18n.translations['upload'] = 'Upload';
    d2.i18n.translations['code'] = 'Code';
    d2.i18n.translations['download'] = 'Import from API';
    d2.i18n.translations['template'] = 'Download Mapping';
    d2.i18n.translations['year'] = 'Year';
    d2.i18n.translations['sixMonth'] = 'Six Month';
    d2.i18n.translations['jan-jun'] = 'Jan - Jun';
    d2.i18n.translations['jul-dec'] = 'Jul - Dec';

    d2.i18n.translations['assign_all'] = 'Assign all';
    d2.i18n.translations['hidden_by_filters'] = 'Hidden by filters';
    d2.i18n.translations['day'] = 'Day';

    d2.i18n.translations['year'] = 'Year';
    d2.i18n.translations['week'] = 'Week';
    d2.i18n.translations['day'] = 'Day';
    d2.i18n.translations['month'] = 'Month';
    d2.i18n.translations['quarter'] = 'Quarter';
    d2.i18n.translations['jan'] = 'January';
    d2.i18n.translations['feb'] = 'February';
    d2.i18n.translations['mar'] = 'March';
    d2.i18n.translations['apr'] = 'April';
    d2.i18n.translations['may'] = 'May';
    d2.i18n.translations['jun'] = 'June';
    d2.i18n.translations['jul'] = 'July';
    d2.i18n.translations['aug'] = 'August';
    d2.i18n.translations['sep'] = 'September';
    d2.i18n.translations['oct'] = 'October';
    d2.i18n.translations['nov'] = 'November';
    d2.i18n.translations['dec'] = 'December';
    d2.i18n.translations['Q1'] = 'Q1';
    d2.i18n.translations['Q2'] = 'Q2';
    d2.i18n.translations['Q3'] = 'Q3';
    d2.i18n.translations['Q4'] = 'Q4';
    d2.i18n.translations['mapping_name'] = 'Mapping Name';
    d2.i18n.translations['mapping_description'] = 'Mapping Description';
    d2.i18n.translations['last'] = 'Last Run';
    d2.i18n.translations['next'] = 'Next Run';
    d2.i18n.translations['created'] = 'Created';

    const store = Store.create({
        router: RouterStore.create({
            views: views
        })
    });
    store.setD2(d2);
    store.fetchUnits();
    store.loadOrgUnitGroups();
    store.loadOrgUnitLevels();
    store.fetchSections();
    startRouter(store.router);
    ReactDOM.render(<Provider store={store}>
        <App d2={d2} />
    </Provider>, document.getElementById('root'));
    serviceWorker.unregister();
})

// .catch(e => console.error);