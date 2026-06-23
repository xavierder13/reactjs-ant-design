import { useState } from 'react'
import {
  Form,
  Input,
  Button,
  Typography,
  Alert,
} from 'antd'
import {
  EyeInvisibleOutlined,
  EyeTwoTone,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import axios from '../../api/axiosInstance'
import useAuth from '../../hooks/useAuth'

const { Title, Text } = Typography

const LoginForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);

  const navigate = useNavigate();
  const { setAuth, setTokens } = useAuth();

  const login = async () => {
    setLoading(true)
    setIsInvalid(false)

    try {
      const values = await form.validateFields()

      const { data } = await axios.post('/auth/login', {
        email: values.email,
        password: values.password,
      })

      setTokens(data.access_token, data.refresh_token)
      setAuth(data.user, data.user_roles, data.user_permissions)
      navigate('/')
    } catch (error) {
      if (error?.response) {
        setIsInvalid(true)
      }
    } finally {
      setLoading(false)
    }
  };

  const handleEnter = (e) => {
    if (e.key === 'Enter') login()
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#f6ffed',
      }}
    >
      {/* LEFT PANEL */}
      <div className="login-left-panel">
        <img
          src="/img/login.jpg"
          alt="Login"
          style={{
            width: '100%',
            maxWidth: 1000,
            borderRadius: 16,
            objectFit: 'contain',
          }}
        />

        <div style={{ textAlign: 'center', color: '#fff' }}>
          <Title level={2} style={{ color: '#fff', marginBottom: 0 }}>
            Welcome Back
          </Title>
          <Text style={{ color: 'rgba(255,255,255,.85)', fontSize: 20 }}>
            Human Resource Information System
          </Text>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ width: 24, height: 8, borderRadius: 4, background: '#fff' }} />
          <div style={{ width: 8, height: 8, borderRadius: 4, background: 'rgba(255,255,255,.4)' }} />
          <div style={{ width: 8, height: 8, borderRadius: 4, background: 'rgba(255,255,255,.4)' }} />
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div
        style={{
          width: 440,
          background: '#fff',
          padding: 48,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxShadow: '-2px 0 24px rgba(0,0,0,.06)',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 36 }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: '#389e0d',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 700 }}>HR</Text>
          </div>

          <div>
            <Text strong style={{ display: 'block', color: '#1a4d0f' }}>
              ADDESSA Corporation
            </Text>
            <Text type="secondary">Human Resource Information System</Text>
          </div>
        </div>

        {/* Heading */}
        <div style={{ marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 0, color: '#1a4d0f' }}>
            Sign In
          </Title>
          <Text type="secondary">Enter your credentials to continue</Text>
        </div>

        {isInvalid && (
          <Alert
            type="error"
            showIcon
            title="Invalid email or password."
            style={{ marginBottom: 20, borderRadius: 8 }}
          />
        )}

        {/* component={false} prevents native <form> submit and page reload */}
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          component={false}
        >
          <Form.Item
            label="Email Address"
            name="email"
            rules={[
              { required: true, message: 'Email is required' },
              // { type: 'email', message: 'Invalid email' },
            ]}
          >
            <Input
              size="large"
              placeholder="you@company.com"
              style={{ borderRadius: 8 }}
              onKeyDown={handleEnter}
            />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Password is required' }]}
          >
            <Input.Password
              size="large"
              placeholder="••••••••"
              iconRender={(visible) =>
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
              }
              style={{ borderRadius: 8 }}
              onKeyDown={handleEnter}
            />
          </Form.Item>

          <Button
            type="primary"
            onClick={login}
            block
            size="large"
            loading={loading}
            style={{
              height: 46,
              borderRadius: 8,
              fontWeight: 600,
              marginTop: 8,
            }}
          >
            Sign In
          </Button>
        </Form>

        <Text
          type="secondary"
          style={{ textAlign: 'center', marginTop: 24, fontSize: 12 }}
        >
          Having trouble? Contact your system administrator.
        </Text>
      </div>
    </div>
  )
}

export default LoginForm