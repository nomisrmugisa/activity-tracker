import React from 'react';
import { inject, observer } from "mobx-react";
import {
    Layout, Icon, Button, Card, Form, Input, Row, Col
} from 'antd';
import { Link } from '../modules/router';
import views from '../config/views';

const { Header, Content } = Layout;


const ActivityDetails = ({ store, form }) => {
    const handleSubmit = e => {
        e.preventDefault();
        form.validateFieldsAndScroll((err, values) => {
            if (!err) {
            }
        });
    };
    const { getFieldDecorator } = form;

    return (
        <div>
            <Header style={{ background: '#fff', padding: 0, paddingRight: 5, paddingLeft: 5, display: 'flex' }}>
                <div style={{ width: 50 }}>
                    <Icon
                        className="trigger"
                        type={store.settings.collapsed ? 'menu-unfold' : 'menu-fold'}
                        onClick={store.settings.toggle}
                        style={{ fontSize: 20 }}
                    />
                </div>
                <div>
                    <Link router={store.router} view={views.activityForm}>Create</Link>
                </div>
            </Header>
            <Content style={{ overflow: 'auto', padding: 10 }}>

                <Row gutter={[16, 16]}>
                    <Col span={12}>
                        <Card>
                            <Form layout={null} onSubmit={handleSubmit}>
                                {store.currentTracker.currentInstance.eventStore.columns.map(s => <Form.Item label={s.title} key={s.key}>
                                    {getFieldDecorator(s.key, {
                                        rules: [{ required: true, message: `Please input ${s.title}` }],
                                    })(<Input size="large" style={{ width: '100%' }} />)}
                                </Form.Item>)}
                                <Form.Item layout={null}>
                                    <Button type="primary" htmlType="submit" size="large">Register</Button>
                                </Form.Item>
                            </Form>
                        </Card>
                    </Col>
                    <Col span={12}>
                        <Card>Yes</Card>
                    </Col>
                </Row>


            </Content>
        </div>
    );
};

export const ReportDetails = Form.create({ name: 'register' })(inject("store")(observer(ActivityDetails)));