import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // CAPTCHA: Commented out for development
  // const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // const turnstileRef = useRef<HTMLDivElement>(null);
  // const widgetIdRef = useRef<string | null>(null);
  const { login, register, currentUser } = useAuth();
  const navigate = useNavigate();

  // CAPTCHA: Commented out for development
  /* 
  // Initialize Turnstile
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 5;

    const initTurnstile = () => {
      if (!mounted || !turnstileRef.current || isLogin) return;

      if (typeof window.turnstile === 'undefined') {
        if (retryCount < maxRetries) {
          console.log(`Waiting for Turnstile to load... (attempt ${retryCount + 1}/${maxRetries})`);
          retryCount++;
          setTimeout(initTurnstile, 1000);
        }
        return;
      }

      console.log("Initializing Turnstile");

      try {
        // Cleanup any existing widget
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }

        // Render new widget
        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
          sitekey: import.meta.env.VITE_CAPTCHA_SITE_KEY,
          callback: function (token: string) {
            console.log("Turnstile verification successful");
            if (mounted) setCaptchaToken(token);
          },
          'error-callback': function () {
            console.error("Turnstile error");
            if (mounted) setCaptchaToken(null);
          },
          'expired-callback': function () {
            console.log("Turnstile expired");
            if (mounted) setCaptchaToken(null);
          },
          theme: 'light',
          appearance: 'always'
        });
      } catch (error) {
        console.error("Error initializing Turnstile:", error);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(initTurnstile, 1000);
        }
      }
    };

    // Start initialization with a small delay
    const timer = setTimeout(initTurnstile, 500);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          console.warn("Error cleaning up Turnstile:", e);
        }
        widgetIdRef.current = null;
      }
    };
  }, [isLogin]);

  // Reset widget when switching modes
  useEffect(() => {
    setCaptchaToken(null);
  }, [isLogin]);
  */

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.endsWith('@northeastern.edu')) {
      toast({
        title: "Invalid Email",
        description: "You must use a northeastern.edu email address.",
        variant: "destructive",
      });
      return;
    }

    // CAPTCHA: Commented out for development
    /*
    // Check for captcha token when signing up
    if (!isLogin && !captchaToken) {
      toast({
        title: "Verification Required",
        description: "Please complete the captcha verification.",
        variant: "destructive",
      });
      return;
    }
    */

    setIsLoading(true);

    try {
      if (isLogin) {
        const success = await login(email, password);
        if (success) {
          navigate('/');
        }
      } else {
        // Pass additional user metadata for first and last name
        const success = await register(email, password, {
          first_name: firstName,
          last_name: lastName,
          // CAPTCHA: Commented out for development
          // captcha_token: captchaToken
        });
        if (success) {
          toast({
            title: "Check Your Email",
            description: "Please check your Northeastern email for a verification link.",
          });
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neu-red">SubletNU</h1>
          <p className="text-gray-600 mt-2">Find and post sublets for Northeastern University</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {isLogin ? "Log In to SubletNU" : "Sign Up for SubletNU"}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? "Enter your Northeastern email and password"
                : "Create a new account with your Northeastern email"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="firstName" className="text-sm font-medium">
                        First Name
                      </label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="Jane"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required={!isLogin}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="lastName" className="text-sm font-medium">
                        Last Name
                      </label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required={!isLogin}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Northeastern Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@northeastern.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                {!isLogin && (
                  <p className="text-xs text-gray-500">
                    Password must be at least 6 characters
                  </p>
                )}
              </div>

              {/* CAPTCHA: Commented out for development */}
              {/* {!isLogin && (
                <div className="flex justify-center">
                  <div ref={turnstileRef} className="cf-turnstile" />
                </div>
              )} */}

              <Button
                type="submit"
                className="w-full bg-neu-red hover:bg-neu-red/90"
                disabled={isLoading /* || (!isLogin && !captchaToken) */}
              >
                {isLoading ? "Processing..." : isLogin ? "Log In" : "Sign Up"}
              </Button>
            </form>
          </CardContent>

          <CardFooter>
            <Button
              variant="link"
              className="w-full text-neu-red"
              onClick={() => setIsLogin(!isLogin)}
              disabled={isLoading}
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

// CAPTCHA: Commented out for development
/*
// Add TypeScript declarations for Turnstile
declare global {
  interface Window {
    turnstile: {
      render: (container: string | HTMLElement, options: any) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string;
    };
  }
}
*/

export default AuthPage;
