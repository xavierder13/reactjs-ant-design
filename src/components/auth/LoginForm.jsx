import { useEffect, useState } from 'react'
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
import { takeEndReason } from '../../utils/session'
import LoginIllustration from './LoginIllustration'
import './login.css'

const { Title, Text } = Typography

// Brand-panel captions, rotated every few seconds (the dots pick one).
const SLIDES = [
  { title: 'Your people, in one place', text: 'Employee records, recruitment and onboarding in one HR system.' },
  { title: 'Time & Leave made simple', text: 'File leave, time entries and overtime, approved online.' },
  { title: 'Payroll you can trust', text: 'Accurate pay, payslips and government reports every cut-off.' },
]

const LoginForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  // why the last session ended (expired / idle), set by the axios interceptor
  const [endReason] = useState(takeEndReason);

  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSlide((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearInterval(timer);
  }, [slide]);

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
    <div className="login-page">
      {/* LEFT PANEL: brand + animated illustration */}
      <div className="login-page__brand">
        <div className="login-page__brand-top">
          <div className="login-page__logo">HR</div>
          <div>
            <div className="login-page__brand-top-name">ADDESSA Corporation</div>
            <div className="login-page__brand-top-tagline">Human Resource Information System</div>
          </div>
        </div>

        <LoginIllustration />

        <div className="login-page__caption" aria-live="polite">
          {/* key restarts the fade-in on every slide */}
          <div key={`t${slide}`} className="login-page__caption-title">{SLIDES[slide].title}</div>
          <div key={`d${slide}`} className="login-page__caption-text">{SLIDES[slide].text}</div>
        </div>

        <div className="login-page__dots">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              type="button"
              aria-label={s.title}
              className={`login-page__dot${i === slide ? ' login-page__dot--active' : ''}`}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="login-page__form">
        <div className="login-page__form-inner">
        {/* Logo */}
        <div className="login-page__form-brand">
          <div className="login-page__logo">HR</div>

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

        {endReason && !isInvalid && (
          <Alert
            type="warning"
            showIcon
            title={endReason}
            style={{ marginBottom: 20, borderRadius: 8 }}
          />
        )}

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
          style={{ display: 'block', textAlign: 'center', marginTop: 24, fontSize: 12 }}
        >
          Having trouble? Contact your system administrator.
        </Text>
        </div>
      </div>
    </div>
  )
}

export default LoginForm