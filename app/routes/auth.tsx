import {useState, useRef} from 'react';
import {
  data,
  redirect,
  Form,
  NavLink,
  useActionData,
  useLoaderData,
  useRouteLoaderData,
} from 'react-router';
import type {Route} from './+types/auth';
import type {RootLoader} from '~/root';

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'Sign in or Create Account'},
    {
      name: 'description',
      content:
        'Sign in or create your customer account with a secure one-time code sent to your email.',
    },
  ];
};

function getSafeRedirect(rawRedirect: string | null): string | undefined {
  if (!rawRedirect) return undefined;
  if (
    !rawRedirect.startsWith('/') ||
    rawRedirect.startsWith('//') ||
    rawRedirect.startsWith('/\\')
  ) {
    return undefined;
  }
  try {
    const parsed = new URL(rawRedirect, 'http://localhost');
    if (parsed.origin !== 'http://localhost') {
      return undefined;
    }
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return undefined;
  }
}

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(
    email,
  );
}

export async function loader({request, context}: Route.LoaderArgs) {
  if (await context.customerAccount.isLoggedIn()) {
    return redirect('/account');
  }

  const url = new URL(request.url);
  const redirectParam = getSafeRedirect(url.searchParams.get('redirect'));

  return {
    redirect: redirectParam,
  };
}

export async function action({request, context}: Route.ActionArgs) {
  const formData = await request.formData();
  const rawEmail = formData.get('email');
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';
  const tab = formData.get('tab') === 'register' ? 'register' : 'signin';

  if (!email || !isValidEmail(email)) {
    return data(
      {
        error: 'Please enter a valid email address.',
        tab,
      },
      {status: 400},
    );
  }

  return context.customerAccount.login({
    loginHint: email,
  });
}

type TabType = 'signin' | 'register';

