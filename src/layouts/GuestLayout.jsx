import { Layout } from 'antd'

const { Content } = Layout

const GuestLayout = ({ children }) => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ minHeight: '100vh' }}>
        {children}
      </Content>
    </Layout>
  )
}

export default GuestLayout