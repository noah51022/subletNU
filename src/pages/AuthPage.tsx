
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const { login, register } = useApp();
  const navigate = useNavigate();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.endsWith('@northeastern.edu')) {
      toast({
        title: "Invalid Email",
        description: "You must use a northeastern.edu email address.",
        variant: "destructive",
      });
      return;
    }
    
    if (isLogin) {
      const success = await login(email, password);
      if (success) {
        toast({
          title: "Login Successful",
          description: "Welcome back to SubletNU!",
        });
        navigate('/');
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid email or password.",
          variant: "destructive",
        });
      }
    } else {
      // In a real app, we would send verification code here
      setIsVerifying(true);
      toast({
        title: "Verification Code Sent",
        description: "Please check your email for a verification code.",
      });
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // In a real app, we would verify the code here
    if (verificationCode === "123456") {
      const success = await register(email, password);
      if (success) {
        toast({
          title: "Registration Successful",
          description: "Welcome to SubletNU!",
        });
        navigate('/');
      }
    } else {
      toast({
        title: "Invalid Code",
        description: "Please check your verification code and try again.",
        variant: "destructive",
      });
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
              {isVerifying 
                ? "Verify Your Email" 
                : isLogin 
                  ? "Log In to SubletNU" 
                  : "Sign Up for SubletNU"}
            </CardTitle>
            <CardDescription>
              {isVerifying 
                ? "Enter the 6-digit code sent to your email" 
                : isLogin 
                  ? "Enter your Northeastern email and password" 
                  : "Create a new account with your Northeastern email"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {isVerifying ? (
              <form onSubmit={handleVerificationSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="verificationCode" className="text-sm font-medium">
                    Verification Code (use 123456 for demo)
                  </label>
                  <Input
                    id="verificationCode"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={6}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full bg-neu-red hover:bg-neu-red/90">
                  Verify & Complete Registration
                </Button>
              </form>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                  />
                </div>
                
                <Button type="submit" className="w-full bg-neu-red hover:bg-neu-red/90">
                  {isLogin ? "Log In" : "Continue"}
                </Button>
              </form>
            )}
          </CardContent>
          
          <CardFooter>
            {!isVerifying && (
              <Button
                variant="link"
                className="w-full text-neu-red"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
