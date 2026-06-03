// src/pages/auth/LoginPage.jsx

import GuestLayout from '../../layouts/GuestLayout'
import LoginForm from '../../components/auth/LoginForm'

const LoginPage = () => {
  return (
    <GuestLayout>
      <LoginForm />
    </GuestLayout>
  )
}

export default LoginPage