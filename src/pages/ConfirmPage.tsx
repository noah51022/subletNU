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

    const verify = async () => {
      let token;
      try {
        const res = await fetch(`/api/generate-signup-token?email=${encodeURIComponent(email)}`);
        const result = await res.json();
        if (!res.ok || !result.token) throw new Error(result.error || "Failed to get token");
        token = result.token;
      } catch (err: any) {
        setStatus("error");
        setMessage(`Failed to generate signup token: ${err.message}`);
        return;
      }
      const { data, error } = await supabase.auth.verifyOtp({ token, type: "signup", email });
      if (error) {
        setStatus("error");
        setMessage(error.message || "Verification failed.");
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
    };
    verify();
  }, [query, navigate]);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email Confirmation</CardTitle>
        </CardHeader>
        <CardContent>
          {status === "loading" && <p>Verifying your email...</p>}
          {status === "success" && (
            <>
              <p className="mb-4 text-green-600">{message}</p>
              <a href="/auth" className="inline-block px-4 py-2 bg-neu-red text-white rounded hover:bg-neu-red/90 transition">Go to Login</a>
            </>
          )}
          {status === "error" && (
            <>
              <p className="mb-4 text-red-600">{message}</p>
              <a href="/auth" className="inline-block px-4 py-2 bg-neu-red text-white rounded hover:bg-neu-red/90 transition">Back to Login</a>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmPage; 