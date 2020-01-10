import { types, flow, getRoot, getParent } from "mobx-state-tree";
import React from 'react';
import { unionBy, fromPairs, flatten, uniq, groupBy, range, intersection, keys, min } from 'lodash';
import moment from 'moment';
import { generateUid } from '../../utils'
import { Icon, Menu, Dropdown, Button } from 'antd';
import views from '../../config/views'

export const Attribute = types.model("Attribute", {
    attribute: types.string,
    value: ''
});

export const Option = types.model("Option", {
    name: types.string,
    code: types.string
});

export const OptionSet = types.model("OptionSet", {
    options: types.array(Option)
});

export const DataElement = types.model("DataElement", {
    id: types.string,
    name: types.string,
    optionSet: types.maybeNull(OptionSet),
    valueType: types.string
});


export const TrackedEntityAttribute = types
    .model("TrackedEntityAttributes", {
        id: types.identifier,
        name: types.string,
        unique: false,
        optionSet: types.maybeNull(OptionSet)
    });

export const ProgramTrackedEntityAttributes = types.model("ProgramTrackedEntityAttributes", {
    trackedEntityAttribute: TrackedEntityAttribute,
    valueType: types.string,
    mandatory: false
});


export const ProgramStageDataElement = types.model("ProgramStageDataElement", {
    id: types.string,
    compulsory: false,
    dataElement: DataElement
});

export const Header = types.model("Header", {
    name: types.string,
    column: types.string,
    type: types.string,
    hidden: types.boolean,
    meta: types.boolean,
});

export const Row = types.model('Row', {
    data: types.array(types.string),
    event: types.optional(types.frozen(), {})
}).views(self => ({
    get getAttributes() {
        const program = getParent(self, 2);
        const data = program.programTrackedEntityAttributes.map(a => {

            const deIndex = program.headers.findIndex((x) => {
                return x.name === a.trackedEntityAttribute.id
            });

            let value = null;

            if (deIndex !== -1) {
                value = self.data[deIndex];
            }
            return [a.trackedEntityAttribute.id, value];
        });

        let attributes = fromPairs(data);

        const ouIndex = program.headers.findIndex((x) => {
            return x.name === 'ou'
        });
        return { ...attributes, organisationUnits: [self.data[ouIndex]], trackedEntityInstance: self.data[0] }
    },

    get previousReport() {
        const events = self.programStageData['gCp6ffVmx0g']
        if (events) {
            const e = events[0].dataValues.map(e => [e.dataElement, e.value]);
            return fromPairs(e);
        }
        return {}
    },

    get report() {
        const events = self.programStageData['gCp6ffVmx0g'] || [];
        const reports = events.map(({ dataValues, ...e }) => {
            const dv = dataValues.map(d => [d.dataElement, d.value]);
            return { ...e, ...fromPairs(dv) }
        });

        if (reports.length > 0) {
            return reports[0]
        }
        return {};
    },
    get actions() {
        const events = self.programStageData['eXOOIxW2cAZ'] || [];
        return events.map(({ dataValues, ...e }) => {
            const dv = dataValues.map(d => [d.dataElement, d.value]);
            return { ...e, ...fromPairs(dv) }
        })
    },

    get getData() {
        const store = getRoot(self);
        const data = store.plannedActivity.programTrackedEntityAttributes.map(a => {

            const deIndex = store.plannedActivity.headers.findIndex((x) => {
                return x.name === a.trackedEntityAttribute.id
            });

            let value = null;

            if (deIndex !== -1) {
                value = self.data[deIndex];
            }
            return [a.trackedEntityAttribute.id, value];
        });

        return fromPairs(data);
    },
    get activityStatusIndex() {
        const store = getRoot(self);
        return store.plannedActivity.headers.findIndex((x) => {
            return x.name === 'GeIEoCBrKaW'
        });

    },
    get activityStatus() {
        if (self.activityStatusIndex !== -1 && self.data.length > 1) {
            return self.data[self.activityStatusIndex]
        } else if (self.event.attributes) {
            const status = self.event.attributes.find(a => a.attribute === 'GeIEoCBrKaW');
            if (status) {
                return status.value;
            }
        }
        return null
    },
    get plannedStartDate() {
        const program = getParent(self, 2);
        const index = program.headers.findIndex((x) => {
            return x.name === 'eN9jthkmMds'
        });
        if (index !== -1) {
            return moment(self.data[index])
        }
        return null
    },
    get currentStatus() {
        let canImplement = false;
        const today = moment();
        let cls = '';

        if (self.activityStatus === 'On Schedule' && self.plannedStartDate && self.plannedStartDate.diff(today, 'days') <= 0) {
            cls = 'Overdue';
        } else if (self.activityStatus === 'On Schedule' && self.plannedStartDate && self.plannedStartDate.diff(today, 'days') <= 7) {
            cls = 'Upcoming';
        }
        else if (self.activityStatus === 'On Schedule' && self.plannedStartDate && self.plannedStartDate.diff(today, 'days') > 7) {
            cls = 'OnSchedule';
        } else if (self.activityStatus === 'Report Submitted') {
            cls = 'ReportSubmitted';
        } else if (self.activityStatus === 'Report Approved') {
            cls = 'ReportApproved';
        } else if (self.activityStatus === 'Ongoing') {
            cls = 'Ongoing';
        } else if (self.activityStatus === 'Implemented') {
            cls = 'Implemented';
        } else if (self.activityStatus === 'Upcoming') {
            cls = 'Upcoming';
        } else if (self.plannedStartDate && self.plannedStartDate.diff(today, 'days') <= 0) {
            cls = 'Overdue';
        } else if (self.plannedStartDate && self.plannedStartDate.diff(today, 'days') <= 7) {
            cls = 'Upcoming';
        } else if (self.plannedStartDate && self.plannedStartDate.diff(today, 'days') > 7) {
            cls = 'OnSchedule';
        }

        if (self.activityStatus === 'Overdue' || self.activityStatus === 'Upcoming' || self.activityStatus === 'On Schedule' || !self.activityStatus) {
            canImplement = true;
        }
        return {
            canImplement,
            cls
        }
    },
    get disableSubmit() {
        console.log(self.activityStatus);
        return self.activityStatus === 'Report Approved'
    },
    get canFinishImplementing() {
        return self.activityStatus === 'Ongoing'
    },
    get canAddReport() {
        return self.activityStatus === 'Implemented'
    },
    get canViewAndEditReport() {
        return self.activityStatus === 'Report Submitted'
    },
    get download() {
        const store = getRoot(self);
        const api = store.d2.Api.getApi();
        const url = api.baseUrl;
        if (store.report.rows.length > 0) {
            return `${url}/events/files?eventUid=${store.report.rows[0].data[0]}&dataElementUid=yxGmEyvPfwl`
        }
        return '';
    }
})).actions(self => ({
    afterCreate: flow(function* () {
        // yield self.fetchEvents()
    }),
    fetchEvents: flow(function* () {
        const store = getRoot(self);
        const api = store.d2.Api.getApi();
        const event = yield api.get(`trackedEntityInstances/${self.data[0]}`, {
            fields: '*',
            program: store.plannedActivity.id
        });
        self.event = event;
    }),
}));

