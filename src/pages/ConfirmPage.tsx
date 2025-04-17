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
    let token = query.get("token") || "";
    let type = query.get("type") || "signup";
    let email = query.get("email") || "";
    let redirectTo = query.get("redirectTo") || query.get("redirect_to") || "";

    // Support confirmation_url param (decode and extract from it if present)
    const confirmationUrl = query.get("confirmation_url");
    if (confirmationUrl) {
      try {
        const decodedUrl = decodeURIComponent(confirmationUrl);
        console.log("Decoded confirmationUrl:", decodedUrl);
        const url = new URL(decodedUrl);
        token = url.searchParams.get("token") || token;
        type = url.searchParams.get("type") || type;
        email = url.searchParams.get("email") || email;
        redirectTo = url.searchParams.get("redirectTo") || url.searchParams.get("redirect_to") || redirectTo;
      } catch (e) {
        setStatus("error");
        setMessage("Invalid confirmation URL.");
        console.error("Error parsing confirmationUrl:", e);
        return;
      }
    }

    console.log("Extracted token:", token);
    console.log("Extracted type:", type);
    console.log("Extracted email:", email);
    console.log("Extracted redirectTo:", redirectTo);

    if (!token || !type) {
      setStatus("error");
      setMessage("Missing or invalid token or type.");
      return;
    }

    const verify = async () => {
      // Only include email if type is one of the email-based types
      const emailTypes = ["signup", "email", "recovery", "invite", "email_change"];
      const params: any = {
        token,
        type: type as any,
        ...(redirectTo ? { redirectTo } : {}),
      };
      if (email && emailTypes.includes(type)) {
        params.email = email;
      }
      const { data, error } = await supabase.auth.verifyOtp(params);
      console.log("verifyOtp response:", { data, error });

      if (error) {
        setStatus("error");
        setMessage(error.message || "Verification failed.");
      } else {
        if (data?.session) {
          await supabase.auth.setSession(data.session);
          console.log("Logged in with session:", data.session);
        }
        setStatus("success");
        setMessage("Email verified and logged in! Redirecting...");
        setTimeout(() => navigate("/"), 3000);
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