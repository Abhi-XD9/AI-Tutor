import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import login from '../assets/ref3.jpg'
import DotField from './DotField'
import axios from 'axios'

const inputClassName =
  'mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:bg-white focus:ring-4 focus:ring-slate-200'

const passwordInputClassName = `${inputClassName} pr-12`

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.6 3.4 14.5 2.5 12 2.5 6.9 2.5 2.7 6.7 2.7 12S6.9 21.5 12 21.5c6.1 0 9.2-4.3 9.2-6.8 0-.5-.1-.9-.1-1.2H12Z"
    />
    <path
      fill="#34A853"
      d="M2.7 12c0 1.7.6 3.3 1.6 4.5l3-2.3c-.4-.6-.7-1.4-.7-2.2s.3-1.6.7-2.2l-3-2.3C3.3 8.7 2.7 10.3 2.7 12Z"
    />
    <path
      fill="#FBBC05"
      d="M12 21.5c2.5 0 4.6-.8 6.1-2.2l-2.9-2.3c-.8.6-1.8 1-3.2 1-2.5 0-4.6-1.7-5.4-4l-3 2.3c1.6 3 4.8 5.2 8.4 5.2Z"
    />
    <path
      fill="#4285F4"
      d="M21.2 13.5c.1-.3.2-.8.2-1.5s-.1-1.1-.2-1.5H12v3.9h5.4c-.3 1.3-1.3 2.2-2.2 2.8l2.9 2.3c1.7-1.6 2.7-4 2.7-6Z"
    />
  </svg>
)

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-[#1877F2]">
    <path d="M24 12a12 12 0 1 0-13.9 11.8v-8.3H7.1V12h3V9.3c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-1.9.9-1.9 1.9V12h3.3l-.5 3.5h-2.8v8.3A12 12 0 0 0 24 12Z" />
  </svg>
)

const FieldError = ({ message }) =>
  message ? <p className="mt-2 text-xs font-medium text-rose-500">{message}</p> : null

const EyeIcon = ({ open }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
    <circle cx="12" cy="12" r="3" />
    {!open && <path d="M4 4l16 16" />}
  </svg>
)

const SocialButton = ({ icon, label }) => (
  <button
    type="button"
    className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
  >
    {icon}
    {label}
  </button>
)

