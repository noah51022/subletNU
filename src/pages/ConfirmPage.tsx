import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

    const confirmEmailOnBackend = async () => {
      try {
        setStatus("loading");
        setMessage("Confirming your email with the server...");
        const res = await fetch(`/api/generate-signup-token?email=${encodeURIComponent(email)}`);

        const result = await res.json();

        if (!res.ok) {
          const errorMessage = result?.error || `Server error: ${res.statusText}`;
          throw new Error(errorMessage);
        }

        setStatus("success");
        setMessage(result?.message || "Email confirmed successfully! Please log in.");
        setTimeout(() => navigate("/auth"), 3000);

      } catch (err: any) {
        console.error("Confirmation error:", err);
        setStatus("error");
        setMessage(err.message || "Email confirmation failed.");
        if (err.message?.includes('User not found')) {
          setTimeout(() => navigate('/auth?mode=signup'), 3000);
        } else {
          setTimeout(() => navigate('/auth'), 3000);
        }
      }
    };
    confirmEmailOnBackend();
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