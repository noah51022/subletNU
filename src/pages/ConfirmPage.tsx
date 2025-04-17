import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const ConfirmPage = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const verificationAttemptedRef = useRef(false);

  useEffect(() => {
    if (verificationAttemptedRef.current) {
      return;
    }

    const email = query.get("email") || "";
    const type = query.get("type") || "signup";

    if (!email) {
      setStatus("error");
      setMessage("Missing email from URL.");
      verificationAttemptedRef.current = true;
      return;
    }

    const verify = async () => {
      if (verificationAttemptedRef.current) return;
      verificationAttemptedRef.current = true;

      try {
        setStatus("loading");
        setMessage("Generating verification token...");
        const res = await fetch(`/api/generate-signup-token?email=${encodeURIComponent(email)}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to generate signup token: ${text}`);
        }
        const result = await res.json();
        if (!result.token) {
          throw new Error(result.error || 'Failed to get token from backend');
        }
        const backendToken = result.token;

        setMessage("Verifying email with token...");
        const { data, error } = await supabase.auth.verifyOtp({
          token: backendToken,
          type: type as "signup" | "magiclink",
          email
        });

        if (error) {
          console.error("Verification error:", error);
          setStatus("error");
          setMessage(error.message || "Verification failed.");
          if (error.message.includes('expired')) {
            setTimeout(() => navigate("/auth"), 3000);
          }
        } else {
          if (data?.session) {
            await supabase.auth.setSession(data.session);
            setStatus("success");
            setMessage("Email verified and logged in! Redirecting...");
            setTimeout(() => navigate("/"), 3000);
          } else {
            setStatus("success");
            setMessage("Email verified, but please log in manually.");
            setTimeout(() => navigate("/auth"), 3000);
          }
        }
      } catch (err: any) {
        console.error("Verification error:", err);
        setStatus("error");
        setMessage(err.message.includes('Failed to generate signup token') || err.message.includes('Failed to get token')
          ? err.message
          : `Verification process failed: ${err.message}`);
        if (err.message.includes('User not found')) {
          setTimeout(() => navigate('/auth?mode=signup'), 3000);
        } else {
          setTimeout(() => navigate('/auth'), 3000);
        }
      }
    };

    if (!verificationAttemptedRef.current) {
      verify();
    }
  }, [query, navigate]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email Confirmation</CardTitle>
        </CardHeader>
        <CardContent>
          {status === "loading" && <p>{message || 'Verifying your email...'}</p>}
          {status === "success" && (
            <>
              <p className="mb-4 text-green-600">{message}</p>
              <button onClick={() => navigate('/auth')} className="inline-block px-4 py-2 bg-neu-red text-white rounded hover:bg-neu-red/90 transition">Go to Login</button>
            </>
          )}
          {status === "error" && (
            <>
              <p className="mb-4 text-red-600">{message}</p>
              <button onClick={() => navigate('/auth')} className="inline-block px-4 py-2 bg-neu-red text-white rounded hover:bg-neu-red/90 transition">Back to Login</button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmPage; 