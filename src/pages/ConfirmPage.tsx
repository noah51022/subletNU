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
    const token = query.get("token") || "";
    const type = query.get("type") || "signup";

    if (!email) {
      setStatus("error");
      setMessage("Missing email from URL.");
      return;
    }

    if (!token) {
      setStatus("error");
      setMessage("Missing token from URL.");
      return;
    }

    const verify = async () => {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          token,
          type: type as "signup" | "magiclink",
          email
        });

        if (error) {
          console.error("Verification error:", error);
          setStatus("error");
          setMessage(error.message || "Verification failed.");
          // If token expired, we should redirect to login
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
        setMessage(`Verification failed: ${err.message}`);
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