export const ProgramStage = types.model('ProgramStage', {
    id: '',
    page: 1,
    pageSize: 10,
    total: 0,
    sorter: 'created:desc',
    headers: types.array(Header),
    rows: types.optional(types.array(Row), []),
    programStageDataElements: types.array(ProgramStageDataElement),
    related: types.maybe(types.late(() => ProgramStage)),
    hidden: types.optional(types.array(types.string), []),
    instance: '',
    row: types.optional(Row, {}),
    events: types.optional(types.frozen(), []),
    actionForm: types.optional(types.frozen(), []),
    currentIssue: types.optional(types.frozen(), {})
}).views(self => ({
    get issueColumns() {

        const activityColumn = {
            key: 'le0A6qC3Oap',
            title: 'Activity',
            dataIndex: 'le0A6qC3Oap'
        };

        const issueColumn = {
            key: 'POFNc2t3zCO',
            title: 'Issue',
            dataIndex: 'POFNc2t3zCO'
        };

        const registrationColumn = {
            key: 'eventDate',
            title: 'Registered on',
            dataIndex: 'eventDate',
            render: (text) => {
                return <div>{moment(text).format('DD/MM/YYYY')}</div>
            }
        };

        const reportedIn = {
            key: 'orgUnitName',
            title: 'Registered in',
            dataIndex: 'orgUnitName'
        };
        const reportedBy = {
            key: 'storedBy',
            title: 'Reported by',
            dataIndex: 'storedBy'
        };
        const responsibleColumn = {
            key: 'UugBQHvPTZ3',
            title: 'Baylor Staff Responsible',
            dataIndex: 'UugBQHvPTZ3'
        };
        const issueStatusColumn = {
            key: 'b3KvFkSwZLn',
            title: 'Issue status',
            dataIndex: 'b3KvFkSwZLn',
            render: (text, row) => {
                return {
                    props: {
                        className: text,
                    },
                    children: <div>{text}</div>,
                };
            }
        };

        const actionColumn = {
            title: 'Actions',
            key: 'Actions',
            render: (text, record) => {
                let l = [];
                l = [...l, <Menu.Item key="1" onClick={async () => console.log('current')}>
                    Edit Issue
                    </Menu.Item>]
                l = [...l, <Menu.Item key="2" onClick={() => {
                    const store = getRoot(self)
                    let found = [];
                    const issueKeys = keys(record);
                    range(1, 11).forEach(i => {
                        const searchColumns = store.issue.form.filter(s => { return String(s.title).endsWith(i) });
                        const columnsKeys = searchColumns.map(c => c.key)
                        const both = intersection(issueKeys, columnsKeys)
                        if (both.length === 0) {
                            found = [...found, i]
                        }
                    });
                    const current = min(found);
                    const form = store.issue.form.filter(s => { return String(s.title).endsWith(current) || s.key === 'b3KvFkSwZLn' })
                    self.setActionForm(form);
                    self.setCurrentIssue(record);
                    store.showActionDialog();
                }}>
                    Add Action to Issue
                    </Menu.Item>]
                const menu = (
                    <Menu>
                        {l.map(m => m)}
                    </Menu>
                );
                return <Dropdown overlay={menu} trigger={['click']}>
                    <Button type="link">
                        <Icon type="down" />
                    </Button>
                </Dropdown>
            }
        }

        return [activityColumn, issueColumn, registrationColumn, reportedIn, reportedBy, responsibleColumn, issueStatusColumn, actionColumn]

    },
    get nameAndCodeColumn() {
        const codeIndex = self.headers.findIndex((x) => {
            return x.name === 'UeKCu1x6gC1'
        });
        const nameIndex = self.headers.findIndex((x) => {
            return x.name === 'cIfzworL5Kj'
        });

        if (codeIndex !== -1 && nameIndex !== -1) {
            return { nameIndex, codeIndex }
        }
        return {}
    },
    get getData() {
        // const store = getRoot(self);
        const data = self.programStageDataElements.map(a => {
            const deIndex = self.headers.findIndex((x) => {
                return x.name === a.dataElement.id
            });

            let value = null;

            if (deIndex !== -1) {
                console.log(JSON.stringify(self.rows));
                // value = self.rows.data[deIndex];
            }
            return [a.dataElement.id, value];
        });
        return fromPairs(data);
    },
    get columns() {
        if (self.headers.length > 0 && self.rows.length > 0) {
            const columns = self.programStageDataElements.map(a => {
                return a.dataElement.id
            });
            let cols = self.headers.map((a, i) => {
                return {
                    key: a.name,
                    title: a.column,
                    dataIndex: a.name,
                    render: (text, row) => {
                        if (a.name === 'GeIEoCBrKaW') {
                            console.log(row.currentStatus.cls)
                            return {
                                props: {
                                    className: row.currentStatus.cls,
                                },
                                children: <div>{row.data[i] || row.currentStatus.cls}</div>,
                            };
                        }
                        return <div>{row.data[i]}</div>
                    }
                }
            }).filter(h => {
                return columns.indexOf(h.key) !== -1
            });

            if (self.id === 'qky1qGVPe7e') {
                cols = cols.filter(c => {
                    return ['fdlUSNSkcO5', 'POFNc2t3zCO', 'b3KvFkSwZLn', 'UugBQHvPTZ3', 'orgUnitName'].indexOf(c.key) !== -1
                })
            } else if (self.id === 'eXOOIxW2cAZ') {
                cols = cols.filter(c => {
                    return ['fdlUSNSkcO5', 'HF1r9NG0jNT'].indexOf(c.key) !== -1
                })
            }
            return cols;
        } else {
            let cols = self.programStageDataElements.map(a => {
                return {
                    key: a.dataElement.id,
                    title: a.dataElement.name,
                    dataIndex: a.dataElement.id,
                    render: (text) => {
                        return <div>{text}</div>
                    }
                }
            });

            cols = [...cols, {
                key: 'orgUnitName',
                title: 'Site',
                dataIndex: 'orgUnitName',
                render: (text) => {
                    return <div>{text}</div>
                }
            }]

            const actionColumn = {
                title: 'Actions',
                key: 'Actions',
                render: (text, record) => {
                    let l = [];
                    l = [...l, <Menu.Item key="1" onClick={async () => console.log('current')}>
                        Edit Issue
                        </Menu.Item>]
                    l = [...l, <Menu.Item key="2" onClick={() => {
                        const store = getRoot(self)
                        let found = [];
                        const issueKeys = keys(record);
                        range(1, 11).forEach(i => {
                            const searchColumns = store.issue.form.filter(s => { return String(s.title).endsWith(i) });
                            const columnsKeys = searchColumns.map(c => c.key)
                            const both = intersection(issueKeys, columnsKeys)
                            if (both.length === 0) {
                                found = [...found, i]
                            }
                        });
                        const current = min(found);
                        const form = store.issue.form.filter(s => { return String(s.title).endsWith(current) || s.key === 'b3KvFkSwZLn' })
                        self.setActionForm(form);
                        self.setCurrentIssue(record);
                        store.showActionDialog();
                    }}>
                        Add Action to Issue
                        </Menu.Item>]
                    const menu = (
                        <Menu>
                            {l.map(m => m)}
                        </Menu>
                    );
                    return <Dropdown overlay={menu} trigger={['click']}>
                        <Button type="link">
                            <Icon type="down" />
                        </Button>
                    </Dropdown>
                }
            }

            if (self.id === 'qky1qGVPe7e') {
                cols = cols.filter(c => {
                    return ['POFNc2t3zCO', 'b3KvFkSwZLn', 'UugBQHvPTZ3', 'orgUnitName'].indexOf(c.key) !== -1
                })
            }

            return [...cols, actionColumn]

        }
    },
    get form() {
        const store = getRoot(self)
        return self.programStageDataElements.map(de => {
            const { compulsory: mandatory, dataElement: { valueType } } = de;
            const hidden = self.hidden.indexOf(de.dataElement.id) !== -1;
            if (self.id === 'eXOOIxW2cAZ' && de.dataElement.id === 'fdlUSNSkcO5' && store.currentRow && store.currentRow.currentIssueNumbers) {
                return {
                    title: de.dataElement.name,
                    dataIndex: de.dataElement.id,
                    key: de.dataElement.id,
                    mandatory,
                    valueType,
                    hidden,
                    optionSet: { options: store.currentRow.currentIssueNumbers }
                }
            } else {
                return {
                    title: de.dataElement.name,
                    dataIndex: de.dataElement.id,
                    key: de.dataElement.id,
                    mandatory,
                    valueType,
                    hidden,
                    optionSet: de.dataElement.optionSet
                }
            }
        });
    }
})).actions(self => {
    const afterCreate = flow(function* () {
        yield self.fetchMetadata();
        // yield self.fetchEvents();
    });
    const fetchMetadata = flow(function* () {
        const api = getRoot(self).d2.Api.getApi();
        try {
            const { programStageDataElements } = yield api.get(`programStages/${self.id}`, {
                fields: 'programStageDataElements[id,compulsory,dataElement[id,name,valueType,optionSet[options[name,code]]]]'
            });
            self.programStageDataElements = programStageDataElements;
        } catch (error) {
            console.error("Failed to fetch projects", error);
            self.state = "error"
        }
    });

    const fetchEvents = flow(function* () {
        const api = getRoot(self).d2.Api.getApi();
        self.loading = true;

        let params = {
            programStage: self.id,
            totalPages: true,
            pageSize: self.pageSize,
            includeAllDataElements: true,
            order: self.sorter,
            ouMode: 'ALL'
        }
        try {

            if (self.instance !== '') {
                params = { ...params, trackedEntityInstance: self.instance }
            }
            const { headers, rows, metaData: { pager } } = yield api.get('events/query.json', params);
            self.headers = headers;
            self.rows = rows.map(r => {
                return { data: r }
            });
            self.total = pager.total;
        } catch (error) {
            console.error("Failed to fetch projects", error);
            self.state = "error"
        }
        self.loading = false;
    });

    const fetchRawEvents = flow(function* () {
        const api = getRoot(self).d2.Api.getApi();
        self.loading = true;
        let params = {
            programStage: self.id,
            totalPages: true,
            pageSize: self.pageSize,
            program: 'lINGRWR9UFx',
            order: self.sorter,
            ouMode: 'ALL'
        }
        try {
            const { events, pager } = yield api.get('events.json', params);
            self.total = pager.total;
            const attributes = uniq(events.map(e => e.trackedEntityInstance)).join(';');

            let { trackedEntityInstances } = yield api.get('trackedEntityInstances', { trackedEntityInstance: attributes });

            const processedInstances = groupBy(trackedEntityInstances.map(({ attributes, ...rest }) => {
                return { ...rest, ...fromPairs(attributes.map(a => [a.attribute, a.value])) }
            }), 'trackedEntityInstance')

            self.events = events.map(({ dataValues, ...e }) => {
                return { ...e, ...fromPairs(dataValues.map(d => [d.dataElement, d.value])), ...processedInstances[e.trackedEntityInstance][0] }
            });

        } catch (error) {
            console.error("Failed to fetch projects", error);
            self.state = "error"
        }
        self.loading = false;
    });
    const fetchInstanceEvents = flow(function* (trackedEntityInstance) {
        const api = getRoot(self).d2.Api.getApi();
        self.loading = true;
        let params = {
            programStage: self.id,
            totalPages: true,
            pageSize: self.pageSize,
            trackedEntityInstance,
            includeAllDataElements: true,
            order: self.sorter,
            ouMode: 'ALL'
        }

        if (self.instance !== '') {
            params = { ...params, trackedEntityInstance: self.instance }
        }
        try {
            const { headers, rows, metaData: { pager } } = yield api.get('events/query.json', params);
            self.headers = headers;
            self.rows = rows.map(r => {
                return { data: r }
            });
            self.total = pager.total;
        } catch (error) {
            console.error("Failed to fetch projects", error);
            self.state = "error"
        }
        self.loading = false;
    });

    const searchEventsByColumn = flow(function* (column, search) {
        const api = getRoot(self).d2.Api.getApi();
        const { events } = yield api.get('events', {
            filter: `${column}:EQ:${search}`,
            includeAllDataElements: true,
            program: 'yAYNtTb7B03',
            programStage: self.id,
            paging: false,
        });
        return events

    })

    const searchEvents = flow(function* (search) {
        const api = getRoot(self).d2.Api.getApi();
        if (search && search !== '') {
            const searchByName = api.get('events/query.json', {
                filter: `cIfzworL5Kj:LIKE:${search}`,
                includeAllDataElements: true,
                programStage: self.id,
                paging: true,
                pageSize: 25,
                page: 1,
                totalPages: false
            });

            const searchByCode = api.get('events/query.json', {
                filter: `UeKCu1x6gC1:LIKE:${search}`,
                includeAllDataElements: true,
                programStage: self.id,
                paging: true,
                pageSize: 25,
                page: 1,
                totalPages: false
            });
            const result = yield Promise.all([searchByName, searchByCode]);
            const headers = result[0].headers
            let final = result.map(r => {
                return r.rows;
            });

            final = flatten(final)

            const rows = unionBy(final, (e) => {
                return e[0]
            });

            self.rows = rows.map(r => {
                return { data: r }
            });
            self.headers = headers;
        } else {
            self.events = {}
        }
    });

    const handleChange = flow(function* (pagination, filters, sorter) {
        self.loading = true;
        const order = sorter.field && sorter.order ? `${sorter.field}:${sorter.order === 'ascend' ? 'asc' : 'desc'}` : 'created:desc';
        const page = pagination.pageSize !== self.pageSize || order !== self.sorter ? 1 : pagination.current;
        self.sorter = order;
        self.page = page;
        self.pageSize = pagination.pageSize
        const api = getRoot(self).d2.Api.getApi();
        try {
            const { headers, rows, metaData: { pager } } = yield api.get('events/query.json', {
                programStage: self.id,
                totalPages: true,
                pageSize: self.pageSize,
                includeAllDataElements: true,
                order: self.sorter,
                ouMode: 'ALL',
                query: self.search === '' ? '' : `LIKE:${self.search}`,
                page,
            });
            self.total = pager.total;
            self.pageSize = pager.pageSize;
            self.rows = rows.map(r => {
                return { data: r }
            });
            self.headers = headers
        } catch (error) {
            console.error("Failed to fetch projects", error);
            self.state = "error"
        }
        self.loading = false;
    });


    const handleChangeRawEvents = flow(function* (pagination, filters, sorter) {

        self.loading = true;
        const order = sorter.field && sorter.order ? `${sorter.field}:${sorter.order === 'ascend' ? 'asc' : 'desc'}` : 'created:desc';
        const page = pagination.pageSize !== self.pageSize || order !== self.sorter ? 1 : pagination.current;
        self.sorter = order;
        self.page = page;
        self.pageSize = pagination.pageSize;

        const api = getRoot(self).d2.Api.getApi();
        self.loading = true;

        let params = {
            programStage: self.id,
            totalPages: true,
            pageSize: self.pageSize,
            program: 'lINGRWR9UFx',
            order: self.sorter,
            ouMode: 'ALL',
            page,
        }
        try {
            const { events, pager } = yield api.get('events.json', params);
            self.total = pager.total;
            const attributes = uniq(events.map(e => e.trackedEntityInstance)).join(';');

            let { trackedEntityInstances } = yield api.get('trackedEntityInstances', { trackedEntityInstance: attributes });

            const processedInstances = groupBy(trackedEntityInstances.map(({ attributes, ...rest }) => {
                return { ...rest, ...fromPairs(attributes.map(a => [a.attribute, a.value])) }
            }), 'trackedEntityInstance')


            self.events = events.map(({ dataValues, ...e }) => {
                return { ...e, ...fromPairs(dataValues.map(d => [d.dataElement, d.value])), ...processedInstances[e.trackedEntityInstance][0] }
            })
        } catch (error) {
            console.error("Failed to fetch projects", error);
            self.state = "error"
        }
        self.loading = false;
    });
    const setHidden = (values) => self.hidden = values;
    const setInstance = (values) => self.instance = values;
    const setCurrentAction = val => self.currentAction = val;
    const setActionForm = val => self.actionForm = val;
    const setCurrentIssue = val => self.currentIssue = val;

    return {
        searchEvents,
        fetchEvents,
        fetchInstanceEvents,
        afterCreate,
        handleChange,
        fetchMetadata,
        setHidden,
        setInstance,
        fetchRawEvents,
        handleChangeRawEvents,
        setCurrentAction,
        setActionForm,
        setCurrentIssue,
        searchEventsByColumn
    }
});