const StatusModal = ({ modal, onClose }) => {
  if (!modal.open) return null

  const isSuccess = modal.type === 'success'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.28)] sm:p-7">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold ${
              isSuccess
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-rose-100 text-rose-600'
            }`}
          >
            {isSuccess ? 'OK' : 'ERR'}
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-900">
              {modal.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{modal.message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl px-5 py-3 text-sm font-semibold text-white transition ${
              isSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {isSuccess ? 'Continue' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}

const getApiErrorMessage = (error, fallbackMessage) => {
  const data = error?.response?.data

  if (typeof data?.error === 'string') return data.error
  if (typeof data?.message === 'string') return data.message

  if (data && typeof data === 'object') {
    const flattened = Object.values(data)
      .flat()
      .filter(Boolean)
      .join(' ')

    if (flattened) return flattened
  }

  return fallbackMessage
}

const Register = () => {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
  })

  const [modal, setModal] = useState({
    open: false,
    type: 'success',
    title: '',
    message: '',
    redirectTo: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const navigate = useNavigate()

  const closeModal = () => {
    const redirectTo = modal.redirectTo
    setModal({ open: false, type: 'success', title: '', message: '', redirectTo: '' })

    if (redirectTo) {
      navigate(redirectTo)
    }
  }

  const onSubmit = async (data) => {
    try {
      const payload = {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        password: data.password,
      }

      const response = await axios.post('api/V1/users/register/', payload)

      if (response.status === 201) {
        setModal({
          open: true,
          type: 'success',
          title: 'Registration successful',
          message: 'Your account has been created successfully. You can continue to the login page now.',
          redirectTo: '/login',
        })
      }
    } catch (error) {
      setModal({
        open: true,
        type: 'error',
        title: 'Registration failed',
        message: getApiErrorMessage(error, 'We could not create your account. Please review the form and try again.'),
        redirectTo: '',
      })
    }
  }

  return (
    <>
      <main className="relative min-h-screen overflow-hidden bg-[#0f0a18] px-0 py-0 sm:px-5 sm:py-6 lg:px-8 lg:py-7">
        <div className="pointer-events-none absolute inset-0">
          <DotField
            dotRadius={1.5}
            dotSpacing={14}
            bulgeStrength={67}
            glowRadius={160}
            sparkle={false}
            waveAmplitude={0}
            cursorRadius={500}
            cursorForce={0.1}
            bulgeOnly
            gradientFrom="#ffffff"
            gradientTo="#cdc9d1"
            glowColor="#120F17"
          />
        </div>

        <div className="relative mx-auto w-full overflow-hidden bg-[#f7f7f5] shadow-[0_24px_70px_rgba(0,0,0,0.35)] sm:max-w-6xl sm:rounded-[2rem] md:grid md:h-[calc(100vh-3rem)] md:grid-cols-[0.95fr_1.05fr] lg:h-[calc(100vh-3.5rem)]">
          <section className="relative order-1 flex items-center justify-center bg-[#eceff4] md:order-2 md:bg-[#11161d] md:min-h-0">
            <img
              src={login}
              alt="Learning platform illustration"
              className="block h-64 w-full object-cover object-center sm:h-72 md:h-full md:max-h-none"
            />
          </section>

          <section className="relative z-10 bg-white px-5 py-6 sm:px-8 sm:py-8 md:flex md:min-h-0 md:items-center md:px-8 md:py-8 lg:px-12 lg:py-10">
            <div className="mx-auto w-full max-w-lg md:max-h-full md:overflow-y-auto md:pr-2">
              <h1 className="text-3xl font-semibold tracking-[-0.05em] text-slate-900 sm:text-[2.35rem]">
                Create Account
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Create your profile and start using the same calm workspace experience as the login page.
              </p>

              <form className="mt-7 space-y-5" onSubmit={handleSubmit(onSubmit)}>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="firstName" className="text-sm font-medium text-slate-700">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      placeholder="Abhishek"
                      className={inputClassName}
                      {...register('firstName', {
                        required: 'First name is required',
                      })}
                    />
                    <FieldError message={errors.firstName?.message} />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="text-sm font-medium text-slate-700">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      placeholder="Anugu"
                      className={inputClassName}
                      {...register('lastName', {
                        required: 'Last name is required',
                      })}
                    />
                    <FieldError message={errors.lastName?.message} />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="Example@email.com"
                    className={inputClassName}
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^\S+@\S+\.\S+$/,
                        message: 'Enter a valid email address',
                      },
                    })}
                  />
                  <FieldError message={errors.email?.message} />
                </div>

                <div>
                  <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="Example: 123-456-7890"
                    className={inputClassName}
                    {...register('phone', {
                      required: 'Phone number is required',
                      pattern: {
                        value: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
                        message: 'Enter a valid phone number',
                      },
                    })}
                  />
                  <FieldError message={errors.phone?.message} />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="password" className="text-sm font-medium text-slate-700">
                      Password
                    </label>
                    <div className="relative mt-2">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="At least 8 characters"
                        className={passwordInputClassName}
                        {...register('password', {
                          required: 'Password is required',
                          minLength: {
                            value: 8,
                            message: 'Password must be at least 8 characters',
                          },
                        })}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                      >
                        <EyeIcon open={showPassword} />
                      </button>
                    </div>
                    <FieldError message={errors.password?.message} />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                      Confirm Password
                    </label>
                    <div className="relative mt-2">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Repeat password"
                        className={passwordInputClassName}
                        {...register('confirmPassword', {
                          required: 'Please confirm your password',
                          validate: (value) =>
                            value === getValues('password') || 'Passwords do not match',
                        })}
                      />
                      <button
                        type="button"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        onClick={() => setShowConfirmPassword((value) => !value)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                      >
                        <EyeIcon open={showConfirmPassword} />
                      </button>
                    </div>
                    <FieldError message={errors.confirmPassword?.message} />
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-300"
                    {...register('terms', {
                      required: 'Please accept the terms to continue',
                    })}
                  />
                  <span>I agree to the terms and privacy policy.</span>
                </label>
                <FieldError message={errors.terms?.message} />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-[#183243] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#112636] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Creating account...' : 'Create account'}
                </button>
              </form>

              {/* <div className="mt-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">Or</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div> */}

              {/* <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <SocialButton icon={<GoogleIcon />} label="Sign up with Google" />
                <SocialButton icon={<FacebookIcon />} label="Sign up with Facebook" />
              </div> */}

              <p className="mt-7 text-sm text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-sky-700 hover:text-sky-800">
                  Sign in
                </Link>
              </p>

              <p className="mt-8 text-center text-[11px] uppercase tracking-[0.24em] text-slate-300 lg:text-left">
                � 2026 All rights reserved
              </p>
            </div>
          </section>
        </div>
      </main>

      <StatusModal modal={modal} onClose={closeModal} />
    </>
  )
}

export default Register
