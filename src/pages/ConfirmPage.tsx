import { useEffect, useState } from "react";
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

  useEffect(() => {
    const email = query.get("email") || "";

    if (!email) {
      setStatus("error");
      setMessage("Missing email from URL.");
      return;
    }

    const confirmEmailAndLogin = async () => {
      let backendMessage = "";
      try {
        setStatus("loading");
        console.log("Status set to: loading");
        setMessage("Confirming your email with the server...");
        console.log("Message set to: Confirming your email with the server...");
        const res = await fetch(`/api/generate-signup-token?email=${encodeURIComponent(email)}`);

        const result = await res.json();
        backendMessage = result?.message || "Processing...";

        if (!res.ok) {
          const errorMessage = result?.error || `Server error: ${res.statusText}`;
          throw new Error(errorMessage);
        }

        if (result.magicLinkToken) {
          setMessage(backendMessage);
          console.log(`Message set to: ${backendMessage}`);
          console.log("Attempting login with magic link token...");

          const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
            token: result.magicLinkToken,
            type: 'magiclink',
            email: email
          });

          if (verifyError) {
            console.error("Magic link verification error:", verifyError);
            throw new Error(verifyError.message || backendMessage || "Magic link login failed.");
          }

          if (verifyData?.session) {
            console.log("Successfully logged in with magic link!");
            setStatus("success");
            console.log("Status set to: success");
            setMessage("Successfully logged in! Redirecting...");
            console.log("Message set to: Successfully logged in! Redirecting...");
            setTimeout(() => navigate("/"), 3000);
          } else {
            console.warn("Magic link verified, but no session returned.");
            throw new Error("Login successful, but no session found. Please try logging in manually.");
          }
        } else {
          console.warn("Backend did not return a magic link token. Redirecting to login.");
          setMessage(backendMessage);
          console.log(`Message set to: ${backendMessage}`);
          setStatus("success");
          console.log("Status set to: success");
          setTimeout(() => navigate("/auth"), 3000);
        }

      } catch (err: any) {
        console.error("Confirmation/Login error:", err);
        setStatus("error");
        console.log("Status set to: error");
        setMessage(err.message || "An unexpected error occurred.");
        console.log(`Message set to: ${err.message || "An unexpected error occurred."}`);
        if (err.message?.includes('User not found')) {
          setTimeout(() => navigate('/auth?mode=signup'), 3000);
        } else {
          setTimeout(() => navigate('/auth'), 3000);
        }
      }
    };
    confirmEmailAndLogin();
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