export const FieldActivity = types.model('FieldActivity', {
    transactionCode: '',
    attributes: '',
    trackedEntityInstances: types.optional(types.frozen(), []),
    currentReport: ''
}).views(self => ({
    get columnAttributes() {
        if (self.attributes) {
            return JSON.parse(self.attributes);
        }
        return [];
    },

    get report() {
        if (self.trackedEntityInstances.length > 0) {
            const { enrollments } = self.trackedEntityInstances[0];
            const { events } = enrollments[0];
            if (events && events.length > 0) {
                const foundEvent = events.find(e => e.programStage === 'gCp6ffVmx0g');
                if (foundEvent) {
                    return fromPairs(foundEvent.dataValues.map(dv => [dv.dataElement, dv.value]));
                }
            }
        }
        return {}
    },

    get activityAttributes() {
        if (self.trackedEntityInstances.length > 0) {
            const { attributes } = self.trackedEntityInstances[0];
            return fromPairs(attributes.map(dv => [dv.attribute, dv.value]));
        }
        return {}
    },

    get reportId() {
        if (self.trackedEntityInstances.length > 0) {
            const { enrollments } = self.trackedEntityInstances[0];
            const { events } = enrollments[0];
            if (events && events.length > 0) {
                const foundEvent = events.find(e => e.programStage === 'gCp6ffVmx0g');
                if (foundEvent) {
                    return foundEvent.event;
                }
            }
        }
        return ''
    },

    get activityLocations() {
        return self.trackedEntityInstances.map(tei => {
            const { enrollments } = tei;
            const enrollment = enrollments[0]
            return { id: tei.orgUnit, displayName: enrollment.orgUnitName }
        });
    },

    get activityLocationsDates() {
        let dates = {};
        self.trackedEntityInstances.forEach(tei => {
            const startDate = tei.attributes.find(a => a.attribute === 'eN9jthkmMds');
            const endDate = tei.attributes.find(a => a.attribute === 'pyQEzpRRcqH');
            dates = { ...dates, [tei.orgUnit]: [moment(startDate.value), moment(endDate.value)] }
        });
        return dates;
    },

    get reportIds() {
        if (self.trackedEntityInstances.length > 0) {
            const events = self.trackedEntityInstances.map(tei => {
                const events = tei.enrollments.map(enrollment => {
                    return enrollment.events.filter(e => e.programStage === 'gCp6ffVmx0g').map(({ event }) => {
                        return { trackedEntityInstance: tei.trackedEntityInstance, event }
                    })
                });
                return flatten(events)
            });

            return fromPairs(flatten(events).map(e => [e.trackedEntityInstance, e.event]))
        }

        return {};

    },

    get fieldActivityLocations() {
        return self.trackedEntityInstances.map(tei => {
            const { enrollments } = tei;
            const { orgUnitName } = enrollments[0]
            return {
                orgUnit: tei.orgUnit,
                trackedEntityInstance: tei.trackedEntityInstance,
                orgUnitName,
                program: tei.programOwners[0].program
            }
        })
    },

    get allIssues() {
        const events = self.trackedEntityInstances.map(tei => {
            const events = tei.enrollments.map(enrollment => {
                return enrollment.events.filter(e => e.programStage === 'qky1qGVPe7e').map(({ dataValues, ...e }) => {
                    return { ...e, ...fromPairs(dataValues.map(dv => [dv.dataElement, dv.value])) }
                })
            });

            return flatten(events)
        });

        return flatten(events)
    },

    get allInstances() {
        return self.trackedEntityInstances.map(({ enrollments, attributes, ...rest }) => {
            const { orgUnitName } = enrollments[0]
            return { ...rest, orgUnitName, ...fromPairs(attributes.map(dv => [dv.attribute, dv.value])) }
        });

    },

    get activityStatus() {
        return self.columnAttributes.GeIEoCBrKaW
    },
    get plannedStartDate() {
        return moment(self.columnAttributes.eN9jthkmMds)
    },
    get currentStatus() {
        let canImplement = false;
        const today = moment();
        let cls = '';

        if (self.activityStatus === 'On Schedule' && self.plannedStartDate && self.plannedStartDate.diff(today, 'days') <= 0) {
            cls = 'Overdue';
        } else if (self.activityStatus === 'On Schedule' && self.plannedStartDate && self.plannedStartDate.diff(today, 'days') <= 7) {
            cls = 'Upcoming';
        }
        else if (self.activityStatus === 'On Schedule' && self.plannedStartDate && self.plannedStartDate.diff(today, 'days') > 7) {
            cls = 'OnSchedule';
        } else if (self.activityStatus === 'Report Submitted') {
            cls = 'ReportSubmitted';
        } else if (self.activityStatus === 'Report Approved') {
            cls = 'ReportApproved';
        } else if (self.activityStatus === 'Ongoing') {
            cls = 'Ongoing';
        } else if (self.activityStatus === 'Implemented') {
            cls = 'Implemented';
        } else if (self.activityStatus === 'Upcoming') {
            cls = 'Upcoming';
        } else if (self.plannedStartDate && self.plannedStartDate.diff(today, 'days') <= 0) {
            cls = 'Overdue';
        } else if (self.plannedStartDate && self.plannedStartDate.diff(today, 'days') <= 7) {
            cls = 'Upcoming';
        } else if (self.plannedStartDate && self.plannedStartDate.diff(today, 'days') > 7) {
            cls = 'OnSchedule';
        }
        if (self.activityStatus === 'Overdue' || self.activityStatus === 'Upcoming' || self.activityStatus === 'On Schedule' || !self.activityStatus) {
            canImplement = true;
        }
        return {
            canImplement,
            cls
        }
    },
    get disableSubmit() {
        return self.activityStatus === 'Report Approved'
    },
    get canFinishImplementing() {
        return self.activityStatus === 'Ongoing'
    },
    get canAddReport() {
        return self.activityStatus === 'Implemented'
    },
    get canViewAndEditReport() {
        return self.activityStatus === 'Report Submitted'
    },
    get download() {
        const store = getRoot(self);
        const api = store.d2.Api.getApi();
        const url = api.baseUrl;
        return `${url}/events/files?eventUid=${self.reportId}&dataElementUid=yxGmEyvPfwl`;
    }
})).actions(self => ({

    fetchTrackedInstances: flow(function* () {
        const store = getRoot(self);
        if (self.transactionCode !== '' && store && store.d2) {
            const api = store.d2.Api.getApi();
            const { trackedEntityInstances } = yield api.get(`trackedEntityInstances`, {
                fields: '*',
                program: store.plannedActivity.id,
                ouMode: 'ALL',
                filter: `XdmZ9lk11i4:EQ:${self.transactionCode}`
            });

            self.trackedEntityInstances = trackedEntityInstances;

            const { enrollments } = trackedEntityInstances[0];
            const { events } = enrollments[0];
            const foundEvent = events.find(e => e.programStage === 'gCp6ffVmx0g');

            if (foundEvent) {
                self.currentReport = foundEvent.event
            }
        }
    }),
    afterCreate: flow(function* () {
        yield self.fetchTrackedInstances();
    }),
    updateActivityStatus: flow(function* (status) {
        const instances = self.trackedEntityInstances.map(({ orgUnit, trackedEntityInstance, trackedEntityType, attributes }) => {
            attributes = attributes.map(a => {
                if (a.attribute === 'GeIEoCBrKaW') {
                    return { ...a, value: status }
                }
                return a
            })

            return {
                orgUnit,
                trackedEntityInstance,
                trackedEntityType,
                attributes
            }

        })
        const store = getRoot(self);
        const api = store.d2.Api.getApi();
        const plannedActivity = store.plannedActivity;
        const payload = {
            trackedEntityInstances: instances
        }
        yield api.post('trackedEntityInstances', payload);
        yield plannedActivity.refresh();
    }),

    addEvent: flow(function* (data) {
        const api = getRoot(self).d2.Api.getApi();

        const { programStage, ...others } = data;

        self.loading = true;

        const dataValues = Object.keys(others).map(dataElement => {
            return { dataElement, value: data[dataElement] };
        });

        const events = self.trackedEntityInstances.map(tei => {
            let event = {
                event: self.reportIds[tei.trackedEntityInstance] || generateUid(),
                eventDate: new Date().toISOString(),
                status: 'COMPLETED',
                completedDate: new Date().toISOString(),
                program: tei.programOwners[0].program,
                orgUnit: tei.orgUnit,
                dataValues,
                programStage,
                trackedEntityInstance: tei.trackedEntityInstance
            }
            return event;
        });

        try {
            yield api.post('events', { events });
        } catch (error) {
            console.error("Failed to fetch projects", error);
            self.state = "error"
        }
        self.loading = false;
    }),

    updateEvent: flow(function* (data) {
        const store = getRoot(self)
        const api = store.d2.Api.getApi();
        const currentIssue = store.issue.currentIssue;
        const { program, programStage, orgUnit, event, trackedEntityInstance } = currentIssue;
        for (const dataElement of keys(data)) {
            yield api.update('events/' + event + '/' + dataElement, { program, programStage, orgUnit, trackedEntityInstance, dataValues: [{ dataElement, value: data[dataElement] }] })
        }
    }),

    addIssue: flow(function* (data) {
        const api = getRoot(self).d2.Api.getApi();

        const { orgUnit, programStage, trackedEntityInstance, program, ...others } = data;

        self.loading = true;

        const dataValues = Object.keys(others).map(dataElement => {
            return { dataElement, value: data[dataElement] };
        });

        const event = {
            eventDate: new Date().toISOString(),
            status: 'COMPLETED',
            completedDate: new Date().toISOString(),
            program,
            orgUnit,
            dataValues,
            programStage,
            trackedEntityInstance
        }

        try {
            yield api.post('events', event);
        } catch (error) {
            console.error("Failed to fetch projects", error);
            self.state = "error"
        }
        self.loading = false;
    })
}));