export default function AuthPage() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const rootData = useRouteLoaderData<RootLoader>('root');

  const safeRedirect = loaderData?.redirect;
  const actionUrl = safeRedirect
    ? `/auth?redirect=${encodeURIComponent(safeRedirect)}`
    : '/auth';

  const shopName = rootData?.header?.shop?.name || 'Store';
  const logoUrl = rootData?.header?.shop?.brand?.logo?.image?.url;

  const [activeTab, setActiveTab] = useState<TabType>(
    actionData?.tab === 'register' ? 'register' : 'signin',
  );
  const [emailSignin, setEmailSignin] = useState('');
  const [emailRegister, setEmailRegister] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);

  const signInTabRef = useRef<HTMLButtonElement>(null);
  const registerTabRef = useRef<HTMLButtonElement>(null);

  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentTab: TabType,
  ) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextTab: TabType = currentTab === 'signin' ? 'register' : 'signin';
      setActiveTab(nextTab);
      setClientError(null);
      if (nextTab === 'signin') {
        signInTabRef.current?.focus();
      } else {
        registerTabRef.current?.focus();
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveTab('signin');
      setClientError(null);
      signInTabRef.current?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveTab('register');
      setClientError(null);
      registerTabRef.current?.focus();
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const emailToValidate =
      activeTab === 'signin' ? emailSignin.trim() : emailRegister.trim();
    if (!emailToValidate || !isValidEmail(emailToValidate)) {
      e.preventDefault();
      setClientError('Please enter a valid email address.');
      const inputEl = document.getElementById(
        activeTab === 'signin' ? 'auth-email-signin' : 'auth-email-register',
      );
      inputEl?.focus();
    }
  };

  const activeError =
    clientError || (actionData?.tab === activeTab ? actionData?.error : null);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <NavLink to="/" className="auth-logo-link" aria-label={shopName}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={shopName}
                className="auth-logo"
                width={140}
                height={40}
              />
            ) : (
              <span className="auth-store-name">{shopName}</span>
            )}
          </NavLink>
        </div>

        <div
          role="tablist"
          aria-label="Account access options"
          className="auth-tablist"
        >
          <button
            ref={signInTabRef}
            type="button"
            role="tab"
            id="auth-tab-signin"
            aria-selected={activeTab === 'signin'}
            aria-controls="auth-panel-signin"
            tabIndex={activeTab === 'signin' ? 0 : -1}
            className={`auth-tab ${
              activeTab === 'signin' ? 'auth-tab--active' : ''
            }`}
            onClick={() => {
              setActiveTab('signin');
              setClientError(null);
            }}
            onKeyDown={(e) => handleTabKeyDown(e, 'signin')}
          >
            Sign in
          </button>
          <button
            ref={registerTabRef}
            type="button"
            role="tab"
            id="auth-tab-register"
            aria-selected={activeTab === 'register'}
            aria-controls="auth-panel-register"
            tabIndex={activeTab === 'register' ? 0 : -1}
            className={`auth-tab ${
              activeTab === 'register' ? 'auth-tab--active' : ''
            }`}
            onClick={() => {
              setActiveTab('register');
              setClientError(null);
            }}
            onKeyDown={(e) => handleTabKeyDown(e, 'register')}
          >
            Create account
          </button>
        </div>

        <div
          role="tabpanel"
          id="auth-panel-signin"
          aria-labelledby="auth-tab-signin"
          tabIndex={0}
          hidden={activeTab !== 'signin'}
          className={`auth-panel ${
            activeTab === 'signin' ? 'auth-panel--active' : ''
          }`}
        >
          <p className="auth-desc">
            {"Welcome back. We'll send a one-time code to your email."}
          </p>
          <Form
            method="POST"
            action={actionUrl}
            className="auth-form"
            onSubmit={handleFormSubmit}
            noValidate
          >
            <input type="hidden" name="tab" value="signin" />
            {safeRedirect && (
              <input type="hidden" name="redirect" value={safeRedirect} />
            )}
            <div className="auth-field">
              <label htmlFor="auth-email-signin" className="auth-label">
                Email
              </label>
              <input
                id="auth-email-signin"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                required
                aria-required="true"
                aria-invalid={Boolean(activeError && activeTab === 'signin')}
                aria-describedby={
                  activeError && activeTab === 'signin'
                    ? 'auth-error-signin'
                    : undefined
                }
                className={`auth-input ${
                  activeError && activeTab === 'signin'
                    ? 'auth-input--error'
                    : ''
                }`}
                value={emailSignin}
                onChange={(e) => {
                  setEmailSignin(e.target.value);
                  if (clientError) setClientError(null);
                }}
              />
              {activeError && activeTab === 'signin' && (
                <p id="auth-error-signin" className="auth-error" role="alert">
                  {activeError}
                </p>
              )}
            </div>
            <button type="submit" className="auth-submit-btn">
              Continue
            </button>
          </Form>
        </div>

        <div
          role="tabpanel"
          id="auth-panel-register"
          aria-labelledby="auth-tab-register"
          tabIndex={0}
          hidden={activeTab !== 'register'}
          className={`auth-panel ${
            activeTab === 'register' ? 'auth-panel--active' : ''
          }`}
        >
          <p className="auth-desc">
            {"New here? Enter your email and we'll create your account. No password needed."}
          </p>
          <Form
            method="POST"
            action={actionUrl}
            className="auth-form"
            onSubmit={handleFormSubmit}
            noValidate
          >
            <input type="hidden" name="tab" value="register" />
            {safeRedirect && (
              <input type="hidden" name="redirect" value={safeRedirect} />
            )}
            <div className="auth-field">
              <label htmlFor="auth-email-register" className="auth-label">
                Email
              </label>
              <input
                id="auth-email-register"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                required
                aria-required="true"
                aria-invalid={Boolean(activeError && activeTab === 'register')}
                aria-describedby={
                  activeError && activeTab === 'register'
                    ? 'auth-error-register'
                    : undefined
                }
                className={`auth-input ${
                  activeError && activeTab === 'register'
                    ? 'auth-input--error'
                    : ''
                }`}
                value={emailRegister}
                onChange={(e) => {
                  setEmailRegister(e.target.value);
                  if (clientError) setClientError(null);
                }}
              />
              {activeError && activeTab === 'register' && (
                <p id="auth-error-register" className="auth-error" role="alert">
                  {activeError}
                </p>
              )}
            </div>
            <button type="submit" className="auth-submit-btn">
              Continue
            </button>
          </Form>
        </div>

        <p className="auth-notes">Sign in is handled securely by Shopify.</p>
      </div>
    </div>
  );
}
