import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const ConfirmPage = () => {
  const query = useQuery();
  const token = query.get("token") || "";
  const type = query.get("type") || "signup";
  const email = query.get("email") || "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verify = async () => {
      if (!token || !email) {
        setStatus("error");
        setMessage("Missing or invalid token or email.");
        return;
      }
      const { data, error } = await supabase.auth.verifyOtp({
        token,
        type: type as any, // 'signup' or 'email_change', etc.
        email,
      });
      if (error) {
        setStatus("error");
        setMessage(error.message || "Verification failed.");
      } else {
        setStatus("success");
        setMessage("Your email has been verified! You can now log in.");
      }
    };
    verify();
  }, [token, type, email]);

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