export const Program = types.model('Program', {
    id: types.identifier,
    page: 1,
    pageSize: 10,
    total: 0,
    sorter: 'created:desc',
    programTrackedEntityAttributes: types.optional(types.array(ProgramTrackedEntityAttributes), []),
    headers: types.optional(types.array(Header), []),
    rows: types.optional(types.array(Row), []),
    programStages: types.optional(types.array(ProgramStage), []),
    related: types.optional(ProgramStage, {}),
    hidden: types.optional(types.array(types.string), []),
    trackedEntityType: 'b41rJVoJ4B3',
    currentInstance: '',
    currentOU: '',
    search: '',
    attribute: '',
    activities: types.optional(types.array(FieldActivity), []),
    currentActivity: types.optional(FieldActivity, {}),
    sqlView: 'SqR8Dood0q9'
}).views(self => ({
    get pureColumns() {
        const columns = ['le0A6qC3Oap', 'GeIEoCBrKaW', 'eN9jthkmMds', 'pyQEzpRRcqH'];
        return self.programTrackedEntityAttributes.map(a => {
            return {
                title: a.trackedEntityAttribute.name,
                key: a.trackedEntityAttribute.id,
                dataIndex: a.trackedEntityAttribute.id
            }
        }).filter(c => columns.indexOf(c.key) !== -1);
    },
    get columns() {
        const store = getRoot(self);
        const columns = ['le0A6qC3Oap', 'GeIEoCBrKaW', 'eN9jthkmMds', 'TINV7BqPh5p', 'VfDJnPvZzYL', 'pyQEzpRRcqH', 'ouname'];
        if (self.activities.length > 0) {
            let cols = self.programTrackedEntityAttributes.map(a => {
                return {
                    title: a.trackedEntityAttribute.name,
                    key: a.trackedEntityAttribute.id,
                    dataIndex: a.trackedEntityAttribute.id,
                    render: (text, row) => {
                        if (a.trackedEntityAttribute.id === 'GeIEoCBrKaW') {
                            return {
                                props: {
                                    className: row.currentStatus.cls,
                                },
                                children: <div>{row.columnAttributes[a.trackedEntityAttribute.id]}</div>,
                            };
                        }
                        return <div>{row.columnAttributes[a.trackedEntityAttribute.id]}</div>
                    }
                }
            }).filter(c => columns.indexOf(c.key) !== -1);
            cols = [...cols, {
                title: 'Actions',
                key: 'Actions',
                render: (text, record) => {
                    let l = [];
                    if (record.currentStatus.canImplement) {
                        l = [
                            ...l,
                            <Menu.Item key="1" onClick={async () => await record.updateActivityStatus('Ongoing')}>
                                Start Implementing
                            </Menu.Item>,
                            <Menu.Item key="7" onClick={async () => store.router.setView(views.editPlannedActivity, { instance: record.transactionCode })}>
                                Edit Activity
                            </Menu.Item>
                        ]
                    }

                    if (record.canFinishImplementing) {
                        l = [...l, <Menu.Item key="2" onClick={async () => await record.updateActivityStatus('Implemented')}>
                            Mark As Implemented
                        </Menu.Item>]
                    }
                    if (record.canAddReport) {
                        l = [...l, <Menu.Item key="3" onClick={() => {
                            self.setRow(record);
                            store.router.setView(views.activityDetails, { instance: record.transactionCode })
                        }}>
                            Add Report
                        </Menu.Item>]
                    }
                    if (record.canViewAndEditReport || record.disableSubmit) {
                        l = [...l, <Menu.Item key="4" onClick={() => {
                            self.setRow(record);
                            store.router.setView(views.activityDetails, { instance: record.transactionCode });
                        }}>
                            View Summary Report
                        </Menu.Item>]

                        // if (record.download) {
                        //     l = [...l, <Menu.Item key="5">
                        //         <a href={record.download}>Download Uploaded Report</a>
                        //     </Menu.Item>]
                        // }

                        if (!record.disableSubmit) {
                            l = [...l, <Menu.Item key="6" onClick={async () => await record.updateActivityStatus('Report Approved')}>
                                Approve Report
                            </Menu.Item>]
                        }
                    }
                    const menu = (
                        <Menu>
                            {l.map(m => m)}
                        </Menu>
                    );
                    return <Dropdown overlay={menu} trigger={['click']}>
                        <Button type="link">
                            <Icon type="down" />
                        </Button>
                    </Dropdown>
                }
            }]
            return cols;
        }
        return []
    },
    get form() {
        const mustDropDowns = ['dPEK5RaFqLx', 'vIlcCjuhlUG', 'le0A6qC3Oap']
        if (self.programTrackedEntityAttributes) {
            return self.programTrackedEntityAttributes.map(a => {
                const { mandatory, valueType } = a;
                const hidden = self.hidden.indexOf(a.trackedEntityAttribute.id) !== -1
                return {
                    key: a.trackedEntityAttribute.id,
                    title: a.trackedEntityAttribute.name,
                    mandatory,
                    valueType,
                    hidden,
                    optionSet: mustDropDowns.indexOf(a.trackedEntityAttribute.id) === -1 ? a.trackedEntityAttribute.optionSet : { options: [] }
                }
            })
        }
        return []
    },
    get eventForms() {
        const forms = self.programStages.map(programStage => {
            const defaultColumns = programStage.programStageDataElements.map(de => {
                const { compulsory: mandatory, dataElement: { valueType } } = de;

                const hidden = self.hidden.indexOf(de.dataElement.id) !== -1
                return {
                    title: de.dataElement.name,
                    dataIndex: de.dataElement.id,
                    key: de.dataElement.id,
                    mandatory,
                    valueType,
                    hidden,
                    optionSet: de.dataElement.optionSet
                }
            });
            return [programStage.id, defaultColumns]
        });
        return fromPairs(forms)
    },
    get ouIndex() {
        return self.headers.findIndex((x) => {
            return x.name === 'ou'
        })
    },

    get firstProgramStage() {
        return self.programStages[0]
    },

    get params() {
        if (self.sqlView === 'o5qmS27vgC3') {
            return {
                paging: true,
                pageSize: self.pageSize,
                page: self.page,
                var: `search:${self.search}`
            }
        }
        return {
            paging: true,
            pageSize: self.pageSize,
            page: self.page
        }
    }

})).actions(self => {
    const fetchAttributes = flow(function* () {
        const api = getRoot(self).d2.Api.getApi();
        self.loading = true;
        try {
            const { listGrid: { rows }, pager } = yield api.get(`sqlViews/${self.sqlView}/data.json`, self.params);
            self.activities = rows.map(r => {
                return {
                    transactionCode: r[0],
                    attributes: r[1].value
                }
            });
            self.total = pager.total;
        } catch (error) {
            console.error("Failed to fetch projects", error);
            self.state = "error"
        }
        self.loading = false;
    });
    const fetchMetadata = flow(function* () {
        const api = getRoot(self).d2.Api.getApi();
        try {
            const { programTrackedEntityAttributes } = yield api.get(`programs/${self.id}`, {
                fields: 'programTrackedEntityAttributes[mandatory,valueType,trackedEntityAttribute[id,name,unique,optionSet[options[name,code]]]]'
            });
            self.programTrackedEntityAttributes = programTrackedEntityAttributes
        } catch (error) {
            console.error("Failed to fetch projects", error);
            self.state = "error"
        }
    });

    async function afterCreate() {
        await self.fetchMetadata();
    }

    const handleChange = flow(function* (pagination, filters, sorter) {
        self.loading = true;
        // const order = sorter.field && sorter.order ? `${sorter.field}:${sorter.order === 'ascend' ? 'asc' : 'desc'}` : 'created:desc';
        const page = pagination.pageSize !== self.pageSize ? 1 : pagination.current;
        // self.sorter = order;
        self.pageSize = pagination.pageSize
        self.page = page;
        const api = getRoot(self).d2.Api.getApi();
        try {
            const { listGrid: { rows }, pager } = yield api.get(`sqlViews/${self.sqlView}/data.json`, self.params);
            self.activities = rows.map(r => {
                return {
                    transactionCode: r[0],
                    attributes: r[1].value
                }
            });
            self.total = pager.total;
            self.pageSize = pager.pageSize;
        } catch (error) {
            console.error("Failed to fetch projects", error);
            self.state = "error"
        }
        self.loading = false;
    });

    const refresh = flow(function* () {
        self.loading = true;
        const api = getRoot(self).d2.Api.getApi();
        try {
            const { listGrid: { rows } } = yield api.get(`sqlViews/${self.sqlView}/data.json`, self.params);
            self.activities = rows.map(r => {
                return {
                    transactionCode: r[0],
                    attributes: r[1].value
                }
            });
        } catch (error) {
            console.error("Failed to fetch projects", error);
            self.state = "error"
        }
        self.loading = false;
    });

    const addEvent = flow(function* (data) {
        const api = getRoot(self).d2.Api.getApi();

        const { organisationUnits, programStage, trackedEntityInstance, ...others } = data;

        self.loading = true;

        const dataValues = Object.keys(others).map(dataElement => {
            return { dataElement, value: data[dataElement] };
        });

        let events = []

        if (organisationUnits && organisationUnits.length > 0) {
            events = organisationUnits.map(ou => {
                let event = {
                    eventDate: new Date().toISOString(),
                    status: 'COMPLETED',
                    completedDate: new Date().toISOString(),
                    program: self.id,
                    orgUnit: ou,
                    dataValues,
                    programStage,
                    trackedEntityInstance
                }
                return event;
            });
        }
        try {
            yield api.post('events', { events });
        } catch (error) {
            console.error("Failed to fetch projects", error);
            self.state = "error"
        }
        self.loading = false;
    });

    const setHidden = (values) => self.hidden = values;

    const addTrackedEntityInstance = flow(function* (data) {
        const api = getRoot(self).d2.Api.getApi();

        self.loading = true;

        const { organisationUnits, activity, enrollment, events, ...others } = data;

        const date = new Date().toISOString()

        const trackedEntityInstances = organisationUnits.map(orgUnit => {
            const attributes = Object.keys(others).map(attribute => {
                if (attribute === 'eN9jthkmMds') {
                    return { attribute, value: orgUnit.dates[0].format('YYYY-MM-DD') };
                } else if (attribute === 'pyQEzpRRcqH') {
                    return { attribute, value: orgUnit.dates[1].format('YYYY-MM-DD') };
                } else {
                    return { attribute, value: data[attribute] };
                }
            });
            let tei = {
                orgUnit: orgUnit.ou,
                trackedEntityType: self.trackedEntityType,
                attributes,
            }

            if (orgUnit.trackedEntityInstance) {
                tei = { ...tei, trackedEntityInstance: orgUnit.trackedEntityInstance }
            } else {
                const currentEnrollment = {
                    orgUnit: orgUnit.ou,
                    program: self.id,
                    enrollmentDate: date,
                    incidentDate: date
                }
                tei = { ...tei, enrollments: [currentEnrollment] }
            }


            return tei;
        });

        try {
            yield api.post('trackedEntityInstances', { trackedEntityInstances });
        } catch (error) {
            console.error("Failed to fetch projects", error);
            self.state = "error";

        }
        self.loading = false;
    });

    const setSearch = flow(function* (search) {
        self.sqlView = 'o5qmS27vgC3'
        self.search = search;
        yield self.fetchAttributes();
    });

    const reset = flow(function* () {
        self.sqlView = 'SqR8Dood0q9'
        self.page = 1;
        self.pageSize = 10;
        console.log(self.params);
        yield self.fetchAttributes();
    });

    const setCurrentInstance = val => self.currentInstance = val;
    const setCurrentOU = val => self.currentOU = val;
    const setRow = val => self.row = val;
    const setSqlView = val => self.sqlView = val;

    return {
        afterCreate,
        fetchAttributes,
        fetchMetadata,
        handleChange,
        addEvent,
        setHidden,
        addTrackedEntityInstance,
        refresh,
        setSearch,
        setCurrentInstance,
        setCurrentOU,
        setRow,
        setSqlView,
        reset
    }

});


