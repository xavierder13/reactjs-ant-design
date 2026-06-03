// src/layouts/GuestLayout.jsx

import { Layout, Row, Col } from 'antd'

const { Content } = Layout

const GuestLayout = ({ children }) => {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content>
        <Row
          justify="center"
          align="middle"
          style={{ minHeight: '100vh' }}
        >
          <Col xs={22} sm={16} md={12} lg={8} xl={6}>
            {children}
          </Col>
        </Row>
      </Content>
    </Layout>
  )
}

export default GuestLayout