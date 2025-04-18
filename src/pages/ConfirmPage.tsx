import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// Supabase client no longer needed here if not calling verifyOtp
// import { supabase } from "@/integrations/supabase/client"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ConfirmPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status !== 'loading') {
      console.log(`Skipping effect run because status is: ${status}`);
      return;
    }

    const email = query.get("email") || "";

    if (!email) {
      setStatus("error");
      setMessage("Missing email from URL.");
      return;
    }

    const confirmEmailOnBackend = async () => {
      try {
        setStatus("loading");
        console.log("Status set to: loading");
        setMessage("Confirming your email with the server...");
        console.log("Message set to: Confirming your email with the server...");
        const res = await fetch(`/api/generate-signup-token?email=${encodeURIComponent(email)}`);

        const result = await res.json();
        const errorMessage = result?.error || `Server error: ${res.statusText}`;

        if (!res.ok) {
          throw new Error(errorMessage);
        }

        setStatus("success");
        console.log("Status set to: success");
        setMessage(result?.message || "Email confirmed successfully! Please log in.");
        console.log(`Message set to: ${result?.message || "Email confirmed successfully! Please log in."}`);

        console.log("Redirecting to login page...");
        setTimeout(() => navigate("/auth"), 3000);

      } catch (err: any) {
        console.error("Confirmation error:", err);
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

    console.log("Running confirmEmailOnBackend effect...");
    confirmEmailOnBackend();
  }, [query, navigate, status]